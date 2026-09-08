'use strict';
// v0.10 exploration mode.
//
// 0.9.0 released enemies from a timer: one every 1.05s until the wave counter ran
// out, so the length of a map was fixed by arithmetic and the player could stand
// still and wait. Maps are now populated up front — the garrison is already out
// there, asleep, spread across zones — and you have to go and find it.
//
// A map ends when the three mapSeals are broken and the boss, who only shows up once
// they are, is put down. Target length is 10-15 minutes per map.
// About twenty times the area of the 0.10 map, laid out as camps with real empty
// ground between them so walking actually feels like looking for something.
const EXPLORE_WORLD={w:12800,h:8600};
// Waking is deliberately slow and capped. Without a cap, walking between two zones
// wakes both at once and the screen fills with enemies, which is exactly what the
// first build did.
const WAKE_RADIUS=420,SLEEP_RADIUS=1500,SEAL_RADIUS=70,FOG_CELL=180;
const WAKE_INTERVAL=.28,WAKE_PER_TICK=2;
// How many may be awake at once. This was briefly scaled by depth after an
// automated playtest died on map one, but that playtest had no footwork: it
// stood still and held the attack. Difficulty is Leonard's call, not a
// measurement of how badly a script plays, so the ceiling is flat again.
const MAX_AWAKE=14;
function maxAwake(){return MAX_AWAKE}
let wakeTimer=0;
let zones=[],mapSeals=[],exploredCells=new Set(),bossGate=null,exploring=false,sealsBroken=0;

function exploreRng(id){return makeRng(((runSeed>>>0)^((id+7)*2246822519))>>>0)}
function playBounds(){return {x0:96,y0:132,x1:world.w-96,y1:world.h-96}}

// --- layout -------------------------------------------------------------------
// Zones are spread with a relaxation pass so the map reads as distinct pockets of
// resistance rather than an even sprinkle of enemies.
function buildZones(id,rand){
 const b=playBounds(),out=[],want=25+Math.floor(rand()*7);
 for(let tries=0;out.length<want&&tries<4000;tries++){
  const x=b.x0+220+rand()*(b.x1-b.x0-440),y=b.y0+220+rand()*(b.y1-b.y0-440);
  if(Math.hypot(x-entryPoint().x,y-entryPoint().y)<900)continue;
  if(out.some(z=>Math.hypot(z.x-x,z.y-y)<1050))continue;
  out.push({x,y,r:250+rand()*150,cleared:false});
 }
 return out;
}
function entryPoint(){return {x:world.w*.5,y:world.h-190}}

// Enemy budget per map: enough to fill ten to fifteen minutes of moving and fighting.
// Sized for a ten to fifteen minute map: most of it is dormant until you walk
// into a zone, so only a few dozen are ever awake at once.
// 2026-09-09：使用者要「怪少啲、強啲」，一打二三就要吃力。守軍數量斬 45%。
function garrisonSize(id){return Math.round((330-id*11)*.55)}

function populateMap(id){
 const rand=exploreRng(id);
 world.w=EXPLORE_WORLD.w;world.h=EXPLORE_WORLD.h;
 // BUG-033: this has to be set before anything is placed. confine() falls back to
 // the old sanctuary diamond while it is false, which crammed the whole garrison
 // into a 2160x1440 corner of the map.
 exploring=true;
 zones=buildZones(id,rand);
 exploredCells=new Set();sealsBroken=0;bossGate=null;wakeTimer=0;
 foes=[];shots=[];hazards=[];castFields=[];drops=[];
 initProps();
 const budget=garrisonSize(id);
 // Spread the garrison over the zones, weighting the far ones a little heavier so
 // the map gets harder the deeper you push.
 const weights=zones.map(z=>.6+Math.hypot(z.x-entryPoint().x,z.y-entryPoint().y)/Math.hypot(world.w,world.h));
 const total=weights.reduce((a,b)=>a+b,0);
 zones.forEach((z,i)=>{
  z.count=Math.max(4,Math.round(budget*weights[i]/total));
  for(let n=0;n<z.count;n++){
   const a=rand()*Math.PI*2,d=rand()*z.r;
   placeSleeper(id,z.x+Math.cos(a)*d,z.y+Math.sin(a)*d*.8,rand);
  }
 });
 // Three mapSeals, each parked in a different far zone, so clearing the map means
 // crossing it rather than circling the entrance.
 // Not the three farthest camps: that turns the critical path into a tour of the
 // whole map. Pick three well-spread camps in the middle distance band and leave the
 // far corners as optional ground.
 const entry=entryPoint(),far=Math.hypot(world.w,world.h);
 const band=zones.filter(z=>{const d=Math.hypot(z.x-entry.x,z.y-entry.y);return d>far*.42&&d<far*.86});
 const pool=(band.length>=3?band:zones).slice().sort((a,b)=>Math.hypot(a.x-entry.x,a.y-entry.y)-Math.hypot(b.x-entry.x,b.y-entry.y));
 const picked=[];
 for(const z of pool){if(picked.length>=3)break;if(picked.every(q=>Math.hypot(q.x-z.x,q.y-z.y)>3400))picked.push(z)}
 while(picked.length<3&&pool.length)picked.push(pool[Math.floor(rand()*pool.length)]);
 mapSeals=picked.slice(0,3).map((z,i)=>{const hp=Math.round(420*Math.pow(1.33,id));return {x:z.x,y:z.y,hp,maxhp:hp,broken:false,index:i}});
 for(const s of mapSeals)for(let n=0;n<4;n++){const a=rand()*Math.PI*2;placeSleeper(id,s.x+Math.cos(a)*rnd(120,190),s.y+Math.sin(a)*rnd(100,150),rand,true)}
 // Camps seeded along the objective route. Without these the critical path is a
 // long walk through empty ground; the scattered camps mostly sit off to the side.
 const route=[entryPoint(),...mapSeals,{x:world.w*.5,y:playBounds().y0+180}];
 for(let i=0;i<route.length-1;i++)for(const t of [.3,.55,.8]){
  const at={x:route[i].x+(route[i+1].x-route[i].x)*t+rnd(-300,300),
            y:route[i].y+(route[i+1].y-route[i].y)*t+rnd(-260,260)};
  confine(at);
  if(Math.hypot(at.x-entryPoint().x,at.y-entryPoint().y)<600)continue;
  const z={x:at.x,y:at.y,r:250+rand()*130,cleared:false};zones.push(z);
  const n=Math.max(3,Math.round((14-id*0.75)*.55))+Math.floor(rand()*3);
  for(let k=0;k<n;k++){const a=rand()*Math.PI*2,d=rand()*z.r;placeSleeper(id,z.x+Math.cos(a)*d,z.y+Math.sin(a)*d*.8,rand)}
 }
}

function placeSleeper(id,x,y,rand,guard){
 const at={x,y};confine(at);
 // 休息區入面唔擺守軍：呢個係唯一一笪唔使打嘅地方。
 if(typeof inTown==='function'&&inTown(at.x,at.y))return;
 const f=campaignSpawn(Math.random()<.34?0:Math.random()<.6?1:2);
 f.x=at.x;f.y=at.y;f.asleep=true;f.state='idle';f.stateT=0;f.homeX=at.x;f.homeY=at.y;
 if(guard){f.guardOfSeal=true;f.hp*=1.15;f.maxhp=f.hp}
 return f;
}

// --- runtime ------------------------------------------------------------------
function markExplored(){
 if(!p)return;
 const cx=Math.floor(p.x/FOG_CELL),cy=Math.floor(p.y/FOG_CELL),cols=Math.ceil(world.w/FOG_CELL);
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const x=cx+dx,y=cy+dy;if(x<0||y<0)continue;exploredCells.add(y*cols+x);
 }
}
function updateExploration(dt){
 if(!exploring||!p)return;
 markExplored();
 // Awake enemies that lose you go back to sleep, which frees a slot and stops the
 // whole map trailing behind the player.
 let awake=0;
 for(const f of foes){
  if(f.hp<=0||f.asleep)continue;
  if(f.type===3||f.escortOf){awake++;continue}
  if(dist(f,p)>SLEEP_RADIUS){f.asleep=true;f.state='idle';continue}
  awake++;
 }
 wakeTimer-=dt;
 if(wakeTimer<=0){
  wakeTimer=WAKE_INTERVAL;
  let budget=Math.min(WAKE_PER_TICK,maxAwake()-awake);
  if(budget>0){
   // nearest first, so a zone reveals itself from the edge you walked in through
   const candidates=foes.filter(f=>f.asleep&&f.hp>0&&dist(f,p)<WAKE_RADIUS).sort((a,b)=>dist(a,p)-dist(b,p));
   for(const f of candidates){
    if(budget--<=0)break;
    f.asleep=false;f.state='emerge';f.stateT=rnd(.3,.6);ring(f.x,f.y,f.color,26,.4);
   }
  }
 }
 for(const z of zones){
  if(z.cleared)continue;
  if(!foes.some(f=>f.hp>0&&Math.hypot(f.x-z.x,f.y-z.y)<z.r+90)){z.cleared=true;
   if(dist(z,p)<z.r+260){toast('區域肅清');playSfx('loot',z.x)}}
 }
 if(sealsBroken>=3&&!bossGate&&!bossSpawned)openBossGate();
}
function sealDamage(s,amount){
 if(s.broken)return;
 s.hp-=amount;s.hit=.14;
 if(s.hp<=0){
  s.broken=true;sealsBroken++;shake=10;
  sparks(s.x,s.y,'#ffd08a',40,220);ring(s.x,s.y,'#ffd08a',220,.9);playSfx('phase',s.x);
  toast('封印破碎 '+sealsBroken+' / 3'+(sealsBroken>=3?' · 守鐘者現身':''));
  for(let i=0;i<3;i++)drops.push({x:s.x+(i-1)*40,y:s.y+20,type:i?'heal':'potion',life:240});
  equipmentDrop(s.x,s.y+30);
 }
}
function openBossGate(){
 const b=playBounds();
 bossGate={x:world.w*.5,y:b.y0+180,r:130,open:true};
 toast(mapSpec().boss+' 已現身 · 前往地圖上方光柱');
 playSfx('boss',bossGate.x);
}
function exploreBossCheck(){
 if(!bossGate||bossSpawned||!p)return;
 if(dist(bossGate,p)<bossGate.r){spawnExploreBoss()}
}
function spawnExploreBoss(){
 const m=mapSpec(),kit=bossKit(routeStage);
 const hp=1635*Math.pow(1.41,routeStage)*BOSS_HEALTH_SCALE*kit.hp*difficulty().hp*tierSpec().hp*rnd(.94,1.08);
 const speed=(58+routeStage*4)*kit.pace*difficulty().speed*tierSpec().speed;
 // keep the campaign's wave bookkeeping in step: reaching the boss is wave 3.
 bossSpawned=true;bossGate=null;wave=routeStage*3+3;waveSpawn=0;
 foes.push({x:world.w*.5,y:playBounds().y0+200,type:3,campaign:true,mapId:routeStage,name:m.boss,hp,maxhp:hp,r:kit.r,speed,baseSpeed:speed,attack:1.2,phase:0,bossPhase:0,serial:++spawnSerial,action:0,state:'seek',stateT:0,walk:0,scale:kit.scale,burn:0,burnTick:0,frozen:0,guardUp:kit.traits.includes('shielded')?1:0,hit:0,bob:kit.traits.includes('float')?1.8:.8,gait:kit.pace});
 const boss=foes[foes.length-1];
 if(kit.traits.includes('shielded'))spawnEscort(boss,4);
 $('#bossbar').hidden=false;$('#bossbar b').textContent=m.boss;
 toast(m.boss+' · '+bossHint(routeStage));playSfx('boss',boss.x);
}

// --- drawing ------------------------------------------------------------------
function drawExploration(){
 if(!exploring)return;
 for(const s of mapSeals){
  const t=time*1.4+s.index;
  if(s.broken){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#4a4038';ctx.beginPath();ctx.ellipse(s.x,s.y,34,14,0,0,7);ctx.fill();ctx.restore();continue}
  groundRing(s.x,s.y,SEAL_RADIUS,'#ffd08a',.5+Math.sin(t)*.15,3);
  groundRing(s.x,s.y,SEAL_RADIUS*.6,'#ffe8b8',.35,2);
  glow(ctx,s.x,s.y-40,110,'#ffc06a',.22+Math.sin(t*1.7)*.06);
  ctx.save();ctx.translate(s.x,s.y);
  ctx.fillStyle=s.hit>0?'#fff0cc':'#c9a86a';
  ctx.beginPath();ctx.moveTo(0,-120);ctx.lineTo(26,-52);ctx.lineTo(16,0);ctx.lineTo(-16,0);ctx.lineTo(-26,-52);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#6b543a';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#2a2018';ctx.fillRect(-22,-8,44,7);
  ctx.restore();
  ctx.fillStyle='#100b0b';ctx.fillRect(s.x-30,s.y-138,60,6);
  ctx.fillStyle='#ffc06a';ctx.fillRect(s.x-30,s.y-138,60*Math.max(0,s.hp/s.maxhp),4);
 }
 if(bossGate){
  const pulse=.5+Math.sin(time*3)*.25;
  glow(ctx,bossGate.x,bossGate.y,240,'#ffb060',pulse*.4);
  groundRing(bossGate.x,bossGate.y,bossGate.r,'#ffb060',pulse,4);
  ctx.save();ctx.globalAlpha=pulse*.5;ctx.fillStyle='#ffcf94';ctx.fillRect(bossGate.x-16,bossGate.y-560,32,560);ctx.restore();
 }
}
function exploreHUD(){
 if(!exploring||!p)return;
 const alive=foes.filter(f=>f.hp>0&&f.type!==3).length;
 if(bossSpawned)ui.objective.textContent='擊敗 '+mapSpec().boss;
 else if(bossGate)ui.objective.textContent='守鐘者已現身 · 前往地圖上方光柱';
 else ui.objective.textContent='破壞封印 '+sealsBroken+' / 3 · 場上守軍 '+alive;
 const target=mapSeals.find(s=>!s.broken);
 if(!bossSpawned){
  const goal=bossGate||target;
  if(goal){const a=Math.atan2(goal.y-p.y,goal.x-p.x),d=Math.round(dist(goal,p));
   $('#routehint').textContent=(bossGate?'守鐘者':'封印')+' · '+d+' 步 '+compassArrow(a);}
 }
}
function compassArrow(a){return ['→','↘','↓','↙','←','↖','↑','↗'][((Math.round(a/(Math.PI/4))%8)+8)%8]}
function drawExploreMap(){
 mc.clearRect(0,0,160,108);
 const cols=Math.ceil(world.w/FOG_CELL),rows=Math.ceil(world.h/FOG_CELL);
 mc.fillStyle='#0b0908';mc.fillRect(0,0,160,108);
 mc.fillStyle='#3b3227';
 for(const cell of exploredCells){
  const x=cell%cols,y=Math.floor(cell/cols);
  mc.fillRect(x/cols*160,y/rows*108,160/cols+1,108/rows+1);
 }
 mc.strokeStyle='#a18b61';mc.strokeRect(2,2,156,104);
 const seen=(x,y)=>exploredCells.has(Math.floor(y/FOG_CELL)*cols+Math.floor(x/FOG_CELL));
 for(const s of mapSeals){if(!seen(s.x,s.y))continue;mc.fillStyle=s.broken?'#5d5346':'#ffc06a';mc.fillRect(s.x/world.w*160-2,s.y/world.h*108-2,5,5)}
 if(bossGate){mc.fillStyle='#ff9d5c';mc.fillRect(bossGate.x/world.w*160-3,bossGate.y/world.h*108-3,6,6)}
 for(const f of foes){if(f.hp<=0||f.asleep||!seen(f.x,f.y))continue;mc.fillStyle=f.type===3?'#ff8657':f.color;mc.fillRect(f.x/world.w*160-1,f.y/world.h*108-1,f.elite?4:2,2)}
 if(!p)return;
 mc.fillStyle='#fff3cc';mc.beginPath();mc.arc(p.x/world.w*160,p.y/world.h*108,3,0,7);mc.fill();
}
function exploreSnapshot(){return {zones:zones.map(z=>({x:z.x,y:z.y,r:z.r,cleared:!!z.cleared})),mapSeals:mapSeals.map(s=>({x:s.x,y:s.y,hp:s.hp,maxhp:s.maxhp,broken:!!s.broken,index:s.index})),explored:[...exploredCells],bossGate,sealsBroken,exploring}}
function exploreRestore(s){
 if(!s||!s.exploring){exploring=false;return}
 world.w=EXPLORE_WORLD.w;world.h=EXPLORE_WORLD.h;
 zones=(s.zones||[]).map(z=>({...z}));mapSeals=(s.mapSeals||[]).map(z=>({...z}));
 exploredCells=new Set(s.explored||[]);bossGate=s.bossGate||null;sealsBroken=s.sealsBroken||0;exploring=true;
}
// Jump straight to the boss encounter. Used by the regression tests, and by
// campaignNextWave so the old "advance the wave" entry point still works.
function exploreForceBoss(){
 if(!exploring)return false;
 for(const s of mapSeals)if(!s.broken){s.hp=0;s.broken=true;sealsBroken++}
 bossGate=null;if(!bossSpawned)spawnExploreBoss();
 return true;
}
function resetExplore(){zones=[];mapSeals=[];exploredCells=new Set();bossGate=null;sealsBroken=0;exploring=false}
