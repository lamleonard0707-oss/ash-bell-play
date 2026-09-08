'use strict';
// Sixth playable class. IDs 0-4 stay put for old saves; the echo is ID 5.
//
// The twist: it is not a person. It is the bell's sound wearing a body, so it has
// no mana pool — it stores 共鳴 (resonance) by landing hits — and every skill it
// casts happens a second time on a delay, from where it stood, at reduced power.
// Playing it well means casting where you *will* want the echo, not where you are.
const echoClass={name:'無名回聲',en:'THE HOLLOW ECHO',color:'#cbd6ff',desc:'鐘聲冇死，佢只係學識咗行路。',tag:'回聲 · 無靈息 · 二次施放',
 note:'冇靈息，靠普攻命中儲共鳴；每個技能三秒後會自動重演一次（半威力）。走位決定第二次打邊。',skill:'初響',hp:118,speed:198,rate:.38,damage:24};
const echoArt=new Image(),echoGaitArt=new Image();
const echoFrames=[],echoGaitFrames=[],echoLogoCanvas=document.createElement('canvas');
let echoReady=false,echoQueue=[],echoCharge=0;
const ECHO_DELAY=3,ECHO_POWER=.5;

skillTrees.push([
 {name:'初響',role:'擴散',cost:26,cd:6,nodes:[['初響','向四周推出一圈聲環，穿透所有敵人並震退。'],['疊響','聲環變兩層，第二層延遲擴散。'],['潰響','三層聲環；最外層造成雙倍傷害。']]},
 {name:'留聲',role:'留置',cost:24,cd:8,nodes:[['留聲','喺瞄準點留低一個聲印，四秒內持續割裂範圍內敵人。'],['共振聲印','範圍擴大，命中回復共鳴。'],['駐留長鳴','持續六秒，結束時爆開。']]},
 {name:'倒帶',role:'位移',cost:22,cd:9,nodes:[['倒帶','記住目前位置，兩秒後可以彈返去，沿途拉扯敵人。'],['雙重倒帶','回程留低一道傷害殘響。'],['時差','回程無敵，並令附近敵人減速。']]}
]);
weaponSets.push([{name:'空鳴指環',effect:'resound',description:'普攻聲波額外穿透一名敵人',power:12},{name:'萬籟歸一',effect:'resound',description:'普攻聲波穿透兩名敵人，回聲威力提高至 65%',power:26}]);

// --- art ----------------------------------------------------------------------
// Its own sheets, not a recolour of another class: no head, no legs, twin bells and
// a ripple base, so the silhouette reads as a different creature at gameplay size.
function prepareEcho(){
 makeGaitFrames(echoArt,3,1,echoFrames);
 makeGaitFrames(echoGaitArt,4,1,echoGaitFrames);
 buildEchoLogos();echoReady=true;lookCache.clear();movingLooks.clear();
}
function buildEchoLogos(){
 const size=209;echoLogoCanvas.width=size*3;echoLogoCanvas.height=size*3;const g=echoLogoCanvas.getContext('2d');
 for(let i=0;i<9;i++){
  const branch=Math.floor(i/3),tier=i%3,x=(i%3)*size,y=Math.floor(i/3)*size;
  g.save();g.translate(x,y);
  const bg=g.createRadialGradient(size/2,size/2,10,size/2,size/2,size*.62);
  bg.addColorStop(0,['#232c52','#22333f','#2b2540'][branch]);bg.addColorStop(1,'#0c0d18');
  g.fillStyle=bg;g.fillRect(0,0,size,size);
  g.strokeStyle='#8fa4e8';g.lineWidth=3;g.globalAlpha=.9;
  g.translate(size/2,size/2);
  if(branch===0){for(let k=0;k<=tier+1;k++){g.globalAlpha=.85-k*.18;g.beginPath();g.arc(0,0,26+k*24,0,7);g.stroke()}}
  else if(branch===1){g.beginPath();g.arc(0,0,30+tier*10,0,7);g.stroke();
   for(let k=0;k<6+tier*3;k++){const a=k*Math.PI*2/(6+tier*3);g.beginPath();g.moveTo(Math.cos(a)*(30+tier*10),Math.sin(a)*(30+tier*10));g.lineTo(Math.cos(a)*(58+tier*14),Math.sin(a)*(58+tier*14));g.stroke()}}
  else{g.beginPath();g.moveTo(-52,34);g.quadraticCurveTo(0,-58-tier*14,52,34);g.stroke();
   for(let k=0;k<=tier;k++){g.globalAlpha=.5-k*.12;g.beginPath();g.moveTo(-44+k*6,40);g.quadraticCurveTo(0,-40-tier*12+k*8,44-k*6,40);g.stroke()}}
  g.globalAlpha=.9;g.fillStyle='#dfe6ff';g.beginPath();g.arc(0,0,6+tier*2,0,7);g.fill();
  g.restore();
 }
}
function drawEchoLogoInto(c,i){const s=echoLogoCanvas.width/3;c.drawImage(echoLogoCanvas,(i%3)*s,Math.floor(i/3)*s,s,s,0,0,80,80)}

// --- resonance ----------------------------------------------------------------
function echoResonanceGain(amount){if(chosen!==5)return;p.mp=Math.min(100,p.mp+amount)}
function echoWeaponBonus(){const w=weaponWithEffect('resound');return w?(w.rarity==='legendary'?2:1):0}
function echoPower(){const w=weaponWithEffect('resound');return w&&w.rarity==='legendary'?.65:ECHO_POWER}
function echoStrike(angle){
 const cl=echoClass,pierce=2+echoWeaponBonus();
 fire(p.x,p.y,angle,cl.damage*gearPower(),430,cl.color,pierce);
 const sh=shots[shots.length-1];sh.echoWave=true;sh.large=false;
 for(const side of [-1,1]){fire(p.x,p.y,angle+side*.11,cl.damage*.4*gearPower(),400,cl.color,pierce);shots[shots.length-1].echoWave=true}
 ring(p.x+Math.cos(angle)*18,p.y+Math.sin(angle)*18,cl.color,26,.18);playSfx('attack',p.x,2);
}
// The signature: replay the cast a few seconds later, from where it was made.
function queueEcho(c){if(chosen!==5||c.isEcho)return;echoQueue.push({c:{...c,isEcho:true},at:elapsed+ECHO_DELAY});echoCharge=1;num(p.x,p.y-100,'回聲已記錄','#cbd6ff')}
function updateEcho(dt){
 if(chosen!==5)return;
 echoCharge=Math.max(0,echoCharge-dt*.5);
 for(let i=echoQueue.length-1;i>=0;i--){
  const q=echoQueue[i];
  if(elapsed>=q.at){
   echoQueue.splice(i,1);
   const c=q.c;ring(c.x,c.y,echoClass.color,150,.7);sparks(c.x,c.y,echoClass.color,20,150);playSfx('echo',c.x);
   const before=damageMult;damageMult*=echoPower();
   try{releaseExpansion(c);emitSkillVisual({...c,ghost:true})}finally{damageMult=before}
  }else groundRing(q.c.x,q.c.y,60+ (1-(q.at-elapsed)/ECHO_DELAY)*70,echoClass.color,.35,2);
 }
}
function releaseEcho(c){
 const r=c.rank,power=gearPower()*(1+(r-1)*.3),b=c.branch;
 if(b===0){
  const layers=Math.min(3,r);
  for(let k=0;k<layers;k++){const radius=120+k*70;
   castFields.push({kind:'danger',x:p.x,y:p.y,r:radius,delay:k*.28,life:2,element:5,damage:(k===layers-1&&r>=3?70:40)*power});
   ring(p.x,p.y,echoClass.color,radius,.5+k*.1)}
  for(const f of foes)if(f.hp>0&&dist(f,p)<150){const a=Math.atan2(f.y-p.y,f.x-p.x);f.x+=Math.cos(a)*70;f.y+=Math.sin(a)*70;confine(f);hit(f,55*power,5)}
  playSfx('echo',p.x);
 }else if(b===1){
  castFields.push({kind:'vortex',x:c.x,y:c.y,r:110+r*28,life:r>=3?6:4,tick:0,damage:18*power,element:5,rank:r,resonant:r>=2});
  ring(c.x,c.y,echoClass.color,110+r*28,.8);
 }else{
  if(!p.rewind){p.rewind={x:p.x,y:p.y,at:elapsed};toast('倒帶已記錄 · 再撳一次返回');ring(p.x,p.y,'#9fb4ff',80,.7)}
  else{
   const from={x:p.x,y:p.y};p.x=p.rewind.x;p.y=p.rewind.y;p.rewind=null;confine(p);cancelMouse();
   if(r>=3){p.inv=1.1;for(const f of foes)if(f.hp>0&&dist(f,p)<200)f.slow=3}
   for(let i=0;i<8;i++){const t=i/7,x=from.x+(p.x-from.x)*t,y=from.y+(p.y-from.y)*t;
    ghosts.push({x,y,dx:p.dx,dy:p.dy,life:.5});
    if(r>=2)castFields.push({kind:'danger',x,y,r:60,delay:.15+i*.05,life:1.4,element:5,damage:24*power})}
   for(const f of foes){const vx=p.x-from.x,vy=p.y-from.y,t=clamp(((f.x-from.x)*vx+(f.y-from.y)*vy)/(vx*vx+vy*vy||1),0,1);
    if(dist(f,{x:from.x+vx*t,y:from.y+vy*t})<90)hit(f,70*power,5)}
   playSfx('rift',p.x);
  }
 }
}
function echoHUD(){const e=$('#satiety');if(chosen!==5)return;e.hidden=false;e.textContent='共鳴 '+Math.floor(p.mp)+' / 100'+(echoQueue.length?' · 回聲 '+echoQueue.length:'')}
function initEcho(){
 let pending=2;const ready=()=>{if(--pending===0)prepareEcho();loaded()};
 echoArt.onload=ready;echoGaitArt.onload=ready;echoArt.onerror=loadError;echoGaitArt.onerror=loadError;
 echoArt.src='echo-hollow.png';echoGaitArt.src='echo-gait.png';
}
