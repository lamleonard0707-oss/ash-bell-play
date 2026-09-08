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
function drawArcRoster(){if(!wardrobeReady||!monkReady||!angelReady)return;const w=roster.width,h=roster.height,dt=Math.min(.05,Math.max(0,time-rosterTick));rosterTick=time;rosterPulse=Math.max(0,rosterPulse-dt*1.4);const focus=rosterHover>=0?rosterHover:rosterFocus>=0?rosterFocus:chosen;for(let i=0;i<classes.length;i++)rosterBlend[i]=(rosterBlend[i]||0)+(Number(i===focus)-(rosterBlend[i]||0))*Math.min(1,dt*11);rc.clearRect(0,0,w,h);rosterRects.length=0;const layout=rosterLayout(w,h);rc.save();rc.strokeStyle='#ac895144';rc.lineWidth=2;rc.beginPath();for(let j=0;j<=60;j++){const a=Math.PI*.1+j/60*Math.PI*.8,x=w*.5-Math.cos(a)*w*.405,y=h*.56+Math.sin(a)*h*.34;if(j===0)rc.moveTo(x,y);else rc.lineTo(x,y)}rc.stroke();rc.restore();// The focused hero walks to centre stage and plays big; the rest step back and dim.
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
function gaitPose(frame,id){return id===5?angelGaitFrames[frame%Math.max(1,angelGaitFrames.length)]:id<5?gaitFrames[frame*5+id]:null}
function gaitFrameIndex(phase){return ((Math.floor(phase/(Math.PI*2)*4)%4)+4)%4}
function movingLook(frame){const key=visualSignature()+':'+frame;if(movingLooks.has(key))return movingLooks.get(key);const src=chosen===5?angelGaitFrames[frame%Math.max(1,angelGaitFrames.length)]:gaitFrames[frame*5+chosen];if(!src)return null;const base=src;
 const tile=document.createElement('canvas');tile.width=300;tile.height=480;const c=tile.getContext('2d');c.drawImage(base,0,0);tile.trim=src.trim;/* Retain slot rarity/material cues without freezing the articulated feet. */for(const [slot,regions]of Object.entries(bodyRegions)){const tier=wardrobeTier(equipped[slot]);if(!tier)continue;c.save();c.globalCompositeOperation='source-atop';c.globalAlpha=tier===2?.32:.24;c.fillStyle=tier===2?'#d2a352':'#73a3d8';for(const [x,y,w,h]of regions)c.fillRect(x*300,y*480,w*300,h*480);c.restore()}if(movingLooks.size>48)movingLooks.clear();movingLooks.set(key,tile);return tile}
function drawGait(c,x,y,height,flip){const tile=movingLook(gaitFrameIndex(walkPhase));if(!tile)return false;c.save();c.translate(x,y);if(flip)c.scale(-1,1);const stride=heroTravelSpeed>135?1.025:1;c.scale(stride,1);drawMotionTile(c,tile,0,0,height);c.restore();return true}
// v0.9.0: walking is no longer a pure downside — it steadies your aim.
function movementFactor(){return walkMode||keys.shift? .58:1}
function terrainFootstep(){const t=(typeof mapSpec==='function'?mapSpec().theme:'sanctum');return t==='forest'||t==='graveyard'||t==='fae'?'step-soft':t==='mire'?'step-wet':t==='ship'||t==='foundry'||t==='city'?'step-hard':'step'}
function updateTravel(before,dt){advanceActorPresentation(p,dt,motionProfiles[chosen]);const travelled=dist(before,p);heroTravelSpeed=travelled/Math.max(dt,.001);heroMotion=heroTravelSpeed>3;if(heroMotion){walkPhase+=travelled/(heroTravelSpeed>135?84:66)*Math.PI*2;const step=Math.floor(walkPhase/Math.PI);if(step!==footStepIndex){footStepIndex=step;if(preferences.sound)playSfx(terrainFootstep(),p.x);if(heroTravelSpeed>135&&preferences.quality!=='smooth')sparks(p.x,p.y,'#a99c82',2,18)}}}
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

// Continuous presentation rig. WeakMap state never enters saves or combat rules.
const actorPresentation=new WeakMap(),rigCache=new Map(),rigTileIds=new WeakMap();let nextRigTileId=1;
const motionProfiles=[
 {stride:76,arms:.6,weight:.75,cloth:1.1},
 {stride:84,arms:.5,weight:.9,cloth:.8},
 {stride:90,arms:.95,weight:.55,cloth:1.35},
 {stride:70,arms:.35,weight:1.3,cloth:.8},
 {stride:62,arms:.85,weight:1.65,cloth:.4},
 {stride:86,arms:.45,weight:.65,cloth:1.7}
];
function presentationState(actor){let s=actorPresentation.get(actor);if(!s){s={x:actor.x,y:actor.y,phase:0,speed:0,blend:0,travelAngle:Math.PI/2,clock:0,state:actor.state||'idle',stateAge:0,stateLength:0,action:null};actorPresentation.set(actor,s)}return s}
function beginActorGesture(actor,kind,angle,duration=.5){if(!actor)return;const s=presentationState(actor);s.action={kind,angle,age:0,duration};}
function advanceActorPresentation(actor,dt,profile=motionProfiles[0]){
 const s=presentationState(actor),mx=actor.x-s.x,my=actor.y-s.y,d=Math.hypot(mx,my);s.x=actor.x;s.y=actor.y;if(d>.05&&d<80)s.travelAngle=Math.atan2(my,mx);
 if(actor.frozen>0||actor.asleep)return s;
 s.clock+=dt;s.stateAge+=dt;
 if(s.state!==(actor.state||'idle')){s.state=actor.state||'idle';s.stateAge=0;s.stateLength=Math.max(.1,actor.stateT||.45)}
 // Teleports/dashes must not spin legs through dozens of frames.
 const speed=d<80?d/Math.max(.001,dt):0;
 s.speed+=(speed-s.speed)*(1-Math.exp(-dt*13));
 const desired=speed>3?1:0;s.blend+=(desired-s.blend)*(1-Math.exp(-dt*(desired?16:20)));
 if(speed>3)s.phase+=d/profile.stride*Math.PI*2;
 else if(s.blend<.02)s.blend=0;
 if(s.action){s.action.age+=dt;if(s.action.age>=s.action.duration)s.action=null}
 return s;
}
function actorRigPose(actor,profile=motionProfiles[0],hero=false){
 const s=presentationState(actor),a=s.action,angle=a?a.angle:(actor.facing??Math.atan2(actor.dy||0,actor.dx||1));
 let wind=0,release=0,kind=a?.kind||'idle';
 if(a){const t=Math.min(1,a.age/a.duration),split=kind==='cast'?.43:.16;
  wind=t<split?Math.sin(t/split*Math.PI/2):0;
  release=t>=split?Math.sin(Math.min(1,(t-split)/(1-split))*Math.PI):0;
 }else if(!hero&&s.state==='windup'){wind=Math.min(1,s.stateAge/Math.max(.1,s.stateLength));kind=actor.type===2?'cast':'strike'}
 else if(!hero&&['charge','execute','hook','beam','volley','recover'].includes(s.state)){
  release=s.state==='recover'?Math.max(0,1-s.stateAge/Math.max(.1,s.stateLength)):Math.sin(Math.min(1,s.stateAge/.18)*Math.PI/2);kind=actor.type===2||s.state==='beam'?'cast':'strike';
 }
 return {phase:s.phase,blend:s.blend,run:Math.min(1,Math.max(0,(s.speed-85)/130)),clock:s.clock,wind,release,kind,angle,travelAngle:s.travelAngle,hit:Math.max(0,actor.recoil||0),profile,air:hero&&chosen===5?angelLift()/46:0};
}
function rigPoint(u,v,pose,width,height){
 const {phase,blend,run,clock,wind,release,kind,angle,profile,air}=pose,side=u<.5?-1:1;
 const leg=Math.max(0,(v-.58)/.42),outer=Math.min(1,Math.abs(u-.5)*3.1),arm=Math.max(0,1-Math.abs(v-.43)/.3)*outer;
 const swing=Math.sin(phase+(side<0?0:Math.PI)),lift=Math.max(0,Math.cos(phase+(side<0?0:Math.PI)));
 const body=Math.sin(phase*2)*height*.008*blend*profile.weight;
 let x=(u-.5)*width,y=(v-1)*height;
 // Hips stay attached; opposite knees and feet have separate swing/contact phases.
 const stride=height*(.042+run*.034)*blend,travel=pose.travelAngle??angle;
 x+=leg*leg*swing*stride*Math.cos(travel)+leg*swing*height*.009*blend*side;
 y+=leg*leg*swing*stride*Math.sin(travel)*.45;
 y-=leg*lift*height*(.026+run*.026)*blend*(1-air*.8);
 x-=arm*swing*height*.018*blend*profile.arms;
 y+=body*(1-leg)+Math.sin(clock*2.2)*height*.003*(1-v)*(1-blend*.7);
 // Cloth and wing tips lag the torso rather than rotate the entire cutout.
 x+=outer*Math.sin(clock*2.8-v*4)*height*.006*profile.cloth*(.3+blend)*Math.max(0,v-.3);
 if(air){y+=outer*Math.sin(clock*5.8+v)*height*.055*air*(1-v);x+=side*outer*Math.cos(clock*5.8)*height*.018*air*(1-v)}
 const torso=1-Math.min(1,Math.max(0,(v-.55)/.4)),direction=Math.cos(angle);
 x+=torso*height*direction*(-wind*.035+release*.055)-pose.hit*height*.12*torso;
 if(kind==='cast'){y-=arm*height*(wind*.075+release*.035);x+=side*arm*height*release*.06}
 else{ x+=arm*height*direction*(-wind*.06+release*.1);y-=arm*height*wind*.025; }
 y+=height*.012*wind*(1-leg)*profile.weight;
 return {x,y};
}
function drawRiggedTile(c,tile,x,y,height,pose){
 if(!tile?.trim)return false;
 let id=rigTileIds.get(tile);if(!id){id=nextRigTileId++;rigTileIds.set(tile,id)}
 const q={...pose,phase:Math.round(pose.phase/(Math.PI*2)*32)%32*Math.PI*2/32,clock:Math.round(pose.clock*12)/12,blend:Math.round(pose.blend*4)/4,run:Math.round(pose.run*3)/3,wind:Math.round(pose.wind*12)/12,release:Math.round(pose.release*12)/12,hit:Math.round(pose.hit*16)/16};
 // Idle motion has a cyclic key; no unbounded per-frame bitmap allocation.
 q.clock=q.blend?0:Math.round((pose.clock%(Math.PI*2/2.2))*12)/12;
 if(pose.air)q.clock=Math.round((pose.clock%(Math.PI*2/5.8))*12)/12;
 const key=[id,q.phase,q.blend,q.run,q.clock,q.wind,q.release,q.kind,Math.round(q.angle*4),q.hit,Math.round(q.air*4),Math.round(q.travelAngle*4),q.profile.stride,q.profile.arms,q.profile.weight,q.profile.cloth,preferences.quality].join(':');
 let rendered=rigCache.get(key);
 if(!rendered){
  const h=preferences.quality==='smooth'?160:224,w=h*tile.trim.w/tile.trim.h,pad=Math.ceil(h*.3),canvas=document.createElement('canvas');canvas.width=Math.ceil(w+pad*2);canvas.height=h+pad*2;
  const g=canvas.getContext('2d');g.translate(canvas.width/2,h+pad);g.imageSmoothingEnabled=true;
  const cols=4,rows=preferences.quality==='smooth'?5:8,src=[],dst=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=i/cols,v=j/rows;src.push({x:tile.trim.x+u*tile.trim.w,y:tile.trim.y+v*tile.trim.h});dst.push(rigPoint(u,v,q,w,h))}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;triangle(g,tile,src[a],src[b],src[e],dst[a],dst[b],dst[e]);triangle(g,tile,src[a],src[e],src[d],dst[a],dst[e],dst[d])}
  rendered={canvas,w:canvas.width,h:canvas.height,pad,baseHeight:h};rigCache.set(key,rendered);if(rigCache.size>96)rigCache.delete(rigCache.keys().next().value);
 }
 const scale=height/rendered.baseHeight;c.drawImage(rendered.canvas,x-rendered.w*scale/2,y-(rendered.baseHeight+rendered.pad)*scale,rendered.w*scale,rendered.h*scale);return true;
}
function enemyMotionProfile(f){return f.type===3?{stride:85*(f.scale||1),arms:.55,weight:1.5,cloth:1}:f.type===1?motionProfiles[3]:f.type===2?motionProfiles[1]:motionProfiles[2]}
function orientRigPose(pose,flip){return flip?{...pose,angle:Math.PI-pose.angle,travelAngle:Math.PI-pose.travelAngle}:pose}
function stableActorDirection(actor,dx,dy){
 const s=presentationState(actor),angle=Math.atan2(dy,dx);
 if(s.direction!==undefined){const center=Math.PI/2+s.direction*Math.PI/4,diff=Math.atan2(Math.sin(angle-center),Math.cos(angle-center));if(Math.abs(diff)<Math.PI/8+.055)return s.direction}
 return s.direction=directionIndex(dx,dy);
}
