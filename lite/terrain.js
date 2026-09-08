'use strict';
// v0.9.0 procedural terrain.
// The 0.8.0 expedition maps enlarged 512px tiles, which read as flat and out of
// scale next to a 91px tall character. Every map is now painted at world size from
// a themed palette, and every upright object is sized in "character heights" so the
// scene keeps a believable proportion. Layout is seeded per (run, map) so it stays
// put while you are in the map, but differs between runs.
const HERO_H=91;
// The world is resized per map now, so every generator reads it live.
function WW(){return world.w}
function WH(){return world.h}
function areaScale(){return WW()*WH()/3110400}
function makeRng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function pick(rand,list){return list[Math.min(list.length-1,Math.floor(rand()*list.length))]}
function shade(hex,amount){const n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,f=v=>Math.max(0,Math.min(255,Math.round(v+amount)));return `rgb(${f(r)},${f(g)},${f(b)})`}

// height is expressed as a multiple of the hero's 91px height.
const terrainThemes={
 sanctum:{ground:['#3b3128','#2a221b'],accent:'#7a5d38',fog:'#120d09',mood:'#c98a3a',
  scatter:[['crack',26],['ashpile',18],['tile',22]],
  objects:[['deadtree',2.6,3],['brazier',1.15,4],['rubble',.55,10],['pillar',3.4,3],['urn',.7,6]]},
 frost:{ground:['#3d4a52','#232d35'],accent:'#8fb6c9',fog:'#0d1418',mood:'#9fd4e8',
  scatter:[['snowdrift',24],['crack',14],['frostring',16]],
  objects:[['icespire',2.8,5],['gravestone',.95,8],['deadtree',2.9,3],['rock',.8,8]]},
 bell:{ground:['#463a52','#241e2e'],accent:'#b49ae0',fog:'#140f1c',mood:'#c1a4ef',
  scatter:[['tile',30],['runering',12],['crack',14]],
  objects:[['pillar',3.6,5],['bellstand',2.1,3],['brazier',1.15,5],['rubble',.5,8]]},
 graveyard:{ground:['#33372c','#1d2019'],accent:'#8b9377',fog:'#0f120d',mood:'#a9c07f',
  scatter:[['grass',44],['mound',20],['crack',10]],
  objects:[['gravestone',1,16],['deadtree',3.1,5],['fence',.85,10],['crypt',2.2,2],['lantern',1.35,4]]},
 forest:{ground:['#2f4030','#1a241b'],accent:'#6f9257',fog:'#0c130d',mood:'#8ec46a',
  scatter:[['grass',70],['fern',32],['root',18]],
  objects:[['tree',4.2,14],['bush',.75,16],['rock',.85,7],['stump',.6,6],['mushroom',.42,12]]},
 fae:{ground:['#2c3b4d','#1a2330'],accent:'#8fd8d0',fog:'#0b1219',mood:'#a8f0e0',
  scatter:[['glowmoss',40],['ripple',18],['petal',34]],
  objects:[['crystal',2.3,10],['glowtree',3.8,7],['mushroom',.9,14],['archstone',2.6,3],['lantern',1.2,6]]},
 mire:{ground:['#38402b','#1e2318'],accent:'#7d8a4c',fog:'#0e1109',mood:'#b2c065',
  scatter:[['puddle',26],['grass',36],['root',22]],
  objects:[['deadtree',3.3,9],['stump',.65,10],['reed',1.1,16],['rock',.7,6],['bogpost',1.6,5]]},
 foundry:{ground:['#41352d','#241d18'],accent:'#b07a44',fog:'#120c08',mood:'#e59a4a',
  scatter:[['plate',26],['spill',16],['crack',18]],
  objects:[['pipe',1.9,9],['crate',.8,10],['furnace',2.8,3],['barrel',.85,9],['brazier',1.1,5]]},
 city:{ground:['#4a4238','#292420'],accent:'#c0a878',fog:'#131009',mood:'#e0b878',
  scatter:[['cobble',40],['spill',12],['crack',14]],
  objects:[['stall',1.5,8],['crate',.8,12],['barrel',.85,8],['banner',2.9,6],['lantern',1.3,7],['fence',.9,8]]},
 ship:{ground:['#2f3a44','#1a2128'],accent:'#7fa8c4',fog:'#0a1015',mood:'#8fd0f0',
  scatter:[['plate',44],['grate',20],['spill',10]],
  objects:[['console',1.25,10],['pipe',2.1,8],['crate',.8,10],['pod',1.7,6],['antenna',3.2,4]]},
 inferno:{ground:['#4a2a20','#241110'],accent:'#d4682f',fog:'#170805',mood:'#ff9a4a',
  scatter:[['lava',24],['crack',30],['ashpile',18]],
  objects:[['stalagmite',2.4,12],['furnace',2.7,3],['rubble',.6,12],['brazier',1.2,5]]},
 abyss:{ground:['#2a2740','#151327'],accent:'#8a7ad0',fog:'#0a0812',mood:'#b8a4ff',
  scatter:[['runering',22],['crack',20],['glowmoss',18]],
  objects:[['archstone',3,6],['crystal',2.5,10],['pillar',3.5,4],['rubble',.5,10]]}
};

// --- authored prop art ---------------------------------------------------------
// Generated 4x3 sheets on a black backdrop; makeGaitFrames keys the black away,
// bottom-aligns each cell and records a trim box, which is exactly what
// drawMotionTile expects. Frame indices below follow each sheet's actual layout.
const propSheetNames=['forest','graveyard','fae','city','foundry','ship','inferno','abyss'];
const propSheetArt={},propSheetFrames={};
const themeSheet={forest:'forest',graveyard:'graveyard',fae:'fae',city:'city',foundry:'foundry',ship:'ship',inferno:'inferno',abyss:'abyss',sanctum:'graveyard',frost:'graveyard',bell:'abyss',mire:'forest'};
const themeFrames={
 forest:{tree:[0,1,2],deadtree:[3],stump:[4],bush:[5,6],mushroom:[7,8],rock:[9,10],reed:[11],bogpost:[3],rubble:[10],lantern:[7]},
 graveyard:{gravestone:[0,1,2,3,10],crypt:[4],fence:[5,6],deadtree:[7],lantern:[8],rubble:[9],rock:[9],urn:[11],pillar:[0,3],brazier:[8],icespire:[3]},
 fae:{crystal:[0,4,8],glowtree:[1,5],mushroom:[2,6],archstone:[3,7],lantern:[9],rock:[10],bush:[11],pillar:[3,7]},
 city:{stall:[0,4],lantern:[1],crate:[2,7],banner:[3,11],fence:[5],barrel:[6,9],rock:[8],rubble:[10]},
 foundry:{pipe:[0,1,2],furnace:[3],barrel:[4,5],crate:[6],brazier:[3],rock:[10],rubble:[10],bogpost:[9]},
 ship:{console:[0,1,10],pod:[2,3,4],pipe:[5,6],crate:[7,8],antenna:[9,11]},
 inferno:{stalagmite:[0,1,10,11],furnace:[2],brazier:[3],deadtree:[4],rubble:[6,7,9],rock:[6,7]},
 abyss:{archstone:[0,2,5,8],crystal:[1,9],pillar:[10],rubble:[6,11],icespire:[1,9]}
};
function propFrameFor(themeName,kind,rand){
 const sheet=themeSheet[themeName];if(!sheet)return null;
 const list=themeFrames[sheet]&&themeFrames[sheet][kind];if(!list||!list.length)return null;
 return {sheet,frame:list[Math.floor(rand()*list.length)%list.length]};
}
function propTile(o){const set=propSheetFrames[o.sheet];return set&&set.length===12?set[o.frame]:null}
function initTerrainArt(){
 for(const name of propSheetNames){
  const img=new Image();propSheetArt[name]=img;propSheetFrames[name]=[];
  img.onload=()=>{makeGaitFrames(img,4,3,propSheetFrames[name]);loaded()};
  img.onerror=loadError;
 }
 propSheetArt.forest.src='props-forest.png';propSheetArt.graveyard.src='props-graveyard.png';
 propSheetArt.fae.src='props-fae.png';propSheetArt.city.src='props-city.png';
 propSheetArt.foundry.src='props-foundry.png';propSheetArt.ship.src='props-ship.png';
 propSheetArt.inferno.src='props-inferno.png';propSheetArt.abyss.src='props-abyss.png';
}
const terrainCache=new Map();
function terrainKey(id){return id+':'+(runSeed>>>0)+':'+world.w+'x'+world.h}
function terrainFor(id){
 const key=terrainKey(id),hit=terrainCache.get(key);if(hit)return hit;
 const built=buildTerrain(id);if(terrainCache.size>6)terrainCache.clear();
 terrainCache.set(key,built);return built;
}
// The authored painting stays the base layer — it carries detail no generator can
// match. The procedural pass adds per-run ground detail on top and, for act four,
// a colour grade that turns a known place into its corrupted echo.
function baseArt(id){const art=mapSpec(id).art??id;return art<3?[bg,frostFloor,bellFloor][art]:(newFloors[art-3]||expeditionFloors[art-3]||bg)}
// The world is far too large to hold as one bitmap, so the ground is a small set
// of painted tiles laid out from the run seed, with flips and per-cell tinting so
// the repeat is not obvious. Only the tiles the camera can see are drawn.
const TILE_W=1600,TILE_H=1080,TILE_VARIANTS=6;
function buildTile(spec,theme,rand,variant,bands){
 const c=document.createElement('canvas');c.width=TILE_W;c.height=TILE_H;const g=c.getContext('2d');
 const base=baseArt(spec.id),bw=base&&(base.naturalWidth||base.width);
 // The ground is always a plain painted floor first. The scene art on top is
 // texture, not content: at full strength its walls, stairs and altars read as
 // real objects, and because each tile crops a different part of the painting
 // they ended up sliced in half at every tile edge (PT-02).
 paintTileGround(g,theme,rand);
 if(bw){
  const sw=(base.naturalWidth||base.width),sh=(base.naturalHeight||base.height);
  // Keep the entire source rectangle within the lower 58% of the painting.
  // Choosing height against the full image previously overran its bottom.
  const sy0=sh*.42,available=sh-sy0;
  const cw=sw*(.62+rand()*.3),ch=available*(.75+rand()*.25);
  const sy=sy0+rand()*(available-ch);
  // 0.55 measured the same tile-to-tile brightness spread as 0.34 (3.7 vs 3.6 of
  // 255) while keeping far more of the painted texture, so it is not the blend
  // strength that makes tiles read as patches.
  g.save();g.globalAlpha=.55;
  g.drawImage(base,rand()*(sw-cw),sy,cw,ch,0,0,TILE_W,TILE_H);
  g.restore();
 }
 if(spec.grade){
  g.globalCompositeOperation='multiply';g.globalAlpha=.66;g.fillStyle=spec.grade;g.fillRect(0,0,TILE_W,TILE_H);
  g.globalCompositeOperation='overlay';g.globalAlpha=.34;g.fillStyle=theme.ground[1];g.fillRect(0,0,TILE_W,TILE_H);
 }else if(bw){
  g.globalCompositeOperation='multiply';g.globalAlpha=.3+rand()*.16;g.fillStyle=theme.ground[1];g.fillRect(0,0,TILE_W,TILE_H);
 }
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
 g.save();g.globalAlpha=bw?.5:1;
 for(const [kind,count] of theme.scatter){
  const n=Math.max(1,Math.round(count*(.7+rand()*.7)*TILE_W*TILE_H/3110400));
  for(let i=0;i<n;i++)paintScatterAt(g,kind,theme,rand,rand()*TILE_W,rand()*TILE_H);
 }
 g.restore();
 sealTileEdges(g,bands);
 return c;
}
function paintTileGround(g,theme,rand){
 const grad=g.createLinearGradient(0,0,TILE_W*.4,TILE_H);
 grad.addColorStop(0,theme.ground[0]);grad.addColorStop(1,theme.ground[1]);
 g.fillStyle=grad;g.fillRect(0,0,TILE_W,TILE_H);
 for(let i=0;i<160;i++){const x=rand()*TILE_W,y=rand()*TILE_H,r=90+rand()*260;
  g.globalAlpha=.05+rand()*.07;g.fillStyle=rand()<.5?theme.ground[0]:theme.ground[1];
  g.beginPath();g.ellipse(x,y,r,r*.62,rand()*3,0,7);g.fill()}
 g.globalAlpha=.05;g.fillStyle=theme.accent;
 for(let i=0;i<1400;i++)g.fillRect(rand()*TILE_W,rand()*TILE_H,1+rand()*2,1+rand());
 g.globalAlpha=1;
}
const EDGE_BAND=210;
function buildEdgeBands(theme,rand){
 // One patch of plain themed ground, mirrored so it reads the same from either
 // side, then feathered to nothing over EDGE_BAND pixels.
 const make=(w,h,vertical)=>{
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
  const half=document.createElement('canvas');
  half.width=vertical?w:Math.ceil(w/2);half.height=vertical?Math.ceil(h/2):h;
  const hg=half.getContext('2d');
  const grad=hg.createLinearGradient(0,0,half.width,half.height);
  grad.addColorStop(0,theme.ground[0]);grad.addColorStop(1,theme.ground[1]);
  hg.fillStyle=grad;hg.fillRect(0,0,half.width,half.height);
  for(let i=0;i<90;i++){const x=rand()*half.width,y=rand()*half.height,r=60+rand()*180;
   hg.globalAlpha=.05+rand()*.07;hg.fillStyle=rand()<.5?theme.ground[0]:theme.ground[1];
   hg.beginPath();hg.ellipse(x,y,r,r*.62,rand()*3,0,7);hg.fill()}
  hg.globalAlpha=.05;hg.fillStyle=theme.accent;
  for(let i=0;i<700;i++)hg.fillRect(rand()*half.width,rand()*half.height,1+rand()*2,1+rand());
  hg.globalAlpha=1;
  g.drawImage(half,0,0);
  g.save();
  if(vertical){g.translate(0,h);g.scale(1,-1)}else{g.translate(w,0);g.scale(-1,1)}
  g.drawImage(half,0,0);g.restore();
  // feather: opaque at the outer edge, gone EDGE_BAND pixels in
  const f=g.createLinearGradient(vertical?w:0,vertical?0:h,0,0);
  g.globalCompositeOperation='destination-in';
  f.addColorStop(0,'rgba(0,0,0,0)');f.addColorStop(1,'rgba(0,0,0,1)');
  g.fillStyle=f;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
  return c;
 };
 // horizontal band sits along the top/bottom; vertical band along left/right
 return {h:make(TILE_W,EDGE_BAND,false),v:make(EDGE_BAND,TILE_H,true)};
}
function sealTileEdges(g,bands){
 if(!bands)return;
 g.save();
 g.drawImage(bands.h,0,0);                                        // top
 g.translate(0,TILE_H);g.scale(1,-1);g.drawImage(bands.h,0,0);    // bottom
 g.restore();g.save();
 g.drawImage(bands.v,0,0);                                        // left
 g.translate(TILE_W,0);g.scale(-1,1);g.drawImage(bands.v,0,0);    // right
 g.restore();
}
function buildTerrain(id){
 const spec={...mapSpec(id),id},theme=terrainThemes[spec.theme]||terrainThemes.sanctum;
 const rand=makeRng((runSeed>>>0)^((id+1)*2654435761));
 const bands=buildEdgeBands(theme,rand);
 const tiles=[];for(let v=0;v<TILE_VARIANTS;v++)tiles.push(buildTile(spec,theme,rand,v,bands));
 const cols=Math.ceil(WW()/TILE_W),rows=Math.ceil(WH()/TILE_H),layout=[];
 // fy is gone: a vertical flip stands the architecture in the source art on its
 // head. Horizontal flip is safe because the shared edge band is symmetric.
 for(let i=0;i<cols*rows;i++)layout.push({v:Math.floor(rand()*TILE_VARIANTS),fx:rand()<.5,fy:false});
 return {tiles,layout,cols,rows,theme,objects:buildObjects(theme,rand,spec.theme)};
}
// Draw only the tiles the camera overlaps.
function drawTerrainBackground(camX,camY,visW,visH){
 const t=terrainFor(routeStage);if(!t.tiles)return;
 const c0=Math.max(0,Math.floor(camX/TILE_W)),c1=Math.min(t.cols-1,Math.floor((camX+visW)/TILE_W));
 const r0=Math.max(0,Math.floor(camY/TILE_H)),r1=Math.min(t.rows-1,Math.floor((camY+visH)/TILE_H));
 for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){
  const cell=t.layout[r*t.cols+c];if(!cell)continue;
  const img=t.tiles[cell.v];if(!img)continue;
  ctx.save();
  ctx.translate(c*TILE_W+(cell.fx?TILE_W:0),r*TILE_H+(cell.fy?TILE_H:0));
  ctx.scale(cell.fx?-1:1,cell.fy?-1:1);
  ctx.drawImage(img,0,0,TILE_W,TILE_H);
  ctx.restore();
 }
}
function paintGround(g,theme,rand){
 const grad=g.createLinearGradient(0,0,WW()*.4,WH());
 grad.addColorStop(0,theme.ground[0]);grad.addColorStop(1,theme.ground[1]);
 g.fillStyle=grad;g.fillRect(0,0,WW(),WH());
 // low-frequency blotches keep large areas from reading as a flat colour field
 for(let i=0,n=Math.round(220*areaScale());i<n;i++){const x=rand()*WW(),y=rand()*WH(),r=90+rand()*260;
  g.globalAlpha=.05+rand()*.07;g.fillStyle=rand()<.5?theme.ground[0]:theme.ground[1];
  g.beginPath();g.ellipse(x,y,r,r*.62,rand()*3,0,7);g.fill()}
 // fine grain
 g.globalAlpha=.05;g.fillStyle=theme.accent;
 for(let i=0,n=Math.round(2600*areaScale());i<n;i++){const x=rand()*WW(),y=rand()*WH();g.fillRect(x,y,1+rand()*2,1+rand())}
 g.globalAlpha=1;
}
function paintScatter(g,kind,theme,rand){paintScatterAt(g,kind,theme,rand,rand()*WW(),rand()*WH())}
function paintScatterAt(g,kind,theme,rand,x,y){
 const s=HERO_H;
 g.save();g.translate(x,y);
 if(kind==='grass'){g.strokeStyle=shade(theme.accent,-10);g.globalAlpha=.5;g.lineWidth=2;
  for(let i=0;i<5+rand()*5;i++){const a=-Math.PI/2+rand()*.9-.45,l=s*(.09+rand()*.09),ox=(rand()-.5)*s*.35;
   g.beginPath();g.moveTo(ox,0);g.quadraticCurveTo(ox+Math.cos(a)*l*.4,-l*.6,ox+Math.cos(a)*l,-l);g.stroke()}}
 else if(kind==='fern'){g.fillStyle=shade(theme.accent,-30);g.globalAlpha=.45;
  for(let i=0;i<4;i++){const a=-Math.PI/2+(i-1.5)*.35,l=s*(.14+rand()*.1);
   g.beginPath();g.ellipse(Math.cos(a)*l*.5,Math.sin(a)*l*.5,l*.42,l*.12,a,0,7);g.fill()}}
 else if(kind==='mound'){g.fillStyle=shade(theme.ground[1],14);g.globalAlpha=.55;
  g.beginPath();g.ellipse(0,0,s*(.5+rand()*.5),s*(.16+rand()*.14),0,0,7);g.fill()}
 else if(kind==='crack'){g.strokeStyle=shade(theme.ground[1],-16);g.globalAlpha=.55;g.lineWidth=1+rand()*2;
  g.beginPath();g.moveTo(0,0);let px=0,py=0;for(let i=0;i<5;i++){px+=(rand()-.5)*s*.9;py+=(rand()-.5)*s*.5;g.lineTo(px,py)}g.stroke()}
 else if(kind==='tile'){g.strokeStyle=shade(theme.accent,-40);g.globalAlpha=.28;g.lineWidth=2;
  const w=s*(.7+rand()*.6),h=w*.62;g.strokeRect(-w/2,-h/2,w,h)}
 else if(kind==='cobble'){g.globalAlpha=.3;
  for(let i=0;i<7;i++){g.fillStyle=shade(theme.ground[0],(rand()-.5)*36);g.beginPath();g.ellipse((rand()-.5)*s,(rand()-.5)*s*.6,s*.09,s*.06,rand()*3,0,7);g.fill()}}
 else if(kind==='plate'){g.strokeStyle=shade(theme.accent,-46);g.globalAlpha=.3;g.lineWidth=2;
  const w=s*(1+rand()*1.4);g.strokeRect(-w/2,-w*.3,w,w*.6);
  g.globalAlpha=.12;g.fillStyle=theme.accent;g.fillRect(-w/2,-w*.3,w,w*.6)}
 else if(kind==='grate'){g.strokeStyle=shade(theme.accent,-30);g.globalAlpha=.3;g.lineWidth=1.5;
  const w=s*.8;for(let i=0;i<6;i++){g.beginPath();g.moveTo(-w/2,-w*.25+i*w*.1);g.lineTo(w/2,-w*.25+i*w*.1);g.stroke()}}
 else if(kind==='puddle'||kind==='lava'||kind==='spill'){
  const col=kind==='lava'?'#ff7a2a':kind==='spill'?shade(theme.accent,-20):'#4d6a5a';
  g.globalAlpha=kind==='lava'?.28:.3;g.fillStyle=col;
  g.beginPath();g.ellipse(0,0,s*(kind==='lava'?.18+rand()*.24:.35+rand()*.55),s*(kind==='lava'?.07+rand()*.09:.14+rand()*.22),rand()*3,0,7);g.fill();
  if(kind==='lava'){g.globalAlpha=.2;g.fillStyle='#ffd08a';g.beginPath();g.ellipse(0,0,s*.1,s*.04,0,0,7);g.fill()}}
 else if(kind==='snowdrift'){g.globalAlpha=.4;g.fillStyle='#dfeaf2';
  g.beginPath();g.ellipse(0,0,s*(.45+rand()*.7),s*(.13+rand()*.16),rand()*3,0,7);g.fill()}
 else if(kind==='frostring'||kind==='runering'){g.strokeStyle=kind==='frostring'?'#bfe6f5':theme.mood;g.globalAlpha=.22;g.lineWidth=2;
  const r=s*(.3+rand()*.6);g.beginPath();g.ellipse(0,0,r,r*.58,0,0,7);g.stroke();
  if(kind==='runering'){g.beginPath();g.ellipse(0,0,r*.66,r*.38,0,0,7);g.stroke()}}
 else if(kind==='glowmoss'){g.globalAlpha=.3;g.fillStyle=theme.mood;
  for(let i=0;i<6;i++){g.beginPath();g.arc((rand()-.5)*s*.7,(rand()-.5)*s*.4,s*(.02+rand()*.03),0,7);g.fill()}}
 else if(kind==='petal'){g.globalAlpha=.35;g.fillStyle=theme.mood;
  for(let i=0;i<4;i++){g.beginPath();g.ellipse((rand()-.5)*s*.8,(rand()-.5)*s*.5,s*.035,s*.016,rand()*3,0,7);g.fill()}}
 else if(kind==='ripple'){g.strokeStyle=theme.mood;g.globalAlpha=.16;g.lineWidth=1.5;
  for(let i=1;i<4;i++){g.beginPath();g.ellipse(0,0,s*.16*i,s*.09*i,0,0,7);g.stroke()}}
 else if(kind==='root'){g.strokeStyle=shade(theme.ground[1],-10);g.globalAlpha=.5;g.lineWidth=3+rand()*3;
  g.beginPath();g.moveTo(-s*.5,0);g.quadraticCurveTo(0,(rand()-.5)*s*.4,s*.5,0);g.stroke()}
 else if(kind==='ashpile'){g.globalAlpha=.35;g.fillStyle='#5d5147';
  g.beginPath();g.ellipse(0,0,s*(.2+rand()*.3),s*(.08+rand()*.1),0,0,7);g.fill()}
 g.restore();g.globalAlpha=1;
}
function paintEdges(g,theme,rand){
 // A darker rim reads as the map boundary without pretending to be a wall render.
 const grad=g.createRadialGradient(WW()/2,WH()/2,WH()*.34,WW()/2,WH()/2,WW()*.62);
 grad.addColorStop(0,'#00000000');grad.addColorStop(1,theme.fog+'ee');g.fillStyle=grad;g.fillRect(0,0,WW(),WH());
}
// Playable rectangle matches confine() for expedition maps.
function insidePlay(x,y){return x>150&&x<world.w-150&&y>170&&y<world.h-170}
function buildObjects(theme,rand,themeName){
 const out=[],spawnSafe={x:WW()*.5,y:WH()-190};
 for(const [kind,heights,count] of theme.objects){
  const n=Math.min(150,Math.max(1,Math.round(count*(.65+rand()*.8)*areaScale())));
  for(let i=0;i<n;i++){
   const x=170+rand()*(WW()-340),y=200+rand()*(WH()-390);
   if(!insidePlay(x,y))continue;
   if(Math.hypot(x-spawnSafe.x,y-spawnSafe.y)<250)continue;
   if(Math.hypot(x-WW()*.5,y-190)<240)continue; // keep the boss arrival clear
   const h=HERO_H*heights*(.78+rand()*.5),blocking=h>HERO_H*.62;
   if(out.some(o=>Math.hypot(o.x-x,(o.y-y)*1.6)<(o.h+h)*.28))continue;
   const art=propFrameFor(themeName,kind,rand);
   out.push({kind,x,y,h,r:blocking?Math.max(11,h*.12):0,hp:kind==='crate'||kind==='barrel'||kind==='urn'||kind==='rubble'?38+Math.round(rand()*30):0,broken:false,seed:rand(),terrain:true,mood:theme.mood,accent:theme.accent,sheet:art&&art.sheet,frame:art&&art.frame});
  }
 }
 return out;
}
function applyTerrainProps(id){const t=terrainFor(id);props.length=0;for(const o of t.objects)props.push({...o});buildPropGrid()}
// Collision used to walk every prop on the map. With hundreds of them across a
// world this size that is thousands of checks per frame, so they live in a grid.
const PROP_CELL=320;
let propGrid=new Map(),propGridCols=1;
function buildPropGrid(){
 propGrid=new Map();propGridCols=Math.max(1,Math.ceil(world.w/PROP_CELL));
 for(const o of props){
  if(o.r===0)continue;
  const key=Math.floor(o.y/PROP_CELL)*propGridCols+Math.floor(o.x/PROP_CELL);
  let list=propGrid.get(key);if(!list){list=[];propGrid.set(key,list)}list.push(o);
 }
}
function propsNear(x,y){
 if(!propGrid.size)return props;
 const cx=Math.floor(x/PROP_CELL),cy=Math.floor(y/PROP_CELL),out=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const list=propGrid.get((cy+dy)*propGridCols+(cx+dx));if(list)out.push(...list);
 }
 return out;
}
// The sanctuary maps keep their authored props; a light procedural dressing on top
// means those three still differ between runs without losing the original art.
function addTerrainDressing(id){
 const finish=()=>buildPropGrid();
 const theme=terrainThemes[mapSpec(id).theme]||terrainThemes.sanctum,rand=makeRng(((runSeed>>>0)^((id+91)*40503))>>>0);
 for(const [kind,heights] of theme.objects.slice(0,3)){
  const n=Math.max(2,Math.round((2+Math.floor(rand()*3))*areaScale()));
  for(let i=0;i<n;i++){
   const x=320+rand()*(WW()-640),y=420+rand()*(WH()-620),h=HERO_H*heights*(.8+rand()*.4);
   if(Math.hypot(x-WW()*.5,y-WH()+190)<280)continue;
   if(props.some(o=>Math.hypot(o.x-x,(o.y-y)*1.6)<150))continue;
   const art=propFrameFor(mapSpec(id).theme,kind,rand);
   props.push({kind,x,y,h,r:h>HERO_H*.62?Math.max(11,h*.12):0,hp:0,broken:false,seed:rand(),terrain:true,mood:theme.mood,accent:theme.accent,sheet:art&&art.sheet,frame:art&&art.frame});
  }
 }
 finish();
}

// --- object painters ---------------------------------------------------------
// Everything is drawn relative to o.h so scale stays tied to the hero's height.
function vgrad(c,top,bottom,h,lift=1){const g=c.createLinearGradient(0,-h*lift,0,0);g.addColorStop(0,top);g.addColorStop(1,bottom);return g}
function drawTerrainProp(o){
 const h=o.h,w=h*.6,t=time*.6+o.seed*10;
 ctx.save();
 if(o.broken){ctx.globalAlpha=.55;ctx.translate(o.x,o.y);ctx.rotate(.5);ctx.fillStyle='#00000055';ctx.beginPath();ctx.ellipse(0,0,w*.4,h*.06,0,0,7);ctx.fill();ctx.fillStyle=shade(o.accent,-50);ctx.fillRect(-w*.28,-h*.16,w*.56,h*.16);ctx.restore();return}
 ctx.fillStyle='#00000066';ctx.beginPath();ctx.ellipse(o.x,o.y,w*.46,h*.062,0,0,7);ctx.fill();
 ctx.fillStyle='#00000030';ctx.beginPath();ctx.ellipse(o.x,o.y,w*.7,h*.1,0,0,7);ctx.fill();
 ctx.translate(o.x,o.y);
 const tile=propTile(o);
 if(tile){
  ctx.filter='saturate(1.05) brightness(1.22) contrast(1.05)';
  if(o.kind==='reed'||o.kind==='banner')ctx.rotate(Math.sin(t*1.4)*.02);
  drawMotionTile(ctx,tile,0,0,h);
  ctx.filter='none';
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.1;drawMotionTile(ctx,tile,-h*.012,-h*.012,h);ctx.restore();
  if(o.kind==='brazier'||o.kind==='lantern'||o.kind==='furnace')glow(ctx,0,-h*.7,h*.5,o.kind==='lantern'?'#ffd9a0':'#ff9b3c',.22+Math.sin(time*7+o.seed*20)*.06);
  else if(o.kind==='crystal'||o.kind==='glowtree'||o.kind==='mushroom'||o.kind==='pod'||o.kind==='console')glow(ctx,0,-h*.6,h*.45,o.mood,.16);
  ctx.restore();return;
 }
 // painted grounds are dark and desaturated; match them or the props read as toys
 ctx.filter='saturate(.62) brightness(.78) contrast(1.12)';
 const sway=Math.sin(t)*.012;
 switch(o.kind){
  case 'tree': case 'glowtree': {
   ctx.rotate(sway);
   ctx.fillStyle=vgrad(ctx,o.kind==='glowtree'?'#4d5c78':'#4b3d2f',o.kind==='glowtree'?'#232b3a':'#251d15',h,.6);
   ctx.beginPath();ctx.moveTo(-w*.09,0);ctx.lineTo(-w*.05,-h*.55);ctx.lineTo(w*.05,-h*.55);ctx.lineTo(w*.09,0);ctx.closePath();ctx.fill();
   const leaf=o.kind==='glowtree'?o.mood:'#4a6b3c';
   const wob=(k)=>Math.sin(o.seed*40+k*2.7);
   ctx.globalAlpha=.5;ctx.fillStyle='#12180f';ctx.beginPath();ctx.ellipse(0,-h*.58,w*.5,h*.1,0,0,7);ctx.fill();
   for(let i=0;i<6;i++){ctx.globalAlpha=.95-i*.06;ctx.fillStyle=vgrad(ctx,shade(leaf,20+wob(i)*14),shade(leaf,i%2?-52:-34),h,1.05);
    const ox=wob(i)*w*.3,oy=-h*(.6+i*.075+wob(i+3)*.03),rx=w*(.42-i*.045)*(.8+Math.abs(wob(i+1))*.5),ry=h*(.15-i*.014)*(.85+Math.abs(wob(i+2))*.4);
    ctx.beginPath();ctx.ellipse(ox,oy,rx,ry,wob(i+4)*.3,0,7);ctx.fill()}
   if(o.kind==='glowtree'){ctx.globalAlpha=.5;glow(ctx,0,-h*.72,w*.6,o.mood,.28)}
   break}
  case 'deadtree': {
   ctx.rotate(sway*1.4);ctx.strokeStyle='#4a3d31';ctx.lineCap='round';
   ctx.lineWidth=Math.max(3,w*.1);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w*.04,-h*.62);ctx.stroke();
   ctx.lineWidth=Math.max(2,w*.05);
   for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.55,l=h*(.2+((i*37)%11)/30);
    ctx.beginPath();ctx.moveTo(w*.03,-h*(.4+i*.05));ctx.lineTo(w*.03+Math.cos(a)*l,-h*(.4+i*.05)+Math.sin(a)*l*.8);ctx.stroke()}
   break}
  case 'stump': {ctx.fillStyle=vgrad(ctx,'#5c4936','#31261c',h,1.02);ctx.beginPath();ctx.ellipse(0,-h*.5,w*.42,h*.5,0,0,7);ctx.fill();ctx.fillStyle='#66513c';ctx.beginPath();ctx.ellipse(0,-h,w*.42,h*.16,0,0,7);ctx.fill();break}
  case 'bush': {ctx.fillStyle=vgrad(ctx,'#54763f','#26361f',h,1.1);for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse((i-1.5)*w*.18,-h*(.4+(i%2)*.2),w*.3,h*.36,0,0,7);ctx.fill()}break}
  case 'reed': {ctx.strokeStyle='#7d8a4c';ctx.lineWidth=2;for(let i=0;i<7;i++){const ox=(i-3)*w*.1;ctx.beginPath();ctx.moveTo(ox,0);ctx.quadraticCurveTo(ox+Math.sin(t+i)*w*.16,-h*.6,ox+Math.sin(t+i)*w*.3,-h);ctx.stroke()}break}
  case 'mushroom': {ctx.fillStyle=vgrad(ctx,'#e6dcc6','#a2977f',h,.7);ctx.fillRect(-w*.08,-h*.62,w*.16,h*.62);
   ctx.fillStyle=vgrad(ctx,shade(o.mood,30),shade(o.mood,-40),h,1);ctx.beginPath();ctx.ellipse(0,-h*.62,w*.42,h*.3,0,Math.PI,0);ctx.fill();
   glow(ctx,0,-h*.6,w*.7,o.mood,.2);break}
  case 'gravestone': {ctx.fillStyle=vgrad(ctx,'#9aa091','#565a4f',h,1.05);ctx.beginPath();ctx.moveTo(-w*.34,0);ctx.lineTo(-w*.34,-h*.72);ctx.quadraticCurveTo(0,-h*1.02,w*.34,-h*.72);ctx.lineTo(w*.34,0);ctx.closePath();ctx.fill();
   ctx.fillStyle='#5b5f55';ctx.fillRect(-w*.2,-h*.55,w*.4,h*.05);ctx.fillRect(-w*.14,-h*.42,w*.28,h*.04);break}
  case 'crypt': {ctx.fillStyle=vgrad(ctx,'#868b7c','#494d43',h,1.05);ctx.fillRect(-w*.6,-h*.7,w*1.2,h*.7);
   ctx.fillStyle='#565a50';ctx.beginPath();ctx.moveTo(-w*.7,-h*.7);ctx.lineTo(0,-h);ctx.lineTo(w*.7,-h*.7);ctx.closePath();ctx.fill();
   ctx.fillStyle='#22251f';ctx.fillRect(-w*.16,-h*.44,w*.32,h*.44);break}
  case 'fence': {ctx.strokeStyle='#5b4a38';ctx.lineWidth=Math.max(2,w*.07);
   for(let i=0;i<3;i++){const ox=(i-1)*w*.34;ctx.beginPath();ctx.moveTo(ox,0);ctx.lineTo(ox,-h);ctx.stroke()}
   ctx.beginPath();ctx.moveTo(-w*.4,-h*.65);ctx.lineTo(w*.4,-h*.62);ctx.stroke();break}
  case 'rock': {ctx.fillStyle=vgrad(ctx,'#867f72','#4a453d',h,1.05);ctx.beginPath();ctx.moveTo(-w*.44,0);ctx.lineTo(-w*.3,-h*.72);ctx.lineTo(w*.1,-h);ctx.lineTo(w*.44,-h*.5);ctx.lineTo(w*.34,0);ctx.closePath();ctx.fill();
   ctx.fillStyle='#847d70';ctx.beginPath();ctx.moveTo(-w*.3,-h*.72);ctx.lineTo(w*.1,-h);ctx.lineTo(w*.05,-h*.55);ctx.closePath();ctx.fill();break}
  case 'rubble': {ctx.fillStyle='#6a6155';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse((i-1.5)*w*.22,-h*.2*(i%2?1:.6),w*.18,h*.24,0,0,7);ctx.fill()}break}
  case 'icespire': case 'stalagmite': case 'crystal': {
   const col=o.kind==='icespire'?'#a9dcef':o.kind==='stalagmite'?'#7c4a3a':o.mood;
   ctx.fillStyle=vgrad(ctx,shade(col,34),shade(col,-40),h,1.05);ctx.globalAlpha=o.kind==='crystal'?.85:1;
   ctx.beginPath();ctx.moveTo(-w*.28,0);ctx.lineTo(-w*.1,-h);ctx.lineTo(w*.12,-h*.92);ctx.lineTo(w*.3,0);ctx.closePath();ctx.fill();
   ctx.globalAlpha=.5;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(-w*.1,-h);ctx.lineTo(w*.02,-h*.5);ctx.lineTo(-w*.14,-h*.5);ctx.closePath();ctx.fill();
   if(o.kind!=='stalagmite')glow(ctx,0,-h*.6,w,col,.2);break}
  case 'pillar': case 'archstone': {
   ctx.fillStyle=vgrad(ctx,'#8e8474','#4f4940',h,1.02);ctx.fillRect(-w*.24,-h,w*.48,h);
   ctx.fillStyle=vgrad(ctx,'#a89c88','#635a4c',h,1.02);ctx.fillRect(-w*.32,-h,w*.16,h);
   ctx.fillStyle='#5f5749';ctx.fillRect(-w*.36,-h*1.06,w*.72,h*.08);ctx.fillRect(-w*.36,-h*.05,w*.72,h*.06);
   if(o.kind==='archstone'){ctx.strokeStyle=o.mood;ctx.globalAlpha=.5;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-h*.55,w*.4,Math.PI,0);ctx.stroke()}
   break}
  case 'bellstand': {ctx.strokeStyle='#6b5a3e';ctx.lineWidth=Math.max(3,w*.09);
   ctx.beginPath();ctx.moveTo(-w*.4,0);ctx.lineTo(-w*.2,-h*.9);ctx.moveTo(w*.4,0);ctx.lineTo(w*.2,-h*.9);ctx.moveTo(-w*.24,-h*.88);ctx.lineTo(w*.24,-h*.88);ctx.stroke();
   ctx.fillStyle='#b98d45';ctx.beginPath();ctx.moveTo(-w*.2,-h*.42);ctx.quadraticCurveTo(0,-h*.86,w*.2,-h*.42);ctx.closePath();ctx.fill();break}
  case 'brazier': case 'lantern': {
   ctx.fillStyle='#4d4237';ctx.fillRect(-w*.09,-h*.72,w*.18,h*.72);
   ctx.fillStyle='#6b5b45';ctx.beginPath();ctx.ellipse(0,-h*.74,w*.26,h*.1,0,0,7);ctx.fill();
   const flick=.6+Math.sin(time*7+o.seed*20)*.2;
   glow(ctx,0,-h*.82,w*(o.kind==='lantern'?.8:1.1),o.kind==='lantern'?'#ffd9a0':'#ff9b3c',.28*flick);
   ctx.fillStyle=o.kind==='lantern'?'#ffe6b8':'#ffb257';ctx.globalAlpha=.9;
   ctx.beginPath();ctx.ellipse(0,-h*.84,w*.12*flick,h*.13*flick,0,0,7);ctx.fill();break}
  case 'crate': {ctx.fillStyle=vgrad(ctx,'#87683f','#4a3823',h,1.02);ctx.fillRect(-w*.4,-h,w*.8,h);ctx.strokeStyle='#493723';ctx.lineWidth=2;ctx.strokeRect(-w*.4,-h,w*.8,h);
   ctx.beginPath();ctx.moveTo(-w*.4,-h);ctx.lineTo(w*.4,0);ctx.moveTo(w*.4,-h);ctx.lineTo(-w*.4,0);ctx.stroke();break}
  case 'barrel': case 'urn': {ctx.fillStyle=vgrad(ctx,o.kind==='urn'?'#94836a':'#87673f','#3f2f1d',h,1.02);
   ctx.beginPath();ctx.moveTo(-w*.3,0);ctx.quadraticCurveTo(-w*.42,-h*.5,-w*.28,-h);ctx.lineTo(w*.28,-h);ctx.quadraticCurveTo(w*.42,-h*.5,w*.3,0);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#3f2f1d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.36,-h*.62);ctx.lineTo(w*.36,-h*.62);ctx.moveTo(-w*.34,-h*.3);ctx.lineTo(w*.34,-h*.3);ctx.stroke();break}
  case 'stall': {ctx.fillStyle=vgrad(ctx,'#755a3c','#3b2c1e',h,.6);ctx.fillRect(-w*.55,-h*.5,w*1.1,h*.5);
   ctx.fillStyle='#9c4b3c';ctx.beginPath();ctx.moveTo(-w*.7,-h*.5);ctx.lineTo(0,-h);ctx.lineTo(w*.7,-h*.5);ctx.closePath();ctx.fill();
   ctx.fillStyle='#c9b98d';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc((i-1)*w*.28,-h*.56,w*.09,0,7);ctx.fill()}break}
  case 'banner': {ctx.strokeStyle='#4b4038';ctx.lineWidth=Math.max(3,w*.07);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-h);ctx.stroke();
   ctx.fillStyle=o.accent;ctx.globalAlpha=.8;const wob=Math.sin(t*1.6)*w*.06;
   ctx.beginPath();ctx.moveTo(0,-h*.95);ctx.lineTo(w*.42+wob,-h*.9);ctx.lineTo(w*.36+wob,-h*.45);ctx.lineTo(0,-h*.5);ctx.closePath();ctx.fill();break}
  case 'pipe': {ctx.fillStyle=vgrad(ctx,'#868b90','#4b4f53',h,.45);ctx.fillRect(-w*.5,-h*.34,w,h*.24);
   ctx.fillStyle='#565a5e';ctx.fillRect(-w*.5,-h*.34,w*.12,h*.24);ctx.fillRect(w*.38,-h*.34,w*.12,h*.24);
   ctx.fillStyle='#7d8286';ctx.fillRect(-w*.18,-h,w*.36,h*.68);break}
  case 'furnace': {ctx.fillStyle=vgrad(ctx,'#6b5a49','#332a22',h,.9);ctx.fillRect(-w*.5,-h*.8,w,h*.8);
   ctx.fillStyle='#2a221c';ctx.fillRect(-w*.22,-h*.55,w*.44,h*.4);
   glow(ctx,0,-h*.35,w*.9,'#ff8330',.3+Math.sin(time*5+o.seed*9)*.08);
   ctx.fillStyle='#6a5a4a';ctx.fillRect(-w*.6,-h,w*1.2,h*.22);break}
  case 'console': {ctx.fillStyle=vgrad(ctx,'#5d6a74','#333a41',h,.8);ctx.fillRect(-w*.44,-h*.7,w*.88,h*.7);
   ctx.fillStyle='#2c343a';ctx.fillRect(-w*.34,-h*.62,w*.68,h*.34);
   ctx.fillStyle=o.mood;ctx.globalAlpha=.5+Math.sin(time*4+o.seed*13)*.25;
   for(let i=0;i<3;i++)ctx.fillRect(-w*.28+i*w*.2,-h*.5,w*.12,h*.05);break}
  case 'pod': {ctx.fillStyle=vgrad(ctx,'#5b6a76','#2f3840',h,1.02);ctx.beginPath();ctx.ellipse(0,-h*.5,w*.34,h*.5,0,0,7);ctx.fill();
   ctx.globalAlpha=.55;ctx.fillStyle=o.mood;ctx.beginPath();ctx.ellipse(0,-h*.55,w*.2,h*.34,0,0,7);ctx.fill();
   glow(ctx,0,-h*.55,w*.7,o.mood,.18);break}
  case 'antenna': {ctx.strokeStyle='#6a7076';ctx.lineWidth=Math.max(2,w*.05);
   ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-h);ctx.moveTo(-w*.22,0);ctx.lineTo(0,-h*.55);ctx.moveTo(w*.22,0);ctx.lineTo(0,-h*.55);ctx.stroke();
   ctx.fillStyle=o.mood;ctx.globalAlpha=.6+Math.sin(time*3+o.seed*7)*.3;ctx.beginPath();ctx.arc(0,-h,w*.06,0,7);ctx.fill();break}
  case 'bogpost': {ctx.fillStyle='#4d4433';ctx.fillRect(-w*.1,-h,w*.2,h);
   ctx.strokeStyle='#6e6244';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.24,-h*.72);ctx.lineTo(w*.24,-h*.66);ctx.stroke();break}
  default: {ctx.fillStyle='#6a6155';ctx.beginPath();ctx.ellipse(0,-h*.4,w*.3,h*.4,0,0,7);ctx.fill()}
 }
 ctx.restore();
}
