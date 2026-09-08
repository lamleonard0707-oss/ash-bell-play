'use strict';
// Fixed contact frames; animation is driven by travelled distance, never idle time.
const gaitArt=new Image(),enemyGaitArt=new Image(),gaitFrames=[],enemyGaitFrames=[];
const rosterBlend=[1,0,0,0,0,0],rosterRects=[],rosterBounds=[],movingLooks=new Map();
let rosterHover=-1,rosterFocus=-1,rosterPulse=0,rosterTick=0,walkMode=false,heroTravelSpeed=0,footStepIndex=-1;
// Artist rows are NOT equal height: the former 362px slices cut later heads.
// These source bands include each entire pose, then normalize at the feet.
const heroGaitRows=[0,354,703,1042,1448];
function makeGaitFrames(img,cols,rows,out){
 const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
 const g=c.getContext('2d');g.drawImage(img,0,0);const im=g.getImageData(0,0,c.width,c.height),d=im.data;
 for(let i=0;i<d.length;i+=4){if(img===humanArt||img===relicArt||img===manifestationArt)continue;const v=Math.max(d[i],d[i+1],d[i+2]);if(v<23)d[i+3]=0;else if(v<39)d[i+3]=Math.min(d[i+3],Math.round((v-23)/16*255))}g.putImageData(im,0,0);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const humanCuts=[0,230,475,704,935,1152,1388,1610,1840,2048];const sx=img===humanArt?Math.floor(humanCuts[col]*c.width/2048):Math.floor(col*c.width/cols),ex=img===humanArt?Math.floor(humanCuts[col+1]*c.width/2048):Math.floor((col+1)*c.width/cols);
  const sy=img===gaitArt?Math.round(heroGaitRows[row]*c.height/1448):img===humanArt?(row===0?0:Math.floor([322,306,289,325,326,305,315,315,310][col]*c.height/683)):Math.floor(row*c.height/rows);
  const ey=img===gaitArt?Math.round(heroGaitRows[row+1]*c.height/1448):img===humanArt?(row===0?Math.floor([312,306,294,309,310,303,310,310,306][col]*c.height/683):c.height):Math.floor((row+1)*c.height/rows);
  let l=ex,r=sx,t=ey,b=sy;
  for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++)if(d[(y*c.width+x)*4+3]>90){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
  const tile=document.createElement('canvas');tile.width=300;tile.height=480;
  const w=Math.max(1,r-l+1),h=Math.max(1,b-t+1),scale=Math.min(268/w,446/h);
  tile.getContext('2d').drawImage(c,l,t,w,h,150-w*scale/2,463-h*scale,w*scale,h*scale);
  if(img!==manifestationArt)cleanSpriteFragments(tile);tile.trim={x:150-w*scale/2,y:463-h*scale,w:w*scale,h:h*scale};tile.sourceBounds={x:l,y:t,w,h,bandTop:sy,bandBottom:ey};out.push(tile);
 }
}
function normalizedRoster(id){const src=wardrobeFrame(0,id);if(!src)return null;if(rosterBounds[id])return rosterBounds[id];const c=src.getContext('2d'),im=c.getImageData(0,0,src.width,src.height),d=im.data;let l=src.width,r=0,t=src.height,b=0;for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++)if(d[(y*src.width+x)*4+3]>90){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}return rosterBounds[id]={src,x:l,y:t,w:r-l+1,h:b-t+1}}
function rosterLayout(w,h){const n=Math.max(2,classes.length);return classes.map((_,i)=>{const angle=Math.PI*.1+i*(Math.PI*.8)/(n-1);return {x:w*.5-Math.cos(angle)*w*.405,y:h*.56+Math.sin(angle)*h*.34,height:Math.min(h*.47,w*.225)}})}
function chooseHero(i){if(!Number.isInteger(i)||i<0||i>=classes.length||mode!=='select')return;chosen=i;if(typeof ensureHeroDirections==='function')ensureHeroDirections(i);rosterPulse=1;beginSelectionVideo(i);document.querySelectorAll('.classcard').forEach((e,j)=>{e.classList.toggle('active',i===j);e.setAttribute('aria-pressed',i===j?'true':'false')});$('#note').textContent=classes[i].note;drawSkillIcon();tone(330+i*90);drawRoster()}
function drawArcRoster(){if(!wardrobeReady||!monkReady||!echoReady)return;const w=roster.width,h=roster.height,dt=Math.min(.05,Math.max(0,time-rosterTick));rosterTick=time;rosterPulse=Math.max(0,rosterPulse-dt*1.4);const focus=rosterHover>=0?rosterHover:rosterFocus>=0?rosterFocus:chosen;for(let i=0;i<classes.length;i++)rosterBlend[i]=(rosterBlend[i]||0)+(Number(i===focus)-(rosterBlend[i]||0))*Math.min(1,dt*11);rc.clearRect(0,0,w,h);rosterRects.length=0;const layout=rosterLayout(w,h);rc.save();rc.strokeStyle='#ac895144';rc.lineWidth=2;rc.beginPath();for(let j=0;j<=60;j++){const a=Math.PI*.1+j/60*Math.PI*.8,x=w*.5-Math.cos(a)*w*.405,y=h*.56+Math.sin(a)*h*.34;if(j===0)rc.moveTo(x,y);else rc.lineTo(x,y)}rc.stroke();rc.restore();// The focused hero walks to centre stage and plays big; the rest step back and dim.
 const stage={x:w*.5,y:h*.92};
 for(let k=0;k<classes.length;k++){const l=layout[k],g=rosterBlend[k]||0;
  l.dh=Math.min(l.height*(1+g*1.05),h*.78);
  l.dx=l.x+(stage.x-l.x)*g*.78;
  // keep the enlarged figure and its caption inside the stage
  l.dy=Math.max(l.dh+24,Math.min(h-58,l.y+(stage.y-l.y)*g*.78));}
 const order=classes.map((_,i)=>i).sort((a,b)=>layout[a].dy-layout[b].dy);for(const i of order){const base=normalizedRoster(i);if(!base)continue;const gain=rosterBlend[i]||0,at={x:layout[i].dx,y:layout[i].dy,height:layout[i].dh},height=at.height,width=height*base.w/base.h,selected=i===chosen;rc.save();rc.globalAlpha=.42+gain*.58;rc.fillStyle='#050302aa';rc.beginPath();rc.ellipse(at.x,at.y,width*.39,11,0,0,7);rc.fill();glow(rc,at.x,at.y-45,100,classes[i].color,.05+gain*.12);rc.strokeStyle=selected?classes[i].color:'#766043';rc.lineWidth=selected?3:1;rc.beginPath();rc.ellipse(at.x,at.y,width*.47,16,0,0,7);rc.stroke();rc.translate(at.x,at.y);const pulse=selected?rosterPulse:0;rc.rotate(Math.sin(time*2+i)*.005+Math.sin(pulse*Math.PI*2)*.018);const breath=1+Math.sin(time*2.5+i)*.005;rc.scale(1,breath);if(paintSelectionVideo(rc,i,height)){}else if(pulse>0&&gaitFrames.length){const pose=gaitPose(Math.min(3,Math.floor((1-pulse)*4)),i);if(pose)drawMotionTile(rc,pose,0,0,height);else rc.drawImage(base.src,base.x,base.y,base.w,base.h,-width/2,-height,width,height)}else rc.drawImage(base.src,base.x,base.y,base.w,base.h,-width/2,-height,width,height);if(pulse>0){rc.globalAlpha=pulse*.25;rc.strokeStyle=classes[i].color;rc.lineWidth=3;rc.beginPath();rc.ellipse(0,0,width*.5+(1-pulse)*60,18+(1-pulse)*22,0,0,7);rc.stroke()}rc.restore();rc.save();rc.textAlign='center';rc.globalAlpha=.6+gain*.4;rc.fillStyle=selected?'#ffe1a2':'#c6b38f';rc.font=Math.round(17+gain*15)+'px Georgia';rc.fillText(classes[i].name,at.x,at.y+30+gain*16);
  if(gain>.5){rc.globalAlpha=(gain-.5)*2;rc.fillStyle='#b09a78';rc.font='15px Georgia';rc.fillText(classes[i].tag,at.x,at.y+56+gain*16)}
  rc.restore();
  rosterRects.push({id:i,x:at.x-width/2-12,y:at.y-height-8,w:width+24,h:height+60})}}
function rosterHit(e){const box=roster.getBoundingClientRect(),scale=Math.min(box.width/roster.width,box.height/roster.height),x=(e.clientX-box.left-(box.width-roster.width*scale)/2)/scale,y=(e.clientY-box.top-(box.height-roster.height*scale)/2)/scale;return [...rosterRects].reverse().find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)?.id??-1}
// Only the first five classes have entries on heroes-gait.png; anything past that
// falls back to its wardrobe frame rather than reading off the end of the sheet.
function gaitPose(frame,id){return id===5?echoGaitFrames[frame%Math.max(1,echoGaitFrames.length)]:id<5?gaitFrames[frame*5+id]:null}
function gaitFrameIndex(phase){return ((Math.floor(phase/(Math.PI*2)*4)%4)+4)%4}
function movingLook(frame){const key=visualSignature()+':'+frame;if(movingLooks.has(key))return movingLooks.get(key);const src=chosen===5?echoGaitFrames[frame%Math.max(1,echoGaitFrames.length)]:gaitFrames[frame*5+chosen];if(!src)return null;const base=src;
 const tile=document.createElement('canvas');tile.width=300;tile.height=480;const c=tile.getContext('2d');c.drawImage(base,0,0);tile.trim=src.trim;/* Retain slot rarity/material cues without freezing the articulated feet. */for(const [slot,regions]of Object.entries(bodyRegions)){const tier=wardrobeTier(equipped[slot]);if(!tier)continue;c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=tier===2?.32:.24;c.fillStyle=tier===2?'#d2a352':'#73a3d8';for(const [x,y,w,h]of regions)c.fillRect(x*300,y*480,w*300,h*480);c.restore()}if(movingLooks.size>48)movingLooks.clear();movingLooks.set(key,tile);return tile}
function drawGait(c,x,y,height,flip){const tile=movingLook(gaitFrameIndex(walkPhase));if(!tile)return false;c.save();c.translate(x,y);if(flip)c.scale(-1,1);const stride=heroTravelSpeed>135?1.025:1;c.scale(stride,1);drawMotionTile(c,tile,0,0,height);c.restore();return true}
// v0.9.0: walking is no longer a pure downside — it steadies your aim.
function movementFactor(){return walkMode||keys.shift? .58:1}
function terrainFootstep(){const t=(typeof mapSpec==='function'?mapSpec().theme:'sanctum');return t==='forest'||t==='graveyard'||t==='fae'?'step-soft':t==='mire'?'step-wet':t==='ship'||t==='foundry'||t==='city'?'step-hard':'step'}
function updateTravel(before,dt){const travelled=dist(before,p);heroTravelSpeed=travelled/Math.max(dt,.001);heroMotion=heroTravelSpeed>3;if(heroMotion){walkPhase+=travelled/(heroTravelSpeed>135?84:66)*Math.PI*2;const step=Math.floor(walkPhase/Math.PI);if(step!==footStepIndex){footStepIndex=step;if(preferences.sound)playSfx(terrainFootstep(),p.x);if(heroTravelSpeed>135&&preferences.quality!=='smooth')sparks(p.x,p.y,'#a99c82',2,18)}}}
function initMotion(){roster.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&mode==='select')rosterHover=rosterHit(e)});roster.addEventListener('pointerleave',()=>rosterHover=-1);roster.addEventListener('click',e=>{const i=rosterHit(e);if(i>=0)chooseHero(i)});document.querySelectorAll('.classcard').forEach((e,i)=>{e.addEventListener('pointerenter',ev=>{if(ev.pointerType==='mouse')rosterHover=i});e.addEventListener('pointerleave',()=>rosterHover=-1);e.addEventListener('focus',()=>rosterFocus=i);e.addEventListener('blur',()=>rosterFocus=-1);e.onclick=()=>chooseHero(i)});$('#pace').onclick=()=>{walkMode=!walkMode;$('#pace').textContent=walkMode?'步行':'跑步';$('#pace').setAttribute('aria-pressed',walkMode)};}

// A missing or zero-size tile used to throw here, and because the throw escaped
// requestAnimationFrame the game froze for good. Draw nothing instead.
function drawMotionTile(c,tile,x,y,h){if(!tile)return;const b=tile.trim||{x:0,y:0,w:tile.width,h:tile.height};if(!(b.w>0)||!(b.h>0)||!(h>0))return;const w=h*b.w/b.h;c.drawImage(tile,b.x,b.y,b.w,b.h,x-w/2,y-h,w,h)}

// Reject small disconnected pieces from neighbouring cells without altering art.
function cleanSpriteFragments(tile){
 const g=tile.getContext('2d'),im=g.getImageData(0,0,tile.width,tile.height),d=im.data,w=tile.width,h=tile.height,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),components=[];let label=0;
 for(let start=0;start<n;start++){if(labels[start]||d[start*4+3]<16)continue;label++;let head=0,tail=1;queue[0]=start;labels[start]=label;let sumX=0;
 while(head<tail){const at=queue[head++];sumX+=at%w;const visit=k=>{if(k>=0&&k<n&&!labels[k]&&d[k*4+3]>=16){labels[k]=label;queue[tail++]=k}};if(at%w)visit(at-1);if(at%w<w-1)visit(at+1);visit(at-w);visit(at+w);}
 components.push({label,size:tail,x:sumX/tail});}
 const max=Math.max(0,...components.map(c=>c.size));const keep=new Set(components.filter(c=>c.size===max||c.size>max*.025&&c.x>w*.15&&c.x<w*.85).map(c=>c.label));
 for(let i=0;i<n;i++)if(labels[i]&&!keep.has(labels[i]))d[i*4+3]=0;g.putImageData(im,0,0);
}
