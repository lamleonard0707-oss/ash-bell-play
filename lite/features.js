'use strict';
// Local-only preferences. Gameplay inventory belongs to the current run.
const PREF_KEY='ash-bell-preferences-v1';
const preferences={quality:'quality',sound:true,sfx:.7,music:.4,size:100,opacity:90,layouts:{portrait:{},landscape:{}}};
try{const saved=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(saved&&typeof saved==='object'){for(const k of ['quality','sound','sfx','music','size','opacity'])if(saved[k]!==undefined)preferences[k]=saved[k];if(saved.layouts&&typeof saved.layouts==='object')preferences.layouts=saved.layouts}}catch{}
preferences.quality=preferences.quality==='smooth'?'smooth':'quality';preferences.sound=preferences.sound!==false;
for(const [k,a,b] of [['sfx',0,1],['music',0,1],['size',80,125],['opacity',35,100]])preferences[k]=Math.max(a,Math.min(b,Number.isFinite(Number(preferences[k]))?Number(preferences[k]):({sfx:.7,music:.4,size:100,opacity:90}[k])));
for(const key of ['portrait','landscape'])if(!preferences.layouts[key]||typeof preferences.layouts[key]!=='object')preferences.layouts[key]={};
let bag=[],equipped=emptyGear(),itemSerial=0,lootSerial=0,panelReturn='select',activePanel='',layoutDrag=null;
let aim={id:null,x:0,y:0,dx:1,dy:0,distance:0,moved:false,cancel:false};
let lastPaint=0,soundscape=null;
const dashFields=[];
const weaponSets=[
 [{name:'雙燼銅鈴',effect:'split',description:'火球命中後分裂成兩道餘燼',power:12},{name:'熔鐘之心',effect:'split',description:'火球命中分裂；分裂餘燼傷害提高',power:24}],
 [{name:'回響骨杖',effect:'bounce',description:'骨刺命中後追擊附近另一隻異物',power:12},{name:'萬骨迴音',effect:'bounce',description:'骨刺最多連續彈射兩次',power:24}],
 [{name:'裂頁墨刃',effect:'cleave',description:'普通墨刃額外穿透兩隻異物',power:12},{name:'無界之鋒',effect:'cleave',description:'額外穿透兩隻異物；普攻加射側刃',power:24}],
 [{name:'霜脈長戟',effect:'shatter',description:'冰片命中追加小範圍碎冰傷害',power:12},{name:'凜冬誓約',effect:'shatter',description:'冰片命中追加小範圍碎冰傷害',power:24}]
];
const amuletSets=[
 {name:'踏影護符',effect:'trail',description:'閃避路徑留下 3 秒傷害殘影',power:0},
 {name:'歸息護符',effect:'mana',description:'所有技能消耗 -8 靈息；回復速度 +2／秒',power:0},
 {name:'守鐘護符',effect:'guard',description:'生命上限 +30；受到傷害減少 12%',power:0}
];
function savePreferences(){try{localStorage.setItem(PREF_KEY,JSON.stringify(preferences))}catch{}}
// v0.9.0: a weapon may convert the player's element, which is the only way to
// answer an affix that resists your class element.
function playerElement(){const w=equipped.weapon;return (w&&Number.isInteger(w.convert))?w.convert:chosen}
function gearPower(){return damageMult*(1+((equipped.weapon?.power||0)+(equipped.offhand?.power||0)+gearStats().damage)/100)*attrDamageMult()}
function manaCost(){const raw=(typeof treeSkill==='function'?treeSkill().cost:30)-(equipped.amulet?.effect==='mana'?8:0)-(ranks[activeSkill]>=5?4:0)-talents[5]*2;return Math.max(12,Math.round(raw*skillCostMult(activeSkill)))}
function gearColor(item){return item?.rarity==='legendary'?'#e8a54f':item?.rarity==='common'?'#b9ad95':'#9bbff0'}
function makeGear(slot='weapon',legendary=false){return createEquipment(slot,legendary)}
function dropGear(x,y,slot,legendary=false){if(bag.length>=70)return;const item=makeGear(slot,legendary);drops.push({type:'gear',x,y,item,life:90});playSfx('loot',x);}
function awardGear(item){if(bag.length>=70){toast('背包已滿 · 本局最多攜帶 70 件裝備');return false}normalizePack();if(!packPlace(item)){toast('背包空間不足 · 整理格仔後再拾取');return false}bag.push(item);toast('拾取 '+item.name+' · 撳「裝備」查看');playSfx('loot',p?.x);$('#gearbtn').textContent='裝備 · '+bag.length;return true}
function equipItem(id){changeEquipment(id)}
function describeItem(item){if(!item)return '尚未裝備';const req=requirementText(item);
 return (item.power?'傷害 +'+item.power+'% · ':'')+item.description.replaceAll('靈息',resourceName())+(req?' · '+req+(meetsRequirement(item)?'':' ⚠️ 未達'):'')}
function drawInventory(){drawArsenal()}
function resetEquipment(){bag=[];equipped=emptyGear();itemSerial=0;lootSerial=0;dashFields.length=0;$('#gearbtn').hidden=false;$('#gearbtn').textContent='裝備';$('#labelbtn').hidden=false;showLootLabels=true;$('#labelbtn').textContent='名牌 · 開';clearAim()}
function drawGearDrop(d){drawGroundItem(d)}
function onProjectileGearHit(sh,f){const weapon=weaponWithEffect(sh.element===0?'split':'bounce');if(!weapon||sh.enemy)return;
 if(weapon.effect==='split'&&sh.element===0&&!sh.fragment){const a=Math.atan2(sh.vy,sh.vx);for(const side of [-1,1]){fire(f.x,f.y,a+side*.48,sh.damage*(weapon.rarity==='legendary'?.6:.42),400,sh.color);const child=shots[shots.length-1];child.fragment=true;child.element=0;child.hit.add(f)}}
 if(weapon.effect==='bounce'&&sh.element===1&&(sh.bounces||0)<(weapon.rarity==='legendary'?2:1)){let best=null,near=240;for(const enemy of foes){const d=dist(f,enemy);if(enemy!==f&&enemy.hp>0&&!sh.hit.has(enemy)&&d<near){best=enemy;near=d}}if(best){const a=Math.atan2(best.y-f.y,best.x-f.x);sh.vx=Math.cos(a)*440;sh.vy=Math.sin(a)*440;sh.x=f.x;sh.y=f.y;sh.bounces=(sh.bounces||0)+1;sh.pierce++;sh.life=Math.max(.6,sh.life)}}
}
function clearAim(){aim.id=null;aim.moved=false;aim.cancel=false;$('#aimhint').hidden=true;document.body.classList.remove('aiming')}
function aimPosition(){if(!p)return null;const range=Math.max(70,Math.min(240,aim.distance*2.2));return {x:p.x+aim.dx*range,y:p.y+aim.dy*range,dx:aim.dx,dy:aim.dy,aimed:true}}
function drawAim(){if(aim.id===null||!p)return;const target=aim.moved?aimPosition():{x:p.x,y:p.y},col=aim.cancel?'#c26856':classes[chosen].color;ctx.save();ctx.strokeStyle=col;ctx.globalAlpha=.72;ctx.lineWidth=1.5;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.setLineDash([]);groundRing(target.x,target.y,chosen===2?42:85,col,.65,2);ctx.beginPath();ctx.moveTo(target.x-11,target.y);ctx.lineTo(target.x+11,target.y);ctx.moveTo(target.x,target.y-7);ctx.lineTo(target.x,target.y+7);ctx.stroke();ctx.restore()}
function panelOpen(kind){cancelMouse();if(mode==='layout')return;if(mode!=='panel')panelReturn=mode;mode='panel';activePanel=kind;attackHeld=false;keys={};joy.x=joy.y=0;clearAim();$('#stick').style.transform='';$('#panel').hidden=false;$('#gearview').hidden=kind!=='gear';$('#settingsview').hidden=kind!=='settings';$('#treeview').hidden=kind!=='tree';$('#townview').hidden=kind!=='town';$('#paneltitle').textContent=kind==='gear'?'行者裝備':kind==='tree'?'職業技能樹':kind==='town'?(townFocus==='waypoint'?'傳送石碑':'城鎮寶箱'):'聲音與手機設定';if(kind==='town')drawTown();if(kind==='gear')drawInventory();else if(kind==='tree')drawTree();else syncSettings();$('#panelclose').focus();syncAudio()}
function panelClose(){if(mode!=='panel')return;$('#panel').hidden=true;mode=panelReturn;activePanel='';keys={};syncAudio();saveProgress(true)}
// 就算收面板途中有嘢炒咗，畫面都一定要收得返，唔可以困住玩家。
function forcePanelClose(){
 try{panelClose()}
 catch(err){
  reportRuntimeError(err,'關閉面板');
  $('#panel').hidden=true;activePanel='';keys={};
  if(mode==='panel')mode=panelReturn==='panel'?'play':panelReturn;
 }
}
// 出事嗰陣要睇得到係邊步死，唔係得個「冇反應」。訊息寫喺設定頁，方便截圖。
let lastRuntimeError='';
function reportRuntimeError(err,where){
 lastRuntimeError=(where||'')+' · '+((err&&(err.message||err.reason&&err.reason.message))||String(err||''));
 const status=$('#save-status');
 if(status)status.textContent='⚠️ 出錯：'+lastRuntimeError;
 if(typeof toast==='function')toast('⚠️ 出錯 · '+lastRuntimeError.slice(0,60));
}
addEventListener('error',e=>reportRuntimeError(e.error||e,'畫面'));
addEventListener('unhandledrejection',e=>reportRuntimeError(e.reason||e,'背景'));
// Fullscreen must be requested directly from a player's tap.
let fullscreenBusy=false;
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement}
function standaloneGame(){return (typeof navigator!=='undefined'&&navigator.standalone===true)||(typeof matchMedia==='function'&&matchMedia('(display-mode: standalone)').matches)}
function syncFullscreenUI(){
 const active=!!fullscreenElement(),standalone=standaloneGame();
 for(const id of ['fullscreenbtn','rotate-fullscreen']){
  const button=$('#'+id);button.textContent=active?'退出全屏':standalone?'已全屏':'全螢幕';
  button.disabled=standalone&&!active;button.setAttribute('aria-pressed',String(active||standalone));
  button.setAttribute('aria-label',active?'退出全螢幕':standalone?'已由主畫面全屏開啟':'進入全螢幕');
 }
}
function explainFullscreen(){
 const text='瀏覽器未能開啟全螢幕。iPhone：用 Safari 開線上版 → 分享 → 加入主畫面（開啟「以網頁 App 開啟」），再由圖示進入。其他手機：用 Chrome／Edge 正式瀏覽器開啟，再按全螢幕。';
 $('#fullscreen-help').textContent=text;$('#rotate-fullscreen-help').textContent=text;
 if(!mobileOrientationBlocked){panelOpen('settings');document.querySelector('.feature-panel').scrollTop=0}
}
async function toggleGameFullscreen(){
 if(fullscreenBusy||(standaloneGame()&&!fullscreenElement()))return;
 fullscreenBusy=true;
 try{
  if(fullscreenElement()){
   const exit=document.exitFullscreen||document.webkitExitFullscreen;
   if(!exit)throw Error('fullscreen exit unavailable');
   await exit.call(document);
  }else{
   const root=document.documentElement,request=root.requestFullscreen||root.webkitRequestFullscreen;
   if(!request)throw Error('fullscreen unavailable');
   await request.call(root,{navigationUI:'hide'});
  }
 }catch{explainFullscreen()}
 finally{fullscreenBusy=false;syncFullscreenUI()}
}
function initFullscreen(){
 $('#fullscreenbtn').onclick=toggleGameFullscreen;$('#rotate-fullscreen').onclick=toggleGameFullscreen;
 for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{syncFullscreenUI();resize()});
 syncFullscreenUI();
}
// Portrait is a paused presentation state, independent of panel/play modes.
const mobilePortraitQuery='(orientation: portrait) and (max-width: 900px) and (any-pointer: coarse), (orientation: portrait) and (max-width: 600px)';
let mobileOrientationBlocked=false;
function syncMobileOrientation(){
 const blocked=typeof matchMedia==='function'&&matchMedia(mobilePortraitQuery).matches;
 if(blocked===mobileOrientationBlocked)return;
 mobileOrientationBlocked=blocked;
 attackHeld=false;keys={};joy.x=joy.y=0;joy.id=null;layoutDrag=null;clearAim();cancelMouse();
 $('#stick').style.transform='';
 for(const el of document.querySelectorAll('header,#hud,#select,#panel,#modal,#layoutbar'))el.inert=blocked;
 syncAudio();
}
function orientationKey(){return W>H?'landscape':'portrait'}
function defaultControl(id){
 const landscape=W>H&&H<600,mobile=W<600;
 const map=landscape?{joystick:[77,H-83],potion:[W-186,H-113],dash:[W-186,H-44],skill:[W-120,H-112],attack:[W-42,H-43]}:mobile?{joystick:[73,H-189],potion:[W-173,H-201],dash:[W-173,H-148],skill:[W-116,H-182],attack:[W-49,H-160]}:{joystick:[106,H-191],potion:[W-234,H-227],dash:[W-234,H-162],skill:[W-162,H-198],attack:[W-77,H-176]};
 const point=map[id];
 if(landscape&&typeof getComputedStyle==='function'){
  const css=getComputedStyle(document.documentElement);
  point[0]+=id==='joystick'?(parseFloat(css.getPropertyValue('--safe-left'))||0):-(parseFloat(css.getPropertyValue('--safe-right'))||0);
  point[1]-=parseFloat(css.getPropertyValue('--safe-bottom'))||0;
 }
 return point;
}
function positionControl(id,x,y){const el=$('#'+id),scale=preferences.size/100,css=typeof getComputedStyle==='function'?getComputedStyle(el):null,w=el.offsetWidth||parseFloat(css?.width)||({joystick:100,attack:68,skill:60,dash:46,potion:46}[id]),h=el.offsetHeight||parseFloat(css?.height)||w;const margin=w*scale/2+8,topLimit=H<600&&W>H?70:105,bottomLimit=H<600&&W>H?10:92;x=Math.max(margin,Math.min(W-margin,x));y=Math.max(topLimit+h*scale/2,Math.min(H-bottomLimit-h*scale/2,y));el.style.left=(x-w/2)+'px';el.style.top=(y-h/2)+'px';el.style.bottom='auto';el.style.right='auto';el.style.margin='0';el.style.transform='scale('+scale+')';el.style.opacity=preferences.opacity/100;return {x,y}}
function applyControls(){document.body.classList.add('controls-custom');const saved=preferences.layouts[orientationKey()]||{};for(const id of ['joystick','potion','dash','skill','attack']){const point=saved[id],fallback=defaultControl(id);positionControl(id,point&&Number.isFinite(point.x)?point.x*W:fallback[0],point&&Number.isFinite(point.y)?point.y*H:fallback[1])}}
function applyQuality(){document.body.classList.toggle('low-quality',preferences.quality==='smooth');resize();lastPaint=0;savePreferences();syncSettings()}
function syncSettings(){$('#quality-high').classList.toggle('active',preferences.quality==='quality');$('#quality-low').classList.toggle('active',preferences.quality==='smooth');$('#quality-high').setAttribute('aria-pressed',preferences.quality==='quality');$('#quality-low').setAttribute('aria-pressed',preferences.quality==='smooth');$('#sound-enabled').checked=preferences.sound;for(const [id,key,out,mul]of [['sfxvolume','sfx','sfxvalue',100],['musicvolume','music','musicvalue',100],['controlsize','size','sizevalue',1],['controlopacity','opacity','opacityvalue',1]]){$('#'+id).value=Math.round(preferences[key]*mul);$('#'+out).textContent=Math.round(preferences[key]*mul)+'%'}}
function beginLayout(){$('#panel').hidden=true;$('#hud').hidden=false;$('#layoutbar').hidden=false;mode='layout';document.body.classList.add('editing-controls');applyControls()}
function finishLayout(){layoutDrag=null;$('#layoutbar').hidden=true;document.body.classList.remove('editing-controls');if(panelReturn==='select')$('#hud').hidden=true;mode='panel';savePreferences();panelOpen('settings')}
function setSound(enabled){preferences.sound=enabled;muted=!enabled;if(enabled)ensureAudio();syncAudio();$('#sound').textContent='音效 '+(enabled?'ON':'OFF');savePreferences();syncSettings()}
// Original synthesized sound design: filtered stone/noise transients, metal partials,
// positional impacts, cavern convolution and a sparse minor-mode ambient score.
function ensureAudio(){if(soundscape){audioCtx.resume().catch(()=>{});return soundscape}try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();const ac=audioCtx,master=ac.createGain(),sfx=ac.createGain(),music=ac.createGain(),limiter=ac.createDynamicsCompressor(),verb=ac.createConvolver(),wet=ac.createGain();master.gain.value=.45;limiter.threshold.value=-16;limiter.knee.value=18;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.2;sfx.connect(master);music.connect(master);verb.connect(wet);wet.gain.value=.17;wet.connect(master);master.connect(limiter);limiter.connect(ac.destination);
 const noise=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),nd=noise.getChannelData(0);let brown=0;for(let i=0;i<nd.length;i++){brown=(brown+(Math.random()*2-1)*.06)/1.03;nd[i]=brown*2.8+(Math.random()*2-1)*.15}
 const impulse=ac.createBuffer(2,Math.floor(ac.sampleRate*1.25),ac.sampleRate);for(let c=0;c<2;c++){const d=impulse.getChannelData(c);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/ac.sampleRate*5)*.45}verb.buffer=impulse;
 const wind=ac.createBufferSource(),filter=ac.createBiquadFilter(),windGain=ac.createGain();wind.buffer=noise;wind.loop=true;filter.type='lowpass';filter.frequency.value=380;windGain.gain.value=.045;wind.connect(filter).connect(windGain).connect(music);wind.start();
 soundscape={master,sfx,music,verb,noise,wind,windGain,voices:0,nextMusic:0,nextRoar:0,nextFoot:0,nextHit:0,beat:0};syncAudio();return soundscape}catch{return null}}
function syncAudio(){if(!soundscape)return;const t=audioCtx.currentTime;const active=typeof mode!=='undefined'&&mode==='play'&&!document.hidden&&!mobileOrientationBlocked;const key=[preferences.sound,preferences.sfx,preferences.music,active].join(':');if(soundscape.lastMix===key)return;soundscape.lastMix=key;soundscape.master.gain.setTargetAtTime(preferences.sound?.45:0,t,.06);soundscape.sfx.gain.setTargetAtTime(preferences.sfx,t,.04);soundscape.music.gain.setTargetAtTime(preferences.music*(active?1:0),t,.3)}
function soundOutput(x){const a=soundscape;if(!a||a.voices>36)return null;const g=audioCtx.createGain();g.gain.value=1;let pan=null;if(audioCtx.createStereoPanner&&p&&Number.isFinite(x)){pan=audioCtx.createStereoPanner();pan.pan.value=Math.max(-.8,Math.min(.8,(x-p.x)/400));g.connect(pan);pan.connect(a.sfx);pan.connect(a.verb)}else{g.connect(a.sfx);g.connect(a.verb)}return {g,pan}}
function synth(freq,duration=.1,volume=.04,type='sine',x=null,delay=0,end=null,musicVoice=false){if(!soundscape||!preferences.sound)return;const a=soundscape;if(a.voices>36)return;const now=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();a.voices++;o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),now);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+Math.min(.018,duration/5));g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);let output;if(musicVoice){g.connect(a.music)}else{output=soundOutput(x);if(output)g.connect(output.g);else g.connect(a.sfx)}o.start(now);o.stop(now+duration+.02);o.onended=()=>{a.voices--;o.disconnect();g.disconnect();output?.g.disconnect();output?.pan?.disconnect()}}
function noiseBurst(duration=.1,volume=.1,cutoff=1000,x=null,delay=0,kind='bandpass'){if(!soundscape||!preferences.sound||soundscape.voices>36)return;const a=soundscape,t=audioCtx.currentTime+delay,s=audioCtx.createBufferSource(),f=audioCtx.createBiquadFilter(),g=audioCtx.createGain(),output=soundOutput(x);a.voices++;s.buffer=a.noise;f.type=kind;f.frequency.setValueAtTime(cutoff,t);f.Q.value=.7;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f).connect(g);if(output)g.connect(output.g);else g.connect(a.sfx);s.start(t,Math.random()*.5,duration);s.onended=()=>{a.voices--;s.disconnect();f.disconnect();g.disconnect();output?.g.disconnect();output?.pan?.disconnect()}}
function playSfx(kind,x=null,element=0){if(!soundscape||!preferences.sound)return;const t=audioCtx.currentTime,a=soundscape;
 if(kind==='step'){noiseBurst(.065,.16,1100,x);synth(85,.07,.035,'sine',x,0,44);}
 else if(kind==='attack'){if(element===0){noiseBurst(.18,.13,1700,x);synth(105,.18,.025,'sine',x,0,50)}else if(element===1){noiseBurst(.07,.12,1800,x);noiseBurst(.09,.07,800,x,.045)}else{noiseBurst(.13,.09,2700,x);synth(660,.13,.024,'triangle',x,0,210)}}
 else if(kind==='impact'){if(t<a.nextHit)return;a.nextHit=t+.055;noiseBurst(.065,.11,element===1?1500:800,x);synth(element===1?310:115,.12,.034,'triangle',x,0,70);if(element===1)synth(741,.1,.018,'sine',x)}
 else if(kind==='cast'){noiseBurst(.48,.23,element===0?1300:element===1?1600:2500,x,0,element===0?'lowpass':'bandpass');synth(element===2?420:75,.6,.08,'sine',x,0,element===2?80:35);if(element===0)for(const f of [190,413,781])synth(f,.65,.025,'sine',x,.04);else if(element===1)for(let i=0;i<3;i++)noiseBurst(.15,.11,700+i*400,x,i*.065)}
 else if(kind==='roar'){if(t<a.nextRoar)return;a.nextRoar=t+.8;noiseBurst(.55,.14,170,x,0,'lowpass');synth(61+element*13,.45,.045,'sawtooth',x,0,34)}
 else if(kind==='boss'){for(const f of [55,111,238,477])synth(f,2.5,.045,'sine',x);noiseBurst(.8,.15,220,x,0,'lowpass')}
 else if(kind==='break'){for(let i=0;i<4;i++)noiseBurst(.075,.1,1300+i*350,x,i*.028);synth(180,.12,.025,'triangle',x)}
 else if(kind==='dash'){noiseBurst(.22,.15,2000,x);synth(260,.2,.025,'sine',x,0,75)}
  else if(kind==='loot'||kind==='equip'){for(let i=0;i<3;i++)synth([392,587,784][i],.4,.033,'sine',x,i*.065)}
 // v0.9.0 event vocabulary. Every new mechanic gets its own readable cue.
 else if(kind==='relic'){for(const f of [523,659,784,1047])synth(f,1.1,.035,'sine',x,(f-523)/2200);noiseBurst(.5,.06,2600,x)}
 else if(kind==='potion'){synth(430,.18,.03,'sine',x,0,760);noiseBurst(.09,.07,2200,x)}
 else if(kind==='level'){for(let i=0;i<4;i++)synth([392,494,587,784][i],.65,.04,'triangle',x,i*.085)}
 else if(kind==='phase'){for(const f of [58,87,131])synth(f,1.6,.06,'sawtooth',x,0,f*.6);noiseBurst(.9,.16,300,x,0,'lowpass');synth(1200,.5,.02,'sine',x,.05,240)}
 else if(kind==='summon'){noiseBurst(.35,.11,520,x,0,'lowpass');for(let i=0;i<3;i++)synth(146+i*40,.4,.028,'triangle',x,i*.05,90)}
 else if(kind==='quake'){noiseBurst(.7,.2,140,x,0,'lowpass');synth(44,.8,.075,'sine',x,0,26)}
 else if(kind==='beam'){synth(880,.9,.03,'sawtooth',x,0,660);noiseBurst(.8,.07,3200,x)}
 else if(kind==='rift'){noiseBurst(.3,.13,1800,x);synth(720,.35,.03,'sine',x,0,120);synth(120,.4,.03,'sine',x,.06,420)}
 else if(kind==='hook'){noiseBurst(.16,.14,900,x);synth(180,.3,.04,'square',x,0,70);noiseBurst(.22,.08,2600,x,.1)}
 else if(kind==='curse'){for(const f of [196,233,277])synth(f,1.2,.03,'sine',x,0,f*.72);noiseBurst(.6,.06,420,x,0,'lowpass')}
 else if(kind==='charge'){synth(90,1.8,.05,'sawtooth',x,0,320);noiseBurst(1.6,.06,900,x)}
 else if(kind==='step-soft'){noiseBurst(.07,.1,700,x,0,'lowpass');synth(70,.06,.02,'sine',x,0,40)}
 else if(kind==='step-hard'){noiseBurst(.05,.16,1900,x);synth(110,.05,.03,'triangle',x,0,60)}
 else if(kind==='echo'){for(const f of [523,392,294])synth(f,.9,.03,'sine',null,0,f*.5);noiseBurst(.7,.05,1400,x)}
 else if(kind==='step-wet'){noiseBurst(.1,.13,1200,x);synth(150,.08,.02,'sine',x,0,60)}
}
function audioTick(dt){if(!soundscape)return;syncAudio();if(mode!=='play'||!preferences.sound)return;const t=audioCtx.currentTime,a=soundscape;
 
 const wind=.04+Math.min(6,burnZones.length)*.012;if(wind!==a.lastWind){a.windGain.gain.setTargetAtTime(wind,t,.2);a.lastWind=wind}
 if(t>=a.nextMusic){const boss=!!bossSpawned,notes=boss?[55,58.27,65.41,49]:[55,73.42,65.41,82.41,55,49];a.nextMusic=t+(boss?1.2:3.2);const n=notes[(a.beat++)%notes.length];synth(n,boss?1.5:4.5,.045,'sine',null,0,null,true);synth(n*2.002,3,.018,'sine',null,.18,null,true);if(boss)synth(42,.18,.07,'sine',null,0,28,true)}
}
function initFeatures(){
 initFullscreen();
 syncMobileOrientation();addEventListener('resize',syncMobileOrientation);
 addEventListener('keydown',e=>{if(mobileOrientationBlocked){e.preventDefault();e.stopImmediatePropagation()}},true);
 muted=!preferences.sound;$('#sound').textContent='音效 '+(preferences.sound?'ON':'OFF');document.body.classList.toggle('low-quality',preferences.quality==='smooth');applyControls();
 $('#gearbtn').onclick=()=>{if(p)panelOpen('gear')};$('#settingsbtn').onclick=()=>panelOpen('settings');
 // 2026-09-09：使用者試玩時面板收唔到，撳極都冇反應。關閉唔可以再靠單一個掣：
 // ✕ 掣、撳面板以外嘅暗位、Esc 三條路都要收得到，而且一步都唔准 throw。
 $('#panelclose').onclick=()=>forcePanelClose();
 $('#panel').addEventListener('pointerdown',e=>{if(e.target===$('#panel'))forcePanelClose()});
 $('#quality-high').onclick=()=>{preferences.quality='quality';applyQuality()};$('#quality-low').onclick=()=>{preferences.quality='smooth';applyQuality()};$('#sound-enabled').onchange=e=>setSound(e.target.checked);
 for(const [id,key,mul]of [['sfxvolume','sfx',100],['musicvolume','music',100],['controlsize','size',1],['controlopacity','opacity',1]])$('#'+id).oninput=e=>{preferences[key]=Number(e.target.value)/mul;applyControls();syncSettings();syncAudio();savePreferences()};
 $('#editlayout').onclick=beginLayout;$('#layoutdone').onclick=finishLayout;$('#resetlayout').onclick=()=>{preferences.layouts[orientationKey()]={};applyControls();savePreferences()};
 for(const id of ['joystick','potion','dash','skill','attack']){const el=$('#'+id);el.addEventListener('pointerdown',e=>{if(mode!=='layout')return;e.preventDefault();e.stopImmediatePropagation();const r=el.getBoundingClientRect();layoutDrag={id,pointer:e.pointerId,offX:e.clientX-(r.left+r.width/2),offY:e.clientY-(r.top+r.height/2)};el.setPointerCapture(e.pointerId)},true);el.addEventListener('pointermove',e=>{if(mode!=='layout'||layoutDrag?.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const point=positionControl(id,e.clientX-layoutDrag.offX,e.clientY-layoutDrag.offY);preferences.layouts[orientationKey()]??={};preferences.layouts[orientationKey()][id]={x:point.x/W,y:point.y/H}},true);for(const event of ['pointerup','pointercancel'])el.addEventListener(event,e=>{if(mode!=='layout')return;e.preventDefault();e.stopImmediatePropagation();layoutDrag=null;savePreferences()},true)}
 const skillButton=$('#skill');skillButton.addEventListener('pointerdown',e=>{if(mode!=='play'||skillCD>0||p.mp<manaCost())return;e.preventDefault();skillButton.setPointerCapture(e.pointerId);$('#aimhint').textContent='放開施放 · 拖曳方向瞄準';aim={id:e.pointerId,x:e.clientX,y:e.clientY,dx:p.dx,dy:p.dy,distance:0,moved:false,cancel:false};$('#aimhint').hidden=false;document.body.classList.add('aiming')});
 skillButton.addEventListener('pointermove',e=>{if(aim.id!==e.pointerId||mode!=='play')return;const dx=e.clientX-aim.x,dy=e.clientY-aim.y,d=Math.hypot(dx,dy);if(d>14){aim.moved=true;aim.dx=dx/d;aim.dy=dy/d;aim.distance=d}aim.cancel=aim.moved&&d<18;$('#aimhint').textContent=aim.cancel?'放開取消':'放開施放 · 拉回技能鍵取消'});
 skillButton.addEventListener('pointerup',e=>{if(aim.id!==e.pointerId)return;const target=aim.moved?aimPosition():null,cancel=aim.cancel;clearAim();if(!cancel&&mode==='play')skill(target)});for(const event of ['pointercancel','lostpointercapture'])skillButton.addEventListener(event,()=>clearAim());
 document.addEventListener('visibilitychange',()=>{if(audioCtx){if(document.hidden)audioCtx.suspend().catch(()=>{});else if(preferences.sound)audioCtx.resume().catch(()=>{})}clearAim()});
}
