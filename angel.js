'use strict';
// Sixth playable class. IDs 0-4 stay put for old saves; this is ID 5.
//
// 折翼天使 — the broken seraph. It replaced 無名回聲 because Leonard asked for a
// character that flies rather than walks, and because the echo's delayed-recast
// idea never read on screen: you could not see the thing that made it special.
//
// The whole class hangs off one number: 高度 (altitude). On the ground it is an
// ordinary caster. In the air it walks over props, contact attacks pass under it,
// and it moves faster — but flight burns the wing meter that also pays for every
// skill, and arrows hurt more with nothing between you and them. So the class is a
// rhythm: climb, spend, fall, recover. Nothing else in the roster has a resource
// that its own movement consumes.
const angelClass={name:'折翼天使',en:'THE BROKEN SERAPH',color:'#f2ead6',desc:'一邊翼燒剩骨，佢仲係唔肯落地。',tag:'飛行 · 高度 · 羽翼值',
 note:'撳閃避＝起飛／降落。飛緊嘅時候踩過障礙、近身攻擊打唔中你，但飛行同技能都食同一格羽翼值，而且遠程對你傷害加重。',skill:'墜羽',hp:112,speed:192,rate:.4,damage:23};
const angelArt=new Image(),angelGaitArt=new Image();
const angelFrames=[],angelGaitFrames=[],angelLogoCanvas=document.createElement('canvas');
let angelReady=false;
// Altitude is 0 on the ground and 1 at full height; AIRBORNE is where the rules change.
const AIRBORNE=.55,CLIMB_RATE=1.7,FALL_RATE=2.3;
const WING_DRAIN=19,WING_REGEN=14;
let angelFlying=false,angelWingPhase=0,angelHalo=[];

skillTrees.push([
 {name:'墜羽',role:'範圍',cost:24,cd:6,nodes:[
  ['墜羽','向前灑落一列燃燒羽毛，沿途割裂敵人。喺空中放，覆蓋範圍加倍。'],
  ['羽暴','羽毛落地後繼續燃燒四秒。'],
  ['天譴羽雨','三列同時落下，中間一列造成雙倍傷害。']]},
 {name:'斷翼斬',role:'俯衝',cost:26,cd:8,nodes:[
  ['斷翼斬','由高空俯衝去瞄準點，落點震開敵人。用剩幾多高度，就打幾多傷害。'],
  ['裂空斬','俯衝路徑上嘅敵人一齊食刀。'],
  ['墜天','落點留低一道上升氣流（五秒）；企喺入面羽翼值回得極快，可以即刻再飛上去。']]},
 {name:'殘光環',role:'守護',cost:22,cd:9,nodes:[
  ['殘光環','斷開嘅光環繞住你轉，割傷碰到嘅敵人。'],
  ['雙環','兩個環反方向轉，並且擋低敵人嘅子彈。'],
  ['審判之環','擋落嘅子彈化成羽毛射返出去。']]}
]);
weaponSets.push([
 {name:'斷翼之刃',effect:'updraft',description:'普攻命中回復 3 羽翼值',power:14},
 {name:'墜天者',effect:'updraft',description:'普攻命中回復 6 羽翼值；空中普攻多穿透一名敵人',power:28}
]);

// --- art ----------------------------------------------------------------------
// Its own sheets: a floating figure with one ragged wing and one bare bone strut,
// so the silhouette reads as neither a person nor any of the other five.
function prepareAngel(){
 makeGaitFrames(angelArt,3,1,angelFrames);
 makeGaitFrames(angelGaitArt,4,1,angelGaitFrames);
 buildAngelLogos();angelReady=true;lookCache.clear();movingLooks.clear();
}
function buildAngelLogos(){
 const size=209;angelLogoCanvas.width=size*3;angelLogoCanvas.height=size*3;const g=angelLogoCanvas.getContext('2d');
 for(let i=0;i<9;i++){
  const branch=Math.floor(i/3),tier=i%3,x=(i%3)*size,y=Math.floor(i/3)*size;
  g.save();g.translate(x,y);
  const bg=g.createRadialGradient(size/2,size/2,10,size/2,size/2,size*.62);
  bg.addColorStop(0,['#3a3020','#2b2b3c','#3c3428'][branch]);bg.addColorStop(1,'#0d0b09');
  g.fillStyle=bg;g.fillRect(0,0,size,size);
  g.strokeStyle='#f2ead6';g.lineWidth=3;g.globalAlpha=.9;g.translate(size/2,size/2);
  if(branch===0){
   // falling feathers, one more column per tier
   for(let k=0;k<=tier*2+1;k++){const fx=-52+k*(104/Math.max(1,tier*2+1));
    g.beginPath();g.moveTo(fx,-62);g.quadraticCurveTo(fx+9,0,fx,58);g.stroke();
    g.beginPath();g.moveTo(fx,-30);g.lineTo(fx+11,-16);g.moveTo(fx,-4);g.lineTo(fx+11,10);g.stroke()}
  }else if(branch===1){
   // a wing folding into a downward stroke
   g.beginPath();g.moveTo(-56,-46);g.quadraticCurveTo(6,-26,50,54);g.stroke();
   for(let k=0;k<=tier;k++){g.globalAlpha=.75-k*.16;g.beginPath();g.moveTo(-46+k*10,-30);g.quadraticCurveTo(6,-14+k*8,40-k*6,48);g.stroke()}
   g.globalAlpha=.9;g.beginPath();g.moveTo(24,20);g.lineTo(58,58);g.stroke();
  }else{
   // the broken halo, gaining rings
   for(let k=0;k<=tier;k++){g.globalAlpha=.85-k*.2;g.beginPath();g.arc(0,0,32+k*20,.5,Math.PI*2-.5);g.stroke()}
  }
  g.globalAlpha=.92;g.fillStyle='#fff6e2';g.beginPath();g.arc(0,0,5+tier*2,0,7);g.fill();
  g.restore();
 }
}
function drawAngelLogoInto(c,i){const s=angelLogoCanvas.width/3;c.drawImage(angelLogoCanvas,(i%3)*s,Math.floor(i/3)*s,s,s,0,0,80,80)}

// --- altitude -----------------------------------------------------------------
// What this class calls the blue orb and the dash key. Everything that writes
// player-facing text asks these instead of hard-coding 靈息 / 閃避.
function resourceName(){return chosen===5?'羽翼':'靈息'}
function dashLabel(){return chosen===5?(angelFlying?'降落':'起飛'):'閃避'}
function angelAltitude(){return (p&&p.altitude)||0}
function angelAirborne(){return chosen===5&&angelAltitude()>AIRBORNE}
function angelToggleFlight(){
 if(chosen!==5||mode!=='play')return false;
 if(!angelFlying&&p.mp<12){toast('羽翼值不足 · 落地唞返先');return true}
 angelFlying=!angelFlying;
 ring(p.x,p.y,angelClass.color,angelFlying?70:40,.35);
 sparks(p.x,p.y-(angelFlying?10:30),angelClass.color,10,angelFlying?70:45);
 playSfx(angelFlying?'dash':'step-soft',p.x);
 return true;
}
function updateAngel(dt){
 if(chosen!==5||!p)return;
 if(p.altitude===undefined)p.altitude=0;
 // Flight and every skill are paid out of the same meter, so a long climb is a
 // decision not to cast. Running it dry drops you out of the sky.
 if(angelFlying){
  p.mp=Math.max(0,p.mp-WING_DRAIN*dt);
  if(p.mp<=0){angelFlying=false;toast('羽翼值耗盡 · 墜落')}
 }else if(p.altitude<=0){
  p.mp=Math.min(100,p.mp+WING_REGEN*dt*(heroMotion?.55:1));
 }
 const target=angelFlying?1:0;
 p.altitude=clamp(p.altitude+(target-p.altitude)*Math.min(1,dt*(angelFlying?CLIMB_RATE:FALL_RATE)),0,1);
 if(p.altitude<.002)p.altitude=0;
 // 墜天 leaves an updraft at the landing point. Nothing in expansion.js knows the
 // kind, so it is the class's job to make it do something: standing in one refills
 // the wing meter fast enough to climb straight back out of the dive.
 if(angelInUpdraft()){p.mp=Math.min(100,p.mp+42*dt);if(!angelFlying&&p.mp>25)p.altitude=Math.max(p.altitude,.35)}
 angelWingPhase+=dt*(angelFlying?7.5:3.2);
 if(angelAirborne()&&Math.random()<dt*7)particles.push({x:p.x+rnd(-22,22),y:p.y-rnd(20,70),z:rnd(6,26),vx:rnd(-16,16),vy:rnd(4,26),vz:-rnd(10,30),life:rnd(.5,1),color:angelClass.color,size:rnd(1,2.4)});
 updateAngelHalo(dt);
}
function angelInUpdraft(){for(const z of castFields)if(z.kind==='updraft'&&Math.hypot(z.x-p.x,z.y-p.y)<z.r)return true;return false}
function angelSpeedMult(){return angelAirborne()?1.18:1}
// How high the sprite is drawn, and how far the shadow shrinks under it.
function angelLift(){return angelAltitude()*46+(chosen===5?Math.sin(angelWingPhase)*2.5*(0.4+angelAltitude()):0)}
function angelWingFrame(){return ((Math.floor(angelWingPhase/Math.PI*2)%4)+4)%4}

// --- the halo -----------------------------------------------------------------
function updateAngelHalo(dt){
 for(let i=angelHalo.length-1;i>=0;i--){
  const h=angelHalo[i];h.life-=dt;if(h.life<=0){angelHalo.splice(i,1);continue}
  h.a+=h.spin*dt;
  const r=h.r*(angelAirborne()?1.35:1),x=p.x+Math.cos(h.a)*r,y=p.y+Math.sin(h.a)*r*.6-30;
  h.x=x;h.y=y;h.tick-=dt;
  if(h.tick<=0){h.tick=.28;for(const f of foes)if(f.hp>0&&Math.hypot(f.x-x,f.y-y)<52+f.r)hit(f,h.damage,5)}
  if(h.block)for(let s=shots.length-1;s>=0;s--){const sh=shots[s];
   if(!sh.enemy||Math.hypot(sh.x-x,sh.y-y)>54)continue;
   shots.splice(s,1);sparks(x,y,angelClass.color,6,70);
   if(h.reflect)fire(x,y,Math.atan2(p.y-sh.y,p.x-sh.x)+Math.PI,h.damage*1.4,420,angelClass.color,1);
  }
 }
}
function drawAngelHalo(c){
 for(const h of angelHalo){
  c.save();c.globalAlpha=Math.min(1,h.life)*.8;c.strokeStyle=angelClass.color;c.lineWidth=3;c.shadowColor=angelClass.color;c.shadowBlur=10;
  c.beginPath();c.ellipse(h.x,h.y,26,10,h.a,.4,Math.PI*2-.4);c.stroke();c.restore();
 }
}

// --- attack -------------------------------------------------------------------
function angelWeaponBonus(){const w=weaponWithEffect('updraft');return w?(w.rarity==='legendary'?6:3):0}
function angelStrike(angle){
 const cl=angelClass,air=angelAirborne(),pierce=air&&weaponWithEffect('updraft')?.rarity==='legendary'?1:0;
 const spread=air?[-.16,0,.16]:[0];
 for(const off of spread)fire(p.x,p.y,angle+off,cl.damage*gearPower()*(air?.72:1),460,cl.color,pierce);
 for(const sh of shots.slice(-spread.length))sh.feather=true;
 ring(p.x+Math.cos(angle)*18,p.y+Math.sin(angle)*18-angelLift(),cl.color,22,.16);playSfx('attack',p.x,2);
}
// Landing a hit feeds the wing meter back, which is the only way to cast while flying.
function angelStrikeLanded(){if(chosen!==5)return;const gain=angelWeaponBonus();if(gain)p.mp=Math.min(100,p.mp+gain)}

// --- skills -------------------------------------------------------------------
function releaseAngel(c){
 const r=c.rank,power=gearPower()*(1+(r-1)*.3),b=c.branch,air=angelAirborne();
 if(b===0){
  // 墜羽: lines of burning feathers laid down ahead of you. Height widens the fall.
  const lanes=r>=3?[-1,0,1]:[0],reach=air?900:520,width=air?150:96;
  const a=Math.atan2(c.dy||p.dy,c.dx||p.dx);
  for(const lane of lanes)for(let i=0;i<7;i++){
   const t=(i+1)/7,d=reach*t;
   const x=p.x+Math.cos(a)*d-Math.sin(a)*lane*width,y=p.y+Math.sin(a)*d+Math.cos(a)*lane*width;
   castFields.push({kind:'danger',x,y,r:width*.72,delay:t*.35,life:r>=2?4:1.4,element:5,damage:(lane===0&&r>=3?52:34)*power});
   if(r>=2)burnZones.push({x,y,r:width*.6,life:4,tick:.4,damage:7*power});
  }
  playSfx('cast',p.x,5);
 }else if(b===1){
  // 斷翼斬: the dive. It spends the altitude it is paid in, which is the point.
  const height=Math.max(.25,angelAltitude()),to={x:c.x,y:c.y};
  const from={x:p.x,y:p.y};confine(to);
  p.x=to.x;p.y=to.y;confine(p);cancelMouse();
  angelFlying=false;p.altitude=0;
  const blow=(70+height*140)*power;
  for(const f of foes){
   if(f.hp<=0)continue;
   const d=dist(f,p);
   if(d<190){hit(f,blow,5);const a=Math.atan2(f.y-p.y,f.x-p.x);f.x+=Math.cos(a)*(70+height*60);f.y+=Math.sin(a)*(70+height*60);confine(f);if(r>=3)f.frozen=Math.max(f.frozen||0,.9)}
   else if(r>=2){
    const vx=to.x-from.x,vy=to.y-from.y,t=clamp(((f.x-from.x)*vx+(f.y-from.y)*vy)/(vx*vx+vy*vy||1),0,1);
    if(dist(f,{x:from.x+vx*t,y:from.y+vy*t})<95)hit(f,blow*.55,5);
   }
  }
  ring(p.x,p.y,angelClass.color,190,.6);sparks(p.x,p.y,angelClass.color,22,190);shake=9;
  if(r>=3)castFields.push({kind:'updraft',x:p.x,y:p.y,r:120,life:5,element:5,damage:0});
  playSfx('impact',p.x,3);
 }else{
  // 殘光環: the broken halo comes off and orbits. Two rings at 2, reflecting at 3.
  const count=r>=2?2:1;
  for(let k=0;k<count;k++)angelHalo.push({a:k*Math.PI,spin:(k%2?-1:1)*2.4,r:104,x:p.x,y:p.y,tick:0,
   life:r>=3?9:6,damage:20*power,block:r>=2,reflect:r>=3});
  ring(p.x,p.y,angelClass.color,110,.5);playSfx('cast',p.x,5);
 }
}
function angelHUD(){
 const e=$('#satiety');if(chosen!==5)return;
 e.hidden=false;
 e.textContent='羽翼 '+Math.floor(p.mp)+' / 100 · '+(angelAirborne()?'飛行中 '+Math.round(angelAltitude()*100)+'%':angelFlying?'起飛中':'地面');
 // The orb is the wing meter for this class, so it must not keep saying 靈息.
 const label=$('#mplabel');if(label&&label.textContent!=='羽翼')label.textContent='羽翼';
}
function resetAngel(){angelFlying=false;angelWingPhase=0;angelHalo.length=0;if(p)p.altitude=0}
function initAngel(){
 let pending=2;const ready=()=>{if(--pending===0)prepareAngel();loaded()};
 angelArt.onload=ready;angelGaitArt.onload=ready;angelArt.onerror=loadError;angelGaitArt.onerror=loadError;
 angelArt.src='angel-fallen.png';angelGaitArt.src='angel-gait.png';
}
