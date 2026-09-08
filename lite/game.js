'use strict';
const $=s=>document.querySelector(s), canvas=$('#game'),ctx=canvas.getContext('2d');
const classes=[{name:'燼鈴師',en:'EMBER CHIMIST',color:'#efb268',desc:'以餘燼鑄鐘，化聲為刃。',tag:'中距離 · 音波爆發',note:'共鳴：蓄力引爆焚鐘，八道火柱震退異物，地面持續燃燒。',skill:'焚鐘共鳴',hp:120,speed:185,rate:.42,damage:22},{name:'骨植者',en:'MARROW GARDENER',color:'#a7d79d',desc:'在荒骨之上，種下新生。',tag:'遠距離 · 骨芽守護',note:'骨庭：骨刺破地纏住異物，留下三株追擊骨芽，並回復生命。',skill:'白骨花庭',hp:140,speed:170,rate:.52,damage:27},{name:'裂墨客',en:'RIFT SCRIBE',color:'#aeb9ff',desc:'撕開墨痕，改寫虛空。',tag:'高機動 · 穿透墨刃',note:'裂頁：蓄力撕開虛空，向八方射出巨大墨刃，留下閃避殘影。',skill:'萬象裂頁',hp:100,speed:215,rate:.3,damage:18},{name:'霜契衛',en:'FROSTBOUND WARDEN',color:'#92d5ea',desc:'以寒霜立契，守住最後一道門。',tag:'控場 · 冰槍與誓盾',note:'冰槍扇射、寒潮凍結、誓盾守護；三條分支自由配搭。',skill:'冰契槍陣',hp:155,speed:175,rate:.48,damage:25},bloodMonkClass,angelClass];
let chosen=0,mode='select',W=0,H=0,dpr=1,time=0,elapsed=0,last=0,p,foes=[],shots=[],effects=[],drops=[],turrets=[],hazards=[],numbers=[],kills=0,wave=0,waveSpawn=0,spawnTimer=0,rest=0,bossSpawned=false,toastTime=0,attackHeld=false,keys={},joy={x:0,y:0,id:null},cam={x:0,y:0},shake=0,muted=true,audioCtx,skillCD=0,dashCD=0,attackCD=0,level=1,xp=0,xpNeed=experienceRequired(1),damageMult=1,speedMult=1,potions=3,pendingUpgrade=0;
const world={w:2160,h:1440}, bg=new Image(), heroArt=new Image(), monsterArt=new Image(), fxArt=new Image(), propArt=new Image();
const heroFrames=[],monsterFrames=[],fxFrames=[],propFrames=[],particles=[],corpses=[],ghosts=[],vfx=[],burnZones=[],casts=[],scorches=[],props=[],lightCache=new Map();
let damageFlash=0,uiTick=0;
const roster=$('#roster'),rc=roster.getContext('2d'),mini=$('#map'),mc=mini.getContext('2d');
let ready=0,assetsReady=false,impactFreeze=0,walkPhase=0,heroMotion=0,rosterChoice=0;
const ui={hp:$('#hp'),mp:$('#mp'),level:$('#level'),xp:$('#xp'),timer:$('#timer'),chapter:$('#chapter'),objective:$('#objective'),progress:$('#progress'),skill:$('#skill em'),dash:$('#dash em'),potion:$('#potion span'),health:$('.health'),mana:$('.mana')};
function atlas(img,cols,rows,regions=null){
 const off=document.createElement('canvas');off.width=img.naturalWidth;off.height=img.naturalHeight;
 const c=off.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0);
 if(img===heroArt||img===monsterArt)keyAtlasBackdrop(c,off.width,off.height);
 const pix=c.getImageData(0,0,off.width,off.height).data,out=[],cw=off.width/cols,ch=off.height/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const box=regions?.[row*cols+col];const sx=box?box[0]:Math.floor(col*cw),sy=box?box[1]:Math.floor(row*ch),ex=box?box[2]:Math.floor((col+1)*cw),ey=box?box[3]:Math.floor((row+1)*ch);
  let minx=ex,miny=ey,maxx=sx,maxy=sy;
  for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++)if(pix[(y*off.width+x)*4+3]>90){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y)}
  minx=Math.max(sx,minx-2);miny=Math.max(sy,miny-2);maxx=Math.min(ex,maxx+3);maxy=Math.min(ey,maxy+3);
  const f={x:minx,y:miny,w:Math.max(1,maxx-minx),h:Math.max(1,maxy-miny)};const tile=document.createElement('canvas');const ratio=Math.min(1,480/f.h);tile.width=Math.ceil(f.w*ratio);tile.height=Math.ceil(f.h*ratio);tile.getContext('2d').drawImage(off,f.x,f.y,f.w,f.h,0,0,tile.width,tile.height);f.tile=tile;out.push(f);
 }return out;
}
function loaded(){ready++;if(ready===42){assetsReady=true;$('#start').disabled=false;$('#starttext').textContent='踏入聖所';drawRoster();drawSkillIcon()}}
function loadError(){ $('#starttext').textContent='圖片未能載入，請重新開啟'; }
bg.onload=()=>{document.documentElement.style.setProperty('--stone',`url("${bg.src}")`);loaded()};bg.onerror=loadError;
heroArt.onload=()=>{heroFrames.push(...atlas(heroArt,4,3,[[0,0,399,382],[400,0,714,376],[718,0,1082,381],[1083,0,1448,381],[0,367,399,720],[400,368,714,723],[718,365,1082,723],[1083,365,1448,723],[0,720,399,1086],[400,716,714,1086],[718,718,1082,1086],[1083,712,1448,1086]]));loaded()};heroArt.onerror=loadError;
monsterArt.onload=()=>{monsterFrames.push(...atlas(monsterArt,4,2,[[0,0,444,459],[445,0,887,459],[888,0,1330,459],[1331,0,1774,474],[0,460,444,887],[445,460,887,887],[888,460,1330,887],[1331,472,1774,887]]));loaded()};monsterArt.onerror=loadError;
fxArt.onload=()=>{fxFrames.push(...atlas(fxArt,4,3,Array.from({length:12},(_,i)=>[i%4*384,[0,375,705][Math.floor(i/4)],(i%4+1)*384,[375,705,1024][Math.floor(i/4)]])));loaded()};fxArt.onerror=loadError;
propArt.onload=()=>{propFrames.push(...atlas(propArt,4,2,[[0,95,449,563],[450,0,754,573],[766,75,1178,559],[1182,10,1536,572],[0,575,379,1002],[380,666,757,1024],[753,575,1190,1024],[1194,600,1536,1024]]));loaded()};propArt.onerror=loadError;
wardrobeArt.onload=()=>{prepareWardrobe();loaded()};wardrobeArt.onerror=loadError;skillLogoArt.onload=()=>{logosReady=true;loaded()};skillLogoArt.onerror=loadError;wardrobeArt.src='wardrobe.png';skillLogoArt.src='skill-logos.png';
frostFloor.onload=loaded;frostFloor.onerror=loadError;bellFloor.onload=loaded;bellFloor.onerror=loadError;lootArt.onload=()=>{prepareLoot();loaded()};lootArt.onerror=loadError;frostFloor.src='frost-floor.png';bellFloor.src='bell-floor.png';lootArt.src='loot-items.png';
monkArt.onload=()=>{prepareMonk();loaded()};monkArt.onerror=loadError;monkLogoArt.onload=()=>{monkLogosReady=true;loaded()};monkLogoArt.onerror=loadError;monkArt.src='blood-monk.png';monkLogoArt.src='monk-skills.png';
gaitArt.onload=()=>{makeGaitFrames(gaitArt,5,4,gaitFrames);loaded()};gaitArt.onerror=loadError;enemyGaitArt.onload=()=>{makeGaitFrames(enemyGaitArt,4,4,enemyGaitFrames);loaded()};enemyGaitArt.onerror=loadError;gaitArt.src='heroes-gait.png';enemyGaitArt.src='enemies-gait.png';
fxArt.src='effects.png';propArt.src='props.png';
bg.src='arena.png';heroArt.src='heroes.png';monsterArt.src='monsters.png';
function confine(obj){
 if(exploring||routeStage>=3){obj.x=clamp(obj.x,96,world.w-96);obj.y=clamp(obj.y,132,world.h-96)}
 else{obj.y=clamp(obj.y,330,1310);const upper=obj.y<760,t=upper?(obj.y-330)/430:(obj.y-760)/550,left=upper?650-480*t:170+230*t,right=upper?1510+480*t:1990-240*t;obj.x=clamp(obj.x,left,right)}
 if(obj===p&&angelAirborne())return;
 for(const o of propsNear(obj.x,obj.y)){if(o.broken||o.r===0)continue;const vx=obj.x-o.x,vy=(obj.y-o.y)/.65,d=Math.hypot(vx,vy),r=o.r+(obj.r||13)*.65;if(d<r&&d>.01){obj.x=o.x+vx/d*r;obj.y=o.y+vy/d*r*.65}}}
function sparks(x,y,col,count=12,power=95){if(preferences.quality==='smooth')count=Math.ceil(count*.45);if(particles.length>(preferences.quality==='smooth'?180:500))particles.splice(0,particles.length-(preferences.quality==='smooth'?130:350));for(let i=0;i<count;i++){const a=rnd(0,Math.PI*2),v=rnd(power*.3,power);particles.push({x,y,z:rnd(10,45),vx:Math.cos(a)*v,vy:Math.sin(a)*v*.55,vz:rnd(20,90),life:rnd(.3,.7),color:col,size:rnd(1,3)})}}
function glow(c,x,y,r,col,alpha=.35){let light=lightCache.get(col);if(!light){light=document.createElement('canvas');light.width=96;light.height=96;const lc=light.getContext('2d'),g=lc.createRadialGradient(48,48,0,48,48,48);g.addColorStop(0,col);g.addColorStop(1,'transparent');lc.fillStyle=g;lc.fillRect(0,0,96,96);lightCache.set(col,light)}c.save();c.globalCompositeOperation='lighter';c.globalAlpha=alpha;c.drawImage(light,x-r,y-r,r*2,r*2);c.restore()}
function drawSprite(c,img,f,x,y,h,flip=false){if(!f||!img.complete)return;const w=h*f.w/f.h;c.save();c.translate(x,y);if(flip)c.scale(-1,1);if(f.tile)c.drawImage(f.tile,-w*.5,-h,w,h);else c.drawImage(img,f.x,f.y,f.w,f.h,-w*.5,-h,w,h);c.restore()}
function facing(dx,dy){return {row:dy<-.35?2:Math.abs(dx)>Math.abs(dy)*1.4?1:0,flip:dx<0}}

function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,preferences.quality==='smooth'?1:1.5);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);applyControls()}addEventListener('resize',resize);resize();
const rnd=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function tone(freq=220,length=.08,type='sine',volume=.04){if(!muted&&soundscape)synth(freq,length,volume,type,null,0,freq*.65)}
function ring(x,y,color,r=70,life=.45){effects.push({x,y,color,r,life,max:life})}function num(x,y,text,color='#f1d69c'){const near=numbers.filter(n=>Math.abs(n.x-x)<45&&Math.abs(n.y-y)<90).length;numbers.push({x:x+(near%3-1)*17,y:y-Math.min(near,5)*17,text,color,life:.8})}function toast(text){$('#toast').textContent=text;$('#toast').style.opacity=1;toastTime=3}
function figure(c,x,y,id,t=0,scale=1,dx=1,dy=1,action=0){
 if(!heroFrames.length)return;
 const f=facing(dx,dy),h=91*scale,bob=0;
 const hover=(p&&id===chosen&&id===5)?angelLift()*scale:0;
 const stepping=p&&id===chosen&&heroMotion?Math.abs(Math.sin(walkPhase)):0,lift=hover,lean=0;
 const air=hover/46;
 c.save();c.fillStyle='#080503';c.globalAlpha=Math.max(.08,.44*(1-stepping*3.2/9)*(1-air*.62));c.beginPath();c.ellipse(x,y+1,18*scale*(1-stepping*.1)*(1-air*.34),7*scale*(1-stepping*.14)*(1-air*.34),0,0,7);c.fill();c.globalAlpha=1;
 if(action>0){glow(c,x+dx*20,y-30,45,classes[id].color,.25)}
 c.translate(x,y-lift);c.rotate(lean);
 if(!(p&&id===chosen&&(drawDirectionalHero(c,0,0,h,dx,dy)||(heroMotion?drawGait(c,0,0,h,f.flip):drawDress(c,0,bob,h,f.flip)))))drawSprite(c,heroArt,heroFrames[f.row*4+id],action>0?dx*Math.sin(action*22)*4:0,bob,h,f.flip);c.restore();
}
function drawRoster(){drawArcRoster()}
classes.forEach((cl,i)=>{const b=document.createElement('button');b.className='classcard'+(i===0?' active':'');b.setAttribute('aria-pressed',i===0?'true':'false');b.innerHTML=`<small>${cl.en}</small><h3>${cl.name}</h3><p>${cl.tag}</p>`;
 b.onclick=()=>{chosen=i;document.querySelectorAll('.classcard').forEach((e,j)=>{e.classList.toggle('active',i===j);e.setAttribute('aria-pressed',i===j?'true':'false')});$('#note').textContent=cl.note;drawRoster();drawSkillIcon();tone(330+i*90)};$('#classes').append(b)});$('#note').textContent=classes[0].note;
function reset(){if(typeof ensureHeroDirections==='function')ensureHeroDirections(chosen);resetBuildcraft();heroMotion=false;heroTravelSpeed=0;walkPhase=0;footStepIndex=-1;movingLooks.clear();pendingChapter=-1;runOutcome=null;saveClock=0;const cl=classes[chosen];p={x:500,y:1020,hp:cl.hp,maxhp:cl.hp,mp:100,inv:0,boost:0,dx:1,dy:1,action:0,curse:0};resetEquipment();corpses.length=0;particles.length=0;ghosts.length=0;impactFreeze=0;vfx.length=0;casts.length=0;burnZones.length=0;scorches.length=0;damageFlash=0;initProps();foes=[];shots=[];effects=[];drops=[];turrets=[];hazards=[];numbers=[];kills=0;elapsed=0;wave=0;waveSpawn=0;spawnTimer=1;rest=2;bossSpawned=false;skillCD=0;dashCD=0;attackCD=0;level=1;xp=0;xpNeed=experienceRequired(1);damageMult=1;speedMult=1;potions=3;pendingUpgrade=0;mode='play';$('#select').hidden=true;$('#modal').hidden=true;$('#hud').hidden=false;$('#bossbar').hidden=true;$('#classlabel').textContent=cl.name;{const label=$('#mplabel');if(label)label.textContent=chosen===5?'羽翼':'靈息'}$('#skill span').textContent=cl.skill;resetExpansion();resetCampaign();toast('先分配兩點技能 · 擊敗守軍，再挑戰本圖首領');updateHUD()}
$('#start').onclick=()=>{if(!assetsReady)return;if(preferences.sound)ensureAudio();reset();syncAudio();tone(180,.6)};
function spawn(type){let spot;for(let tries=0;tries<12;tries++){const a=rnd(0,Math.PI*2),r=rnd(290,420);spot={x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};confine(spot);if(dist(spot,p)>220)break}const x=spot.x,y=spot.y;const spec=[{hp:46,speed:64,r:17,color:'#d5ba8d',name:'折面蛾'},{hp:92,speed:43,r:22,color:'#9aaa81',name:'囊足甕'},{hp:66,speed:47,r:18,color:'#bd9ccc',name:'鏡脊浮游'}][type];foes.push({...spec,maxhp:spec.hp*(1+wave*.14),hp:spec.hp*(1+wave*.14),x,y,type,hit:0,attack:rnd(1,3),phase:rnd(0,6),action:0,state:'emerge',stateT:.6,walk:0,windup:0,burn:0,burnTick:0,scale:rnd(.9,1.1)});modifyEnemy(foes[foes.length-1]);ring(x,y,'#ba8458',35,.7)}
function nextWave(){if((wave===2||wave===4)&&routeStage<wave/2){queueChapter(wave/2);return}wave++;if(wave<=6){waveSpawn=12+wave*5;spawnTimer=.5;toast(['','第一波 · 折面甦醒','第二波 · 甕中低語','第三波 · 鏡脊入侵','第四波 · 灰燼洶湧','第五波 · 失聲潮汐','第六波 · 鐘前守衛'][wave]);p.hp=Math.min(p.maxhp,p.hp+20);p.mp=100}else{bossSpawned=true;foes.push({x:1080,y:370,type:3,r:55,hp:2800,maxhp:2800,speed:35,color:'#cfa879',attack:3,phase:0,hit:0,state:'seek',stateT:0,walk:0,windup:0,scale:1,burn:0,burnTick:0,name:'噤聲母鐘'});toast('噤聲母鐘 · 勿站喺裂環之中');$('#bossbar').hidden=false;playSfx('boss',1080)}}
function nearest(x=p.x,y=p.y){let best=null,dd=Infinity;for(const f of foes){const d=Math.hypot(f.x-x,f.y-y);if(f.hp>0&&d<dd){dd=d;best=f}}return best}
function fire(x,y,angle,damage,speed,color,pierce=0){shots.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage,color,life:1.5,pierce,hit:new Set(),enemy:false,element:playerElement(),trail:[],rotation:angle})}
// BUG-002: shots used to snap onto nearest() with no range, angle or line-of-sight
// limit, so missing was impossible. Manual aim now leads; a narrow assist cone helps,
// and moving costs accuracy so standing still is a real choice.
function angleDelta(from,to){return ((to-from+Math.PI*3)%(Math.PI*2))-Math.PI}
function aimSpread(){const steady=walkMode||keys.shift;return (heroMotion?(steady?.042:.078):.03)*(chosen===2?1.25:1)}
function aimAngle(){
 const locked=mouseControl.enemy?.hp>0?mouseControl.enemy:null;
 if(locked)return Math.atan2(locked.y-p.y,locked.x-p.x);
 const cur=typeof cursorAim==='function'?cursorAim():null;
 if(!cur){const n=nearest();return n?Math.atan2(n.y-p.y,n.x-p.x):Math.atan2(p.dy,p.dx)}
 let a=Math.atan2(cur.dy,cur.dx),best=null,bestDiff=.21;
 for(const f of foes){if(f.hp<=0||dist(f,p)>380)continue;const diff=Math.abs(angleDelta(a,Math.atan2(f.y-p.y,f.x-p.x)));if(diff<bestDiff){bestDiff=diff;best=Math.atan2(f.y-p.y,f.x-p.x)}}
 if(best!==null)a+=angleDelta(a,best)*.55;
 return a;
}
function attack(){if(mode!=='play'||attackCD>0)return;attackCD=classes[chosen].rate/(speedMult*(1+(gearStats().haste+attrHaste())/100));p.action=.26;const a=aimAngle()+rnd(-1,1)*aimSpread();p.dx=Math.cos(a);p.dy=Math.sin(a);const cl=classes[chosen];beginActorGesture(p,chosen===4||chosen===5?'strike':'cast',a,.3);if(chosen===4){monkStrike(a);emitSkillVisual({type:4,branch:0,rank:1,x:p.x,y:p.y,dx:p.dx,dy:p.dy,melee:true});return}
 if(chosen===5){angelStrike(a);emitSkillVisual({type:5,branch:0,rank:1,x:p.x,y:p.y,dx:p.dx,dy:p.dy,melee:true});return}fire(p.x,p.y,a,cl.damage*gearPower(),chosen===1?390:480,cl.color,chosen===2?2+(weaponWithEffect('cleave')?2:0):0);if(chosen===2&&weaponWithEffect('cleave')?.rarity==='legendary'){for(const side of [-1,1])fire(p.x,p.y,a+side*.16,cl.damage*.55*gearPower(),480,cl.color,1)}if(chosen===0){fire(p.x,p.y,a-.14,cl.damage*.45*gearPower(),450,cl.color);fire(p.x,p.y,a+.14,cl.damage*.45*gearPower(),450,cl.color)}ring(p.x+Math.cos(a)*20,p.y+Math.sin(a)*20,cl.color,20,.15);playSfx('attack',p.x,chosen)}
function hit(f,d,element=playerElement()){if(f.hp<=0)return;d=buildDamage(f,adjustedDamage(f,d,element));angelStrikeLanded();f.hp-=d;f.hit=.12;f.recoil=.16;impactFreeze=.015;playSfx('impact',f.x,f.type);sparks(f.x,f.y,f.color,5,80);num(f.x+rnd(-8,8),f.y-65,Math.round(d));if(f.hp<=0){corpses.push({...f,fade:16,deathAge:0,facing:f.facing??Math.atan2(p.y-f.y,p.x-f.x)});scorches.push({x:f.x,y:f.y,r:f.r*1.4,life:24,color:'#130b08'});sparks(f.x,f.y,f.color,15,130);kills++;enemyDeath(f);if(f.type!==3&&!f.elite&&Math.random()<.06)equipmentDrop(f.x,f.y);collectExperience(campaignExperience(f));ring(f.x,f.y,f.color,40);if(Math.random()<.14)drops.push({x:f.x,y:f.y,type:'heal',life:25});if(Math.random()<.12)drops.push({x:f.x+12,y:f.y,type:'mana',life:25});if(f.type===3){for(let i=0;i<3;i++)drops.push({x:f.x+(i-1)*34,y:f.y+12,type:'potion',life:180})}else if(Math.random()<(f.elite?.24:.05))drops.push({x:f.x-14,y:f.y,type:'potion',life:45});if(f.type===3){campaignBossDefeated(f);return}tone(110,.12,'triangle',.015)}}
function skill(target=null){castExpansion(target)}
function releaseSkill(c){const actual=c.rank;releaseExpansion({...c,rank:Math.min(3,actual)});releaseMastery(c);emitSkillVisual(c)}
function releaseLegacySkill(c){const col=classes[c.type].color;const rankPower=1+((c.rank||1)-1)*.3;shake=7;playSfx('cast',c.x,c.type);
 if(c.type===0){addVFX(0,c.x,c.y,265,1.15);sparks(c.x,c.y,col,35,220);ring(c.x,c.y,'#edb77d',260,.65);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,r=125+i%2*55,x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r*.68;addVFX(0,x,y,155,.95,i*.035);burnZones.push({x,y,r:52,life:3.3,tick:0});scorches.push({x,y,r:37,life:28,color:'#190c05'});}
  for(const f of foes)if(dist(c,f)<270){hit(f,95*gearPower()*rankPower);f.burn=3;f.x+=(f.x-c.x)*.18;f.y+=(f.y-c.y)*.18;confine(f)}
  for(const o of props)if(dist(c,o)<260)hitProp(o,100);
 }else if(c.type===1){p.hp=Math.min(p.maxhp,p.hp+((c.rank||1)===3?44:22));for(let i=0;i<5;i++){let a=i*Math.PI*2/5,x=c.x+Math.cos(a)*115,y=c.y+Math.sin(a)*80;addVFX(1,x,y,170,1.3,i*.055);if(i<3)turrets.push({x,y,life:10,attack:i*.2});for(const f of foes)if(dist({x,y},f)<80){hit(f,50*gearPower()*rankPower);f.slow=3}}
  ring(c.x,c.y,'#c3d0a2',150,.8);sparks(c.x,c.y,col,25,130);
 }else{addVFX(2,c.x,c.y,270,1.05);for(let i=0;i<16;i++){const a=c.aimed?Math.atan2(c.dy,c.dx)+(i-7.5)*.105:i*Math.PI/8;fire(c.x,c.y,a,60*gearPower()*rankPower,500,col,7);shots[shots.length-1].large=true;}p.boost=3;p.inv=.8;for(let i=1;i<6;i++)ghosts.push({x:c.x-c.dx*i*23,y:c.y-c.dy*i*23,dx:c.dx,dy:c.dy,life:.65-i*.05});sparks(c.x,c.y,col,28,170)}
}
function dash(){if(mode!=='play'||dashCD>0)return;if(chosen===5){if(angelToggleFlight())dashCD=.45;return}cancelMouse();dashCD=2.4;p.inv=.65;const dashStart={x:p.x,y:p.y};for(let i=0;i<4;i++)ghosts.push({x:p.x+p.dx*i*27,y:p.y+p.dy*i*27,dx:p.dx,dy:p.dy,life:.32-i*.035});let dx=joy.x||((keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)),dy=joy.y||((keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0));if(!dx&&!dy){dx=p.dx;dy=p.dy}const l=Math.hypot(dx,dy)||1;ring(p.x,p.y,classes[chosen].color,45,.3);p.x=clamp(p.x+dx/l*135,120,world.w-120);p.y=clamp(p.y+dy/l*135,200,world.h-130);confine(p);if(equipped.amulet?.effect==='trail'){for(let i=0;i<5;i++)dashFields.push({x:dashStart.x+(p.x-dashStart.x)*i/4,y:dashStart.y+(p.y-dashStart.y)*i/4,dx:p.dx,dy:p.dy,type:chosen,life:3,tick:.2})}sparks(p.x,p.y,classes[chosen].color,13,100);playSfx('dash',p.x)}
// BUG-005: potions were handed out once (3) and never replenished. The belt slot
// now sets the carry cap and enemies drop refills.
function potionCap(){return Math.min(9,3+Math.round((gearStats().potion||0)/10))}
function potion(){if(mode!=='play'||potions<=0||p.hp>=p.maxhp)return;potions--;p.hp=Math.min(p.maxhp,p.hp+p.maxhp*.55*(1+gearStats().potion/100)*(p.curse>0?.5:1));ring(p.x,p.y,'#e97979',75);num(p.x,p.y-20,'回復','#9fe0a1');tone(580,.2)}
// BUG-006: damage over time must not grant invulnerability frames. Direct hits
// still use p.inv; ticking sources pass {dot:true} and neither read nor set it.
function hurt(d,ailment,opts){const dot=!!(opts&&opts.dot);if(mode!=='play')return;if(!dot&&p.inv>0)return;
 if(angelAirborne()){if(opts&&opts.contact){num(p.x,p.y-110,'落空','#f2ead6');return}if(!dot)d*=1.25}if(ailment==='frost')p.chill=2.5;if(ailment==='venom'){p.poison=4;p.poisonTick=1}d*=difficulty().damage*tierSpec().damage;d*=(equipped.amulet?.effect==='guard'?.88:1)*(1-Math.min(60,gearStats().armor+attrArmor())/100);const absorb=Math.min(p.shield||0,d);p.shield=Math.max(0,(p.shield||0)-absorb);p.hp-=d-absorb;if(!dot)p.inv=.32;damageFlash=dot?.28:.55;shake=dot?2:6;ring(p.x,p.y,dot?'#9ac25a':'#dc6554',dot?20:30,.2);if(!dot)playSfx('impact',p.x,1);if(p.hp<=0){p.hp=0;end(false)}}
function openModal(eyebrow,title,body,buttons){cancelMouse();mode='modal';clearAim();attackHeld=false;joy.x=joy.y=0;$('#stick').style.transform='';$('#modal').hidden=false;$('#modaleyebrow').textContent=eyebrow;$('#modaltitle').textContent=title;$('#modaltext').textContent=body;$('#choices').replaceChildren();buttons.forEach(b=>{const el=document.createElement('button');el.innerHTML=`<b>${b[0]}</b><small>${b[1]}</small>`;el.onclick=b[2];$('#choices').append(el)})}
function resume(){mode='play';$('#modal').hidden=true;keys={}}function upgrade(){pendingUpgrade--;openModal('靈息覺醒 · LEVEL '+level,'選擇一項刻印','停一停，力量由你決定。',[['餘燼刻印','攻擊傷害 +20%',()=>{damageMult*=1.2;resume()}],['疾行刻印','攻速 +15%，移動速度 +8%',()=>{speedMult*=1.15;p.boost=0;resume()}],['生息刻印','生命上限 +25，立即回滿生命',()=>{p.maxhp+=25;p.hp=p.maxhp;resume()}]])}
// BUG-001: restarting used to wipe the autosave 8 seconds later. Abandoning a run
// now copies the live slot aside first, and death offers the checkpoint by default.
function abandonRun(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw)localStorage.setItem(SAVE_KEY+'-abandoned-backup',raw)}catch{}reset()}
function confirmAbandon(){const s=readSaved();if(!s){abandonRun();return}openModal('確認放棄進度','由第一圖重新開始','呢個唔係重打本關：等級、裝備、技能點會全部清零，由第 1 圖 LV.1 重新開始。舊進度會另存一份備份，但自動存檔槽會被新一局覆蓋。',[['返回最後檢查點',classes[s.chosen].name+' · LV.'+s.level+' · '+chapters[s.routeStage].name,()=>restoreProgress(readSaved())],['確定放棄，重新開始','清零由第 1 圖再嚟過',abandonRun],['取消','返回上一頁',()=>{if(runOutcome==='dead')end(false);else togglePause()}]])}
function resumeCheckpoint(){const s=readSaved();if(!s){toast('冇可用嘅檢查點 · 請用「匯入存檔」');return}restoreProgress(s)}
function end(won){runOutcome=won?'won':'dead';if(won)saveProgress(true);updateHUD();const m=Math.floor(elapsed/60),s=Math.floor(elapsed%60).toString().padStart(2,'0'),saved=readSaved();const buttons=[];if(!won&&saved)buttons.push(['返回最後檢查點',classes[saved.chosen].name+' · LV.'+saved.level+' · '+chapters[saved.routeStage].name,resumeCheckpoint]);buttons.push(['查看本局裝備','檢視拾獲的武器與護符',()=>panelOpen('gear')],['放棄進度 · 由第一圖重來','⚠️ 等級、裝備、技能點全部清零',confirmAbandon],['選擇另一位行者','體驗另一種原創戰鬥方式',showSelectScreen]);openModal(won?'遠征 · 完成':'行者倒下了',won?'鐘聲，再次響起':'灰燼尚未熄滅',`${classes[chosen].name} · ${m}:${s} · 擊破 ${kills} · LV. ${level}`,buttons)}function win(){end(true)}
function togglePause(){if(mode==='play')openModal('聖所靜止','暫停','呼吸一下，異物會等你。',[['繼續戰鬥','返回聖所',resume],['儲存進度','保存目前檢查點',()=>saveProgress(false)],['放棄進度 · 由第一圖重來','⚠️ 唔係重打本關：等級、裝備全部清零',confirmAbandon]]);else if(mode==='modal'&&$('#modaltitle').textContent==='暫停')resume()}
$('#pause').onclick=togglePause;$('#sound').onclick=()=>{setSound(!preferences.sound);tone(440,.1)};
for(const [id,fn]of [['dash',dash],['potion',potion]])$('#'+id).addEventListener('pointerdown',e=>{e.preventDefault();fn()});$('#attack').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);attackHeld=true;attack()});for(const evt of ['pointerup','pointercancel','lostpointercapture'])$('#attack').addEventListener(evt,()=>attackHeld=false);
const j=$('#joystick');function moveJoy(e){const r=j.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,l=Math.hypot(x,y),max=35;joy.x=l>5?x/Math.max(max,l):0;joy.y=l>5?y/Math.max(max,l):0;$('#stick').style.transform=`translate(${joy.x*max}px,${joy.y*max}px)`}j.addEventListener('pointerdown',e=>{joy.id=e.pointerId;j.setPointerCapture(e.pointerId);moveJoy(e)});j.addEventListener('pointermove',e=>{if(e.pointerId===joy.id)moveJoy(e)});for(const evt of ['pointerup','pointercancel','lostpointercapture'])j.addEventListener(evt,()=>{joy.id=null;joy.x=joy.y=0;$('#stick').style.transform=''});
addEventListener('keydown',e=>{if(mode==='panel'||mode==='layout'){if(e.key==='Escape'){e.preventDefault();mode==='layout'?finishLayout():panelClose()}return}if(e.key.toLowerCase()==='i'&&p){panelOpen('gear');return}if(e.key==='Alt'){e.preventDefault();if(!e.repeat&&p)toggleLootLabels();return}if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();keys[e.key.toLowerCase()]=true;if(e.repeat)return;if(e.key.toLowerCase()==='k')skill();if(e.key===' ')dash();if(e.key.toLowerCase()==='h')potion();if(e.key==='Escape')togglePause()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);addEventListener('blur',()=>{keys={};attackHeld=false;joy.x=joy.y=0;if(mode==='play')togglePause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play')togglePause()});
function updateHUD(){if(!p)return;
 ui.hp.textContent=Math.ceil(p.hp);ui.mp.textContent=Math.floor(p.mp);ui.level.textContent='LV. '+level;ui.xp.style.width=(xp/xpNeed*100)+'%';
 ui.health.style.setProperty('--fill',Math.max(0,p.hp/p.maxhp*100)+'%');ui.mana.style.setProperty('--fill',p.mp+'%');
 ui.timer.textContent=`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${Math.floor(elapsed%60).toString().padStart(2,'0')} · 擊破 ${kills}`;
 ui.objective.textContent=bossSpawned?'擊敗 '+mapSpec().boss: `清除守軍 · 第 ${Math.max(1,wave-routeStage*3)} / 2 波 · 剩餘 ${waveSpawn+foes.filter(f=>f.hp>0).length}`;
 ui.progress.style.width=Math.min(100,(routeStage+(campaignCleared.includes(routeStage)?1:0))/9*100)+'%';ui.skill.textContent=skillCD>0?Math.ceil(skillCD):p.mp<manaCost()?'不足':'';
 ui.dash.textContent=dashCD>0?Math.ceil(dashCD):'';
 // The seraph has no dash; the same key takes off and lands, so the button and
 // the keyboard hint say which one pressing it will do next.
 {const label=dashLabel(),span=$('#dashlabel'),help=$('#dashhelp');
  if(span&&span.textContent!==label){span.textContent=label;$('#dash')?.setAttribute?.('aria-label',label)}
  if(help&&help.textContent!==label)help.textContent=label;}ui.potion.textContent='藥水 · '+potions;$('#skill').classList.toggle('ready',skillCD<=0&&p.mp>=manaCost());$('#skillstatus').textContent=skillCD>0?'共鳴冷卻 '+Math.ceil(skillCD)+' 秒':'共鳴就緒 · '+manaCost()+' '+resourceName();
 const target=nearest();$('#targetbar').hidden=bossSpawned||!target||target.type===3||dist(target,p)>420;if(target){$('#targetname').textContent=target.name;$('#targettype').textContent=target.type===3?'首領':['突擊','重裝','遠射'][target.type]||'';$('#targethp').style.width=Math.max(0,target.hp/target.maxhp*100)+'%';}
 expansionHUD();journeyHUD();monkHUD();angelHUD();exploreHUD();const boss=foes.find(f=>f.type===3);if(boss)$('#bossbar i').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
}
function update(dt){
 if(impactFreeze>0){impactFreeze-=dt;return}elapsed+=dt;attackCD-=dt;skillCD=Math.max(0,skillCD-dt);dashCD=Math.max(0,dashCD-dt);p.inv-=dt;p.boost-=dt;p.action=Math.max(0,p.action-dt);p.mp=Math.min(100,p.mp+((equipped.amulet?.effect==='mana'?7:5)+gearStats().regen+buildManaRegen()+attrManaRegen())*dt*(chosen===5?0:1));
 if(attrRegenHp()>0&&p.hp>0)p.hp=Math.min(p.maxhp,p.hp+attrRegenHp()*dt);
 let dx=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=joy.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0),len=Math.hypot(dx,dy);const mm=mouseMovement(dt,len>.05);if(mm){dx=mm.x;dy=mm.y;len=Math.hypot(dx,dy)}const moveStart={x:p.x,y:p.y};
 if(len){dx/=Math.max(1,len);dy/=Math.max(1,len);p.dx=dx;p.dy=dy;const speed=classes[chosen].speed*movementFactor()*(1+(speedMult-1)*.53)*(1+(gearStats().speed+attrSpeed())/100)*(p.boost>0?1.6:1)*(p.chill>0?.65:1)*angelSpeedMult();p.x+=dx*speed*dt;p.y+=dy*speed*dt;confine(p)}
 updateTravel(moveStart,dt);updateSkillVisuals(dt);updateExpansion(dt);updateAngel(dt);if(mode!=='play')return;if(attackHeld||keys.j)attack();
 for(let i=casts.length-1;i>=0;i--){const c=casts[i];c.age+=dt;if(c.age>=c.release){releaseSkill(c);casts.splice(i,1)}}
 if(exploring){updateExploration(dt);exploreBossCheck()}
 else{
  if(waveSpawn>0){spawnTimer-=dt;if(spawnTimer<=0){spawn(rollGuardRole());waveSpawn--;spawnTimer=wave<4?1.5:1.05}}
  if(!waveSpawn&&!foes.some(f=>f.hp>0)&&!bossSpawned){rest-=dt;if(rest<=0){nextWave();rest=4}}
 }
 // BUG-012: frozen enemies used to keep burning down their attack and state timers,
 // so they acted the instant the freeze expired. Only damage-over-time still ticks.
 for(const f of foes){if(f.hp<=0)continue;f.hit-=dt;f.recoil=Math.max(0,(f.recoil||0)-dt);f.slow=Math.max(0,(f.slow||0)-dt);f.action=Math.max(0,(f.action||0)-dt);if(!(f.frozen>0)){f.attack-=dt;f.stateT-=dt}
  if(f.burn>0){f.burn-=dt;f.burnTick=(f.burnTick||0)-dt;if(f.burnTick<=0){f.burnTick=.55;hit(f,5*gearPower(),0);addVFX(0,f.x,f.y,44,.55)}}
  if(f.asleep)continue;
  if(f.frozen>0)continue;if(f.campaign){updateCampaignEnemy(f,dt);continue}if(f.state==='emerge'){if(f.stateT<=0)f.state='seek';continue}
  const d=dist(f,p),a=Math.atan2(p.y-f.y,p.x-f.x);f.facing=a;
  if(f.state==='windup'){f.action=.4;if(f.stateT<=0){f.state='recover';f.stateT=f.type===3?.7:.4;
    if(f.type===0){f.state='lunge';f.stateT=.3;f.lungeA=a}
    else if(f.type===1){addVFX(1,f.x+Math.cos(a)*25,f.y+Math.sin(a)*20,60,.45);sparks(f.x,f.y,'#baa483',8,65);if(d<66)hurt(12+wave,f.affix)}
    else if(f.type===2){for(let j=-1;j<=1;j++)enemyShot(f.x,f.y,a+j*.18,145,12,2,f.affix);addVFX(2,f.x,f.y,58,.5)}
    else{hazards.push({x:p.x,y:p.y,r:115,life:1.25,max:1.25});if(f.hp<f.maxhp*.5)hazards.push({x:p.x+p.dx*80,y:p.y+p.dy*60,r:85,life:1.7,max:1.7});for(let j=0;j<10;j++)enemyShot(f.x,f.y,j*Math.PI/5+elapsed*.3,125,18,0);if(foes.length<7)spawn(Math.floor(rnd(0,3)));}
  }}else if(f.state==='lunge'){f.x+=Math.cos(f.lungeA)*270*dt;f.y+=Math.sin(f.lungeA)*210*dt;f.walk+=dt*15;confine(f);if(dist(f,p)<38)hurt(9+wave,f.affix);if(f.stateT<=0){f.state='recover';f.stateT=.5}}
  else if(f.state==='recover'){if(f.stateT<=0)f.state='seek'}
  else{
   const targetRange=f.type===0?135:f.type===1?53:f.type===2?285:150;
   if(d>targetRange||f.type===2&&d<150){let dir=f.type===2&&d<150?-1:1;const sway=f.type===0?Math.sin(time*2+f.phase)*.28:0,speed=f.speed*(f.slow>0?.55:1);f.x+=Math.cos(a+sway)*speed*dt*dir;f.y+=Math.sin(a+sway)*speed*dt*dir;f.walk+=dt*(f.type===1?6:9);confine(f)}
   if(d<targetRange+20&&f.attack<=0){f.state='windup';playSfx('roar',f.x,f.type);f.stateT=f.type===0?.33:f.type===1?.55:f.type===2?.45:.75;f.attack=f.type===3?(f.hp<f.maxhp*.5?2.4:3.5):f.type===2?3.1:f.type===0?2.1:1.7;}
  }
  for(const other of foes){if(other===f||other.hp<=0||other.asleep)continue;const dd=dist(f,other);if(dd>0&&dd<f.r+other.r){f.x+=(f.x-other.x)/dd*13*dt;f.y+=(f.y-other.y)/dd*13*dt}}
 }
 for(const actor of foes)if(actor.hp>0)advanceActorPresentation(actor,dt,enemyMotionProfile(actor));
 for(const sh of shots){sh.life-=dt;sh.trail??=[];sh.trail.unshift({x:sh.x,y:sh.y});if(sh.trail.length>7)sh.trail.pop();sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;
  if(sh.enemy){if(dist(sh,p)<17){hurt(sh.damage,sh.ailment);addVFX(sh.element||0,sh.x,sh.y,58,.5);sh.life=0}}
  else{for(const f of foes){if(f.hp<=0||sh.hit.has(f)||sh.life<=0)continue;if(dist(sh,f)<f.r+8){hit(f,sh.damage*(sh.shatter&&f.frozen>0?1.5:1),sh.element);projectileVariation(sh,f);addVFX(sh.element,f.x,f.y,sh.large?100:60,.5);if(sh.element===0)f.burn=1.4;sh.hit.add(f);onProjectileGearHit(sh,f);sh.pierce--;if(sh.pierce<0)sh.life=0}}
   if(sh.life>0&&exploring)for(const s of mapSeals){if(s.broken||dist(sh,s)>52)continue;sealDamage(s,sh.damage);addVFX(sh.element,s.x,s.y,70,.5);sparks(s.x,s.y,'#ffd08a',6,90);sh.life=0;break}
   if(sh.life>0)for(const o of props)if(!o.broken&&o.hp>0&&dist(sh,o)<o.r+10){hitProp(o,sh.damage);addVFX(sh.element,o.x,o.y,65,.5);sh.life=0;break}
  }
 }
 for(const t of turrets){t.life-=dt;t.attack-=dt;const f=nearest(t.x,t.y);if(f&&t.attack<0){t.attack=.85;fire(t.x,t.y,Math.atan2(f.y-t.y,f.x-t.x),20*gearPower(),420,'#c6d5ac');shots[shots.length-1].element=1}}
 for(const z of burnZones){z.life-=dt;z.tick-=dt;if(z.tick<=0){z.tick=.55;for(const f of foes)if(dist(z,f)<z.r)hit(f,12*gearPower(),0)}}
 for(const h of hazards){h.life-=dt;if(h.life<=0){addVFX(0,h.x,h.y,220,1);ring(h.x,h.y,'#dd9154',h.r,.5);sparks(h.x,h.y,'#e9ac64',22,150);shake=6;if(Math.hypot(p.x-h.x,(p.y-h.y)/.57)<h.r)hurt(h.damage||30)}}
 for(let i=dashFields.length-1;i>=0;i--){const z=dashFields[i];z.life-=dt;z.tick-=dt;if(z.tick<=0){z.tick=.45;for(const f of foes)if(f.hp>0&&dist(z,f)<34){hit(f,7*gearPower());addVFX(z.type,f.x,f.y,45,.35)}}if(z.life<=0)dashFields.splice(i,1)}
 // BUG-003: only consumables are magnetic. Gear stays where it fell, and a failed
 // pickup backs off instead of teleporting beside the player and refreshing its life.
 for(const d of drops){d.life-=dt;
  if(d.type==='gear'){d.retry=Math.max(0,(d.retry||0)-dt);continue}
  if(dist(d,p)<95){d.x+=(p.x-d.x)*dt*5;d.y+=(p.y-d.y)*dt*5}
  if(dist(d,p)<22){if(d.type==='potion'){if(potions>=potionCap())continue;potions++;num(p.x,p.y-80,'+1 藥水','#e0a2a2');playSfx('potion',p.x)}
   else if(d.type==='heal'){const amt=18*(p.curse>0?.5:1);p.hp=Math.min(p.maxhp,p.hp+amt);num(p.x,p.y-80,'+'+Math.round(amt)+' 生命','#c5d59b')}
   else{p.mp=Math.min(100,p.mp+20);num(p.x,p.y-80,'+20 '+resourceName(),'#a1bfef')}
   d.life=0;tone(600,.08)}}
 foes=foes.filter(f=>f.hp>0);shots=shots.filter(sh=>sh.life>0);hazards=hazards.filter(h=>h.life>0);turrets=turrets.filter(t=>t.life>0);drops=drops.filter(d=>d.life>0);for(let i=burnZones.length-1;i>=0;i--)if(burnZones[i].life<=0)burnZones.splice(i,1);
 if(pendingUpgrade&&mode==='play')upgrade();updateHUD();
}
function enemyShot(x,y,a,speed,damage,element,ailment){shots.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:4,enemy:true,ailment,color:element===2?'#b394de':'#dc9567',damage,element,trail:[]})}
// Articulated texture mesh: deform wings, spine and lower limbs independently.
function triangle(c,img,a,b,d,A,B,D){
 const den=a.x*(b.y-d.y)+b.x*(d.y-a.y)+d.x*(a.y-b.y);if(Math.abs(den)<.01)return;
 const xx=(A.x*(b.y-d.y)+B.x*(d.y-a.y)+D.x*(a.y-b.y))/den;
 const yx=(A.y*(b.y-d.y)+B.y*(d.y-a.y)+D.y*(a.y-b.y))/den;
 const xy=(A.x*(d.x-b.x)+B.x*(a.x-d.x)+D.x*(b.x-a.x))/den;
 const yy=(A.y*(d.x-b.x)+B.y*(a.x-d.x)+D.y*(b.x-a.x))/den;
 const tx=(A.x*(b.x*d.y-d.x*b.y)+B.x*(d.x*a.y-a.x*d.y)+D.x*(a.x*b.y-b.x*a.y))/den;
 const ty=(A.y*(b.x*d.y-d.x*b.y)+B.y*(d.x*a.y-a.x*d.y)+D.y*(a.x*b.y-b.x*a.y))/den;
 c.save();c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.lineTo(D.x,D.y);c.closePath();c.clip();c.transform(xx,yx,xy,yy,tx,ty);c.drawImage(img,0,0);c.restore();
}
function skinMonster(c,frame,h,f){const img=frame.tile;if(!img)return;const w=h*frame.w/frame.h,cols=2,rows=preferences.quality==='smooth'?2:4,vs=[],ss=[],t=time+f.phase,walking=f.state==='seek'||f.state==='lunge',step=walking?(f.walk||0):0;
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=i/cols,v=j/rows,side=u-.5,leg=Math.max(0,(v-.55)/.45);let x=(u-.5)*w,y=(v-1)*h;
  if(f.type===0){x+=side*w*Math.sin(t*13)*.2*(1-v);y+=Math.sin(t*13)*Math.abs(side)*h*.12*(1-v)}
  else if(f.type===1){x+=Math.sin(step*2+(side>0?0:Math.PI))*w*.055*leg;y+=Math.sin(step*2+(side>0?0:Math.PI))*h*.06*leg}
  else if(f.type===2){x+=Math.sin(t*3+v*5)*w*.065;y+=Math.cos(t*2+u*4)*h*.015}
  else{x+=Math.sin(step*1.6+(side>0?0:Math.PI))*w*.04*leg;y+=Math.sin(step*1.6+(side>0?0:Math.PI))*h*.045*leg}
  vs.push({x,y});ss.push({x:u*img.width,y:v*img.height});
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;triangle(c,img,ss[a],ss[b],ss[e],vs[a],vs[b],vs[e]);triangle(c,img,ss[a],ss[e],ss[d],vs[a],vs[e],vs[d])}
}
function monster(f,dead=false){if(f.campaign&&drawCampaignEnemy(f,dead))return;if(!monsterFrames.length)return;const t=time+f.phase,attacking=f.state==='lunge'||f.state==='recover'||f.state==='windup'&&f.stateT<.2;
 const art=monsterFrames[f.type+(attacking?4:0)],height=[81,72,92,178][f.type]*(f.scale||1),flip=p?f.x>p.x:false;
 ctx.save();const emerge=f.state==='emerge'?clamp(1-f.stateT/.6,.05,1):1;ctx.globalAlpha=dead?Math.min(.6,f.fade/5):emerge;
 ctx.fillStyle='#08050280';ctx.beginPath();ctx.ellipse(f.x,f.y,f.r*(dead?1.2:1),7,0,0,7);ctx.fill();
 if(!dead&&f.affixIndex){groundRing(f.x,f.y,f.r+6,f.color,.65,1.5);if(f.frozen>0)groundRing(f.x,f.y,f.r+12,'#bceafa',.9,3)}
 if(f.type===3&&!dead)glow(ctx,f.x,f.y-62,65,'#d47d31',.15);
 const recoil=(f.recoil||0)*32,bob=f.type===0?Math.sin(t*7)*3:f.type===2?Math.sin(t*2)*4:0;
 ctx.translate(f.x-Math.cos(f.facing||0)*recoil,f.y-Math.sin(f.facing||0)*recoil+bob);
 if(f.state==='windup'&&!dead)groundRing(0,0,f.r+8,'#e89b62',.6,1.5);
 if(flip)ctx.scale(-1,1);
 if(dead){const fall=clamp(f.deathAge/.4,0,1);ctx.rotate(-fall*.8);ctx.scale(1,1-fall*.55);drawSprite(ctx,monsterArt,art,0,0,height)}
 else{if(f.state==='windup')ctx.rotate(-Math.sin((1-f.stateT)*4)*.045);const moving=f.state==='seek'||f.state==='lunge',animated=enemyGaitFrames.length&&f.frozen<=0&&!attacking&&(moving||f.type===0||f.type===2);if(animated){const cycle=(f.type===0||f.type===2)?t*1.8:(f.walk||0)/Math.PI;const tile=enemyGaitFrames[gaitFrameIndex(cycle*Math.PI*2)*4+f.type];drawMotionTile(ctx,tile,0,0,height*emerge)}else skinMonster(ctx,art,height*emerge,f);if(f.hit>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.12;drawSprite(ctx,monsterArt,art,0,0,height)}}ctx.restore();
 if(!dead&&f.hp<f.maxhp&&f.type<3){ctx.fillStyle='#150b07';ctx.fillRect(f.x-20,f.y-height-8,40,4);ctx.fillStyle='#a86b41';ctx.fillRect(f.x-20,f.y-height-8,40*f.hp/f.maxhp,2)}
}
function drawMap(){if(exploring)drawExploreMap();else drawExpandedMap()}
function groundRing(x,y,r,color,alpha=1,lw=2){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.beginPath();ctx.ellipse(x,y,r,r*.57,0,0,7);ctx.stroke();ctx.restore()}
function render(){
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#100d0a';ctx.fillRect(0,0,W,H);
 const selecting=mode==='select',zoom=selecting?Math.max(W/world.w,H/world.h):Math.max(.88,Math.min(1.12,Math.max(W/1500,H/850)));
 const visibleW=W/zoom,visibleH=H/zoom,target=p||{x:720,y:505};
 const desiredX=target.x-visibleW/2,desiredY=target.y-visibleH*.5+(W<600?10:30);
 cam.x=visibleW<world.w?clamp(desiredX,0,world.w-visibleW):(world.w-visibleW)/2;
 cam.y=visibleH<world.h?clamp(desiredY,0,world.h-visibleH):(world.h-visibleH)/2;
 ctx.save();ctx.scale(zoom,zoom);ctx.translate(-cam.x,-cam.y);
 if(shake>0){ctx.translate(rnd(-shake,shake),rnd(-shake,shake)*.65);shake*=.8}
 if(exploring)drawTerrainBackground(cam.x,cam.y,visibleW,visibleH);
 else{const floor=chapterBackground();if(floor&&(floor.naturalWidth||floor.width))ctx.drawImage(floor,0,0,world.w,world.h)}
 if(selecting){for(const o of [...props].sort((a,b)=>a.y-b.y))drawProp(o)}
 if(!selecting){
  drawExpansion();drawExploration();
  for(const q of scorches){ctx.globalAlpha=Math.min(.45,q.life/8);ctx.fillStyle=q.color;ctx.beginPath();ctx.ellipse(q.x,q.y,q.r,q.r*.45,0,0,7);ctx.fill()}ctx.globalAlpha=1;
  for(const o of props)if((o.broken||o.r===0)&&o.x>cam.x-200&&o.x<cam.x+visibleW+200&&o.y>cam.y-200&&o.y<cam.y+visibleH+240)drawProp(o);for(const f of corpses)monster(f,true);
  for(const h of hazards){const pulse=.2+Math.sin(time*15)*.05;ctx.fillStyle=`rgba(174,55,20,${pulse})`;ctx.beginPath();ctx.ellipse(h.x,h.y,h.r,h.r*.57,0,0,7);ctx.fill();groundRing(h.x,h.y,h.r,'#de8246',.75,2);groundRing(h.x,h.y,h.r*(1-h.life/h.max),'#f0b170',.7,2)}
  lootLabelBounds.length=0;for(const d of drops){if(d.type==='gear'){drawGearDrop(d);continue}const col=d.type==='heal'?'#d94735':d.type==='potion'?'#e5b0a4':'#558bda';glow(ctx,d.x,d.y-4,24,col,.4);if(d.type==='potion')glow(ctx,d.x,d.y-10,34,'#ffd9c0',.28);ctx.save();ctx.translate(d.x,d.y);ctx.fillStyle=col;ctx.strokeStyle='#cdb385';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-3,-13);ctx.lineTo(3,-13);ctx.lineTo(3,-9);ctx.lineTo(6,-5);ctx.lineTo(5,2);ctx.lineTo(-5,2);ctx.lineTo(-6,-5);ctx.lineTo(-3,-9);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  for(const t of turrets){glow(ctx,t.x,t.y-15,47,'#b2c39a',.2);drawSprite(ctx,fxArt,fxFrames[6],t.x,t.y,64+Math.sin(time*2)*2);groundRing(t.x,t.y,22,'#95a16b',.3,1)}
  for(const z of dashFields){ctx.save();ctx.globalAlpha=Math.min(.22,z.life*.12);figure(ctx,z.x,z.y,chosen,time,.9,z.dx,z.dy);ctx.restore();groundRing(z.x,z.y,26,classes[z.type].color,Math.min(.3,z.life*.14),1)}
  for(const g of ghosts){ctx.save();ctx.globalAlpha=g.life*.85;figure(ctx,g.x,g.y,chosen,time,1,g.dx,g.dy);ctx.restore()}
  const nearProps=props.filter(o=>!o.broken&&o.r>0&&o.x>cam.x-260&&o.x<cam.x+visibleW+260&&o.y>cam.y-260&&o.y<cam.y+visibleH+340);
  const entities=[...foes,...nearProps.map(o=>({...o,prop:true}))];if(p)entities.push({...p,player:true});entities.sort((a,b)=>a.y-b.y);
  for(const f of entities){if(f.x<cam.x-100||f.x>cam.x+visibleW+100||f.y<cam.y-50||f.y>cam.y+visibleH+185)continue;if(f.player){
   glow(ctx,p.x,p.y-18,72,classes[chosen].color,.065);
   ctx.globalAlpha=p.inv>0?.7+Math.sin(time*38)*.2:1;figure(ctx,p.x,p.y,chosen,time,1,p.dx,p.dy,p.action);ctx.globalAlpha=1;drawAngelHalo(ctx);
   groundRing(p.x,p.y+1,21,'#cfb576',.2,1);
  }else if(f.prop)drawProp(f);else monster(f)}
  drawSkillVisuals();for(const s of shots)drawShot(s);
  for(const z of burnZones){const fade=Math.min(1,z.life/.7);glow(ctx,z.x,z.y-10,70,'#d98a40',.2*fade);drawFXFrame(0,1+(Math.floor(time*10+z.x)%2),z.x,z.y,60+Math.sin(time*8+z.x)*7,.65*fade)}
  for(const e of vfx)drawVFX(e);
  for(const e of effects){const life=Math.max(0,e.life/e.max),r=e.r*(1-life);groundRing(e.x,e.y,r,e.color,life,e.r>150?4:2);if(e.r>150)groundRing(e.x,e.y,r*.92,'#f4d6a3',life*.3,1)}
  for(const q of particles){ctx.save();ctx.globalAlpha=Math.min(1,q.life*2);ctx.globalCompositeOperation=q.solid?'source-over':'lighter';ctx.fillStyle=q.color;ctx.translate(q.x,q.y-q.z);ctx.rotate(q.life*5);ctx.fillRect(0,0,q.size,q.solid?q.size:q.size*.6);ctx.restore()}
  for(const n of numbers){ctx.globalAlpha=Math.max(0,n.life/.8);ctx.fillStyle=n.color;ctx.font='bold 16px Georgia';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText(n.text,n.x,n.y-(.8-n.life)*35);ctx.shadowBlur=0}ctx.globalAlpha=1;
 }
 if(aim.id!==null)drawAim();
 // Flickering candlelight is additive and does not flatten the stone texture.
 for(const [x,y]of [[505,96],[1120,170],[1270,268],[95,670],[930,860]])glow(ctx,x,y,65,'#c97c28',.07+Math.sin(time*6+x)*.014);
 ctx.restore();
 for(let i=0;i<18;i++){const x=(i*173.3+time*7)%W,y=(i*111.7-time*9)%H;ctx.fillStyle=`rgba(206,157,80,${.12+Math.sin(time+i)*.09})`;ctx.fillRect(x,y<0?y+H:y,1.5,1.5)}
 if(selecting)drawRoster();else drawMap();
}
function addVFX(row,x,y,size=100,duration=.75,delay=0){if(vfx.length>(preferences.quality==='smooth'?24:55))vfx.shift();vfx.push({row,x,y,size,duration,age:-delay})}
function drawFXFrame(row,frame,x,y,size,alpha=1,rotation=0){const f=fxFrames[(row>=4?2:row===3?1:row)*4+frame];if(!f)return;ctx.save();ctx.globalAlpha=alpha;if(row===3)ctx.filter='hue-rotate(90deg) saturate(1.3)';if(row===4)ctx.filter='hue-rotate(90deg) saturate(1.6)';ctx.translate(x,y);if(rotation)ctx.rotate(rotation);drawSprite(ctx,fxArt,f,0,0,size);ctx.restore()}
function drawVFX(e){if(e.age<0||e.size>100)return;const t=clamp(e.age/e.duration,0,.999),stage=t*3,first=Math.floor(stage),mix=stage-first;const size=e.size*(.58+Math.min(1,t*4)*.42);const alpha=t<.1?t*10:t>.78?(1-t)/.22:1;glow(ctx,e.x,e.y-size*.25,size*.55,classes[e.row].color,alpha*.12);drawFXFrame(e.row,preferences.quality==='smooth'?Math.round(stage):first,e.x,e.y,size,preferences.quality==='smooth'?alpha:alpha*(1-mix));if(first<3&&preferences.quality!=='smooth')drawFXFrame(e.row,first+1,e.x,e.y,size,alpha*mix)}
function drawShot(sh){if(drawDistinctProjectile(sh))return;const row=sh.element||0,sy=sh.y-31,a=Math.atan2(sh.vy,sh.vx),size=sh.large?74:sh.enemy?24:row===0?38:31;
 for(let i=(sh.trail?.length||0)-1;i>=0;i-=preferences.quality==='smooth'?4:2){const q=sh.trail[i];drawFXFrame(row,0,q.x,q.y-25,size*(1-i/12),.32*(1-i/8),row===2?a+Math.PI/2:0)}
 drawFXFrame(row,row===2?2:1,sh.x,sy+size*.4,size,sh.enemy?.82:1,row===2?a+Math.PI/2:0);glow(ctx,sh.x,sy,sh.large?40:25,sh.color,.2);
}
function drawSkillIcon(){const tier=Math.max(0,ranks[activeSkill]-1);if(logosReady||chosen===5){drawLogo($('#skillart'),chosen*9+activeSkill*3+Math.min(2,tier),tier);return}if(!fxFrames.length)return;const icon=$('#skillart'),ic=icon.getContext('2d');ic.clearRect(0,0,120,120);const g=ic.createRadialGradient(60,65,0,60,65,85);g.addColorStop(0,['#67331c','#3c4a31','#37304e','#21485c','#602531','#2a3157'][chosen]);g.addColorStop(1,'#0f0b08');ic.fillStyle=g;ic.fillRect(0,0,120,120);ic.save();if(chosen===3)ic.filter='hue-rotate(90deg)';drawSprite(ic,fxArt,fxFrames[(chosen===4?2:chosen===3?1:chosen)*4+2],60,116,117);ic.restore()}
function initProps(){props.length=0;const places=[
 [0,414,364,101],[0,1047,584,93],[3,1004,351,151],[3,383,603,132],[6,735,321,109],
 [1,593,346,91],[1,888,679,89],[1,318,503,88],[1,1134,465,91],
 [2,527,662,57],[2,1045,470,58],[2,382,425,49],[2,877,357,51],
 [4,989,729,66],[4,474,508,61],[4,633,729,53],[7,285,647,72],[7,1131,655,66],
 [5,568,394,35],[5,860,420,41],[5,692,667,34],[5,425,725,40],[5,949,583,37],[5,602,541,30],[5,1050,398,38],[5,770,743,30]];
 places.forEach(([type,x,y,h])=>props.push({type,x:x*1.5,y:y*1.5,h,r:[28,16,19,22,22,0,32,22][type],hp:[0,0,38,0,44,0,0,58][type],broken:false}));
}
function hitProp(o,damage){if(o.broken||o.hp<=0)return;o.hp-=damage;if(o.hp>0)return;o.broken=true;for(let i=0;i<15;i++){const a=rnd(0,7);particles.push({x:o.x,y:o.y,z:rnd(7,32),vx:Math.cos(a)*rnd(30,120),vy:Math.sin(a)*rnd(20,80),vz:rnd(30,120),life:rnd(.5,1),color:o.type===4?'#9b7344':'#a49376',size:rnd(2,5),solid:true})}drops.push({x:o.x,y:o.y,type:Math.random()<.55?'heal':'mana',life:35});scorches.push({x:o.x,y:o.y,r:22,life:80,color:'#1a1008'});playSfx('break',o.x)}
function drawProp(o){if(o.terrain){drawTerrainProp(o);return}if(!propFrames.length)return;ctx.save();if(o.broken){ctx.globalAlpha=.6;drawSprite(ctx,propArt,propFrames[5],o.x,o.y,28)}else{ctx.fillStyle='#08060470';ctx.beginPath();ctx.ellipse(o.x,o.y,o.h*.25,o.h*.09,0,0,7);ctx.fill();drawSprite(ctx,propArt,propFrames[o.type],o.x,o.y,o.h);if(o.type===1){glow(ctx,o.x,o.y-o.h*.68,76,'#d58a3a',.15+Math.sin(time*6+o.x)*.025);drawFXFrame(0,1+Math.floor(time*8+o.x)%2,o.x,o.y-o.h*.62,38,.38)}}ctx.restore()}
initProps();
let frameFaults=0;
function frame(ts){
 try{step(ts)}catch(err){
  // Never let a single bad frame end the animation loop; that is what turned a
  // missing sprite into "the game is frozen and nothing responds".
  if(frameFaults++<5)console.error('frame error',err);
  if(frameFaults===5)console.error('further frame errors suppressed');
 }
 requestAnimationFrame(frame);
}
function step(ts){
 let dt=Math.min((ts-last)/1000,.04);last=ts;if(mobileOrientationBlocked)return;time+=dt;if(mode==='play')update(dt);damageFlash=Math.max(0,damageFlash-dt*2);$('#damagewash').style.opacity=damageFlash;
 if(mode==='play'||mode==='select'){
  for(let i=vfx.length-1;i>=0;i--){vfx[i].age+=dt;if(vfx[i].age>vfx[i].duration)vfx.splice(i,1)}for(let i=scorches.length-1;i>=0;i--){scorches[i].life-=dt;if(scorches[i].life<=0)scorches.splice(i,1)}for(const e of effects)e.life-=dt;effects=effects.filter(e=>e.life>0);
  for(const n of numbers)n.life-=dt;numbers=numbers.filter(n=>n.life>0);
  for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.vz-=250*dt;if(q.z<0)q.z=0;if(q.life<=0)particles.splice(i,1)}
  for(let i=corpses.length-1;i>=0;i--){corpses[i].fade-=dt;corpses[i].deathAge+=dt;if(corpses[i].fade<=0)corpses.splice(i,1)}
  for(let i=ghosts.length-1;i>=0;i--){ghosts[i].life-=dt;if(ghosts[i].life<=0)ghosts.splice(i,1)}
 }
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').style.opacity=0}audioTick(dt);journeyTick(dt);if(ts-lastPaint>=1000/(preferences.quality==='smooth'?30:60)-1){render();lastPaint=ts}
}
initFeatures();initExpansion();initMouse();initCharacterUI();initAngel();initCampaign();initTerrainArt();initJourney();initMotion();initBuildcraft();initDirectional();initCinematics();
requestAnimationFrame(frame);
