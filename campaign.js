'use strict';
// Stable map IDs are serialized; the first nine keep their 0.8.0 identities.
// v0.9.0 adds act four (IDs 9-11), a themed procedural ground for every map, and
// replaces the shared boss state machine with one hand-authored kit per boss.
const campaignMaps=[
 {name:'燼落迴廊',act:'無聲聖所',subtitle:'灰燼之門',color:'#e2a35e',theme:'sanctum',art:0,enemy:'獵異火炬兵',boss:'銅鐘處刑官',relic:'餘燼喪鐘',slot:'weapon',effect:'split',lv:1,roles:[.6,.18,.22],tint:null},
 {name:'寒骨庭院',act:'無聲聖所',subtitle:'霜封墓穴',color:'#8ed8ed',theme:'frost',art:1,enemy:'霜誓弩衛',boss:'冰盾女將',relic:'寒骨鎖墜',slot:'amulet',effect:'guard',lv:3,roles:[.35,.25,.4],tint:'#9fd0e8'},
 {name:'噤聲鐘殿',act:'無聲聖所',subtitle:'最後的鐘鳴',color:'#bd9dec',theme:'bell',art:2,enemy:'白燼侍祭',boss:'聖鐘審判長',relic:'噤聲王冠',slot:'helmet',effect:null,lv:5,roles:[.35,.3,.35],tint:'#cbb2f0'},
 {name:'赤雨街市',act:'鐵誓城',subtitle:'封鎖的市場',color:'#e7816d',theme:'city',art:3,enemy:'赤甲戟衛',boss:'鐵誓劊子手',relic:'赤雨斷城戟',slot:'weapon',effect:null,lv:7,roles:[.5,.3,.2],tint:'#e8a184'},
 {name:'鏽渠鑄坊',act:'鐵誓城',subtitle:'運河與熔爐',color:'#b7c785',theme:'foundry',art:4,enemy:'鏽渠破壞者',boss:'鉤索督軍',relic:'鏽渠踏浪靴',slot:'legs',effect:null,lv:9,roles:[.4,.35,.25],tint:'#d0a86a'},
 {name:'白庭裁判所',act:'鐵誓城',subtitle:'沉默的判決',color:'#e3d7b3',theme:'graveyard',art:5,enemy:'白庭火銃手',boss:'蒼白大法官',relic:'無赦法衣',slot:'chest',effect:null,lv:11,roles:[.25,.25,.5],tint:'#d8dcc0'},
 {name:'零壓登艦艙',act:'葬星艦',subtitle:'星艦氣閘',color:'#82caee',theme:'ship',art:6,enemy:'登艦陸戰兵',boss:'重裝艦尉',relic:'真空裂甲拳套',slot:'offhand',effect:null,lv:13,roles:[.45,.35,.2],tint:'#9ed2f0'},
 {name:'熾核機輪室',act:'葬星艦',subtitle:'失控的核心',color:'#f1b569',theme:'inferno',art:7,enemy:'熾核工程兵',boss:'熔心機械師',relic:'熾核束帶',slot:'belt',effect:null,lv:16,roles:[.35,.35,.3],tint:'#ffb066'},
 {name:'寂星指揮橋',act:'葬星艦',subtitle:'人類遠征終站',color:'#baa9ff',theme:'ship',art:8,enemy:'寂星狙擊手',boss:'葬星航督',relic:'寂星稜戒',slot:'ring',effect:null,lv:19,roles:[.25,.25,.5],tint:'#c2b0ff'},
 {name:'迴響林墟',act:'燼海回響',subtitle:'會呼吸的林',color:'#8fc06a',theme:'forest',art:5,grade:'#3f6b3a',enemy:'林行獵隊',boss:'林骸牧者',relic:'迴響喪環',slot:'ring',effect:'convert',lv:22,roles:[.45,.3,.25],tint:'#a8cf80'},
 {name:'霧鏡仙庭',act:'燼海回響',subtitle:'不該存在的花園',color:'#8fe0d4',theme:'fae',art:2,grade:'#2f7f78',enemy:'鏡庭巡衛',boss:'鏡影女王',relic:'霧鏡之心',slot:'weapon',effect:'infernal',lv:25,roles:[.3,.25,.45],tint:'#9ef0e2'},
 {name:'無聲之核',act:'燼海回響',subtitle:'鐘的盡頭',color:'#9f8ff5',theme:'abyss',art:8,grade:'#4a3a8a',enemy:'核心守望者',boss:'無聲之核',relic:'無聲王冠',slot:'helmet',effect:'silence',lv:28,roles:[.3,.3,.4],tint:'#b0a0ff'}
];
const elementNames=['焚火','骨刺','虛空','寒霜','血蝕','回聲'];
// --- one authored kit per boss ------------------------------------------------
// size/reach/pace differ so they do not all read as "another big one", and each
// carries its own traits. Moves are drawn at random from the phase's pool, so no
// two fights play back the same order.
const bossKits=[
 {scale:1.55,r:38,pace:.86,hp:1,phases:3,traits:['heavy'],pools:[['fan','execute'],['fan','execute','quake'],['fan','quake','wall']],windup:[1.05,.9,.72]},
 {scale:1.42,r:40,pace:.9,hp:1.15,phases:3,traits:['reflect'],pools:[['wall','frostfield'],['wall','frostfield','charge'],['frostfield','charge','quake']],windup:[.95,.82,.7]},
 {scale:1.72,r:44,pace:1,hp:1,phases:3,traits:['float','summoner'],pools:[['orbit','beam'],['orbit','beam','summon'],['orbit','beam','summon','rain']],windup:[1,.85,.7]},
 {scale:1.85,r:47,pace:1.25,hp:1.2,phases:3,traits:['frenzy'],pools:[['charge'],['charge','quake'],['charge','quake','hook']],windup:[.8,.66,.52]},
 {scale:1.32,r:33,pace:1.3,hp:.9,phases:3,traits:['agile'],pools:[['hook','mines'],['hook','mines','decoy'],['hook','decoy','volley']],windup:[.78,.66,.54]},
 {scale:1.62,r:36,pace:.92,hp:1.05,phases:3,traits:['curser'],pools:[['pillars','curse'],['pillars','curse','cross'],['pillars','cross','rain']],windup:[1,.86,.72]},
 {scale:2,r:53,pace:.72,hp:1.5,phases:2,traits:['armored','heavy'],pools:[['charge','wall'],['charge','wall','quake']],windup:[1.15,.92]},
 {scale:1.5,r:40,pace:1,hp:1.1,phases:3,traits:['summoner'],pools:[['mines','overheat'],['mines','overheat','rain'],['mines','rain','summon']],windup:[.95,.8,.64]},
 {scale:1.6,r:40,pace:1.05,hp:1.15,phases:3,traits:['sniper'],pools:[['volley','beam'],['volley','beam','orbit'],['volley','beam','orbit','rift']],windup:[.9,.76,.6]},
 {scale:1.78,r:45,pace:.88,hp:1.3,phases:3,traits:['summoner','regen'],pools:[['summon','root'],['summon','root','rain'],['summon','root','quake']],windup:[1.05,.9,.74]},
 {scale:1.38,r:34,pace:1.2,hp:1.05,phases:3,traits:['teleport','trickster'],pools:[['decoy','rift'],['decoy','rift','orbit'],['decoy','rift','orbit','curse']],windup:[.72,.62,.5]},
 {scale:2.15,r:57,pace:.95,hp:1.75,phases:3,traits:['shielded','summoner','enrage'],pools:[['beam','orbit'],['beam','orbit','pillars','summon'],['beam','orbit','pillars','summon','quake']],windup:[.95,.78,.6]}
];
// Tinting has to happen on a copy of the sprite. Doing it on the live canvas with
// source-atop tinted the background too, which is where the rectangle came from.
const tintCache=new Map();
function tintedTile(tile,colour,key){
 if(!tile)return tile;
 const hit=tintCache.get(key);if(hit)return hit;
 const t=document.createElement('canvas');t.width=tile.width;t.height=tile.height;
 const g=t.getContext('2d');g.drawImage(tile,0,0);
 g.globalCompositeOperation='source-atop';g.globalAlpha=.2;g.fillStyle=colour;g.fillRect(0,0,t.width,t.height);
 g.globalCompositeOperation='source-over';g.globalAlpha=1;t.trim=tile.trim;
 if(tintCache.size>160)tintCache.clear();
 tintCache.set(key,t);return t;
}
const expeditionFloorArt=new Image(),humanArt=new Image(),relicArt=new Image();
const expeditionFloors=[],humanFrames=[],relicFrames=[];
let campaignCleared=[],pendingRewards=[];
function mapSpec(id=routeStage){return campaignMaps[id]||campaignMaps[0]}
function bossKit(id){return bossKits[id]||bossKits[0]}
function resetCampaign(){runSeed=(Math.random()*4294967296)>>>0;terrainCache.clear();resetExplore();campaignCleared=[];pendingRewards=[];skillVisuals.length=0;$('#bossbar b').textContent=mapSpec().boss;
 // Exploration replaces the wave timer: the garrison is placed up front.
 populateMap(routeStage);wave=routeStage*3+1;p.x=entryPoint().x;p.y=entryPoint().y;}
function prepareExpeditionFloors(){for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=Math.floor(expeditionFloorArt.naturalWidth/3);c.height=Math.floor(expeditionFloorArt.naturalHeight/2);c.getContext('2d').drawImage(expeditionFloorArt,(i%3)*expeditionFloorArt.naturalWidth/3,Math.floor(i/3)*expeditionFloorArt.naturalHeight/2,expeditionFloorArt.naturalWidth/3,expeditionFloorArt.naturalHeight/2,0,0,c.width,c.height);expeditionFloors.push(c)}}
function migrateCampaignSave(input){
 if(!input||input.format!=='ash-bell-adventure')return input;
 let s=input;
 if(s.version===1){
  // Clone: importing never alters the caller's backup JSON object.
  s=JSON.parse(JSON.stringify(input));s.version=2;s.campaignCleared=Array.from({length:Math.max(0,Math.min(2,s.routeStage||0))},(_,i)=>i);
  s.wave=(s.routeStage||0)*3+Math.max(0,s.wave-(s.routeStage||0)*2);
  if(s.pendingChapter>=1){s.campaignCleared=Array.from({length:s.pendingChapter},(_,i)=>i);s.wave=s.pendingChapter*3;}
  if(s.runOutcome==='won'){s.campaignCleared=[0,1,2];s.runOutcome=null;s.pendingChapter=3;s.wave=9;}
  s.foes=(s.foes||[]).map(f=>({...f,campaign:true,mapId:s.routeStage,name:f.type===3?mapSpec(s.routeStage).boss:mapSpec(s.routeStage).enemy}));
 }
 if(s.version===2){
  if(s===input)s=JSON.parse(JSON.stringify(input));
  s.version=3;s.pendingRewards=[];s.levelFloorApplied=false;s.runSeed=(Math.random()*4294967296)>>>0;
  // A finished 0.8.x run continues into act four instead of ending.
  if(s.runOutcome==='won'&&(s.campaignCleared||[]).length>=9){s.runOutcome=null;s.pendingChapter=9;s.wave=27;}
 }
 if(s.version===3){
  if(s===input)s=JSON.parse(JSON.stringify(input));
  s.version=4;
  // Skill levels are read back out of the old ranks, and the character is handed
  // the attribute and upgrade points its level has already earned.
  s.progression=progressionMigrate(s);
 }
 if(s.version===4){
  if(s===input)s=JSON.parse(JSON.stringify(input));
  s.version=5;s.runTier=0;s.tiersCleared=[false,false,false];
  // The experience curve changed shape with the level-50 cap, so banked progress
  // toward the next level is meaningless. The level itself is kept.
  s.xp=0;
 }
 return s;
}
// BUG-009 companion: only pre-0.9 saves get a one-time floor, two levels below the
// map's recommendation, so a stranded old save is playable without gifting levels.
function applyLegacyLevelFloor(){const floor=Math.max(1,monsterLevel()-2);while(level<floor)collectExperience(experienceRequired(level)-xp)}
// A map is worth the experience it takes to cross its own level band, which now
// moves with the tier because the monsters do.
function campaignXPBudget(id){
 const start=monsterLevel(id);
 const end=Math.min(LEVEL_CAP,id===campaignMaps.length-1?start+3:monsterLevel(id+1));
 let total=0;for(let lv=start;lv<Math.max(start+1,end);lv++)total+=experienceRequired(lv);return total;
}
// Diablo II pays almost nothing for a monster far beneath you. That is what stops
// the first tier at about level thirty-four instead of needing an artificial gate.
function campaignExperience(f){
 const id=f.mapId??routeStage,budget=campaignXPBudget(id);
 const raw=f.type===3?budget*.26:budget*.74/(34+id*6)*(f.elite?1.8:1)*rnd(.85,1.18);
 return raw*experiencePenalty(level,monsterLevel(id));
}
function campaignRelic(id){const m=mapSpec(id),item=createEquipment(m.slot,true);item.name=m.relic;item.relicMap=id;item.rarity='legendary';item.effect=m.effect;item.power=['weapon','offhand'].includes(m.slot)?Math.round(rnd(18,26)+id*4):0;
 item.stats={damage:Math.round(rnd(3,6))+id*2,hp:Math.round(rnd(8,14))+id*5,...(id===4?{speed:15}:id===7?{regen:3}:id===8?{haste:15}:id===9?{haste:10,speed:10}:id===10?{damage:12}:id===11?{armor:10,regen:4}:{})};
 if(m.effect==='convert'){item.convert=Math.floor(rnd(0,5));item.description=statsText(item.stats)+' · 元素轉換：'+elementNames[item.convert]}
 else if(m.effect==='infernal'){item.convert=0;item.description=statsText(item.stats)+' · 元素轉換：焚火，命中留下燃燒地面'}
 else if(m.effect==='silence'){item.description=statsText(item.stats)+' · 首領傷害 -15%'}
 else item.description=statsText(item.stats)+(m.effect==='guard'?' · 守護：生命 +30、減傷 12%':m.effect==='split'?' · 火球分裂':'');
 return item;}
// BUG-007: a full pack used to drop the map's unique relic on the floor, and leaving
// the map deleted it forever. Guaranteed rewards now queue until there is space.
function queueReward(item){pendingRewards.push(item);toast('背包滿 · '+item.name+' 已保留，騰出空位就會自動入袋');playSfx('relic',p?.x)}
function grantPendingRewards(){if(!pendingRewards.length||!p||mode==='select')return;for(let i=0;i<pendingRewards.length;i++){if(awardGear(pendingRewards[i])){pendingRewards.splice(i,1);i--}else break}}
function campaignBossDefeated(f){
 const id=f.mapId??routeStage;if(campaignCleared.includes(id))return;
 campaignCleared.push(id);const item=campaignRelic(id);
 if(!awardGear(item))queueReward(item);
 skillPoints+=2;syncSkillLabel();waveSpawn=0;foes=[];shots=[];hazards=[];castFields=[];
 if(id===campaignMaps.length-1){campaignTierCleared();}
 else{pendingChapter=id+1;saveProgress(true);showChapterGate();}
}
// Finishing the twelfth map used to shove the character straight to the level cap
// and end the run. With three tiers it instead unlocks the next one and hands the
// same character over: level, gear, points and all.
function campaignTierCleared(){
 tiersCleared[runTier]=true;runOutcome='won';saveProgress(true);
 const next=runTier+1;
 if(next>=tierDefs.length){end(true);return}
 const spec=tierDefs[next];
 openModal(tierSpec().name+' 週目 · 完成','鐘聲，再次響起',
  classes[chosen].name+' · LV.'+level+' · 擊破 '+kills+'。人物、裝備、技能點全部帶落去；'+spec.name+' 嘅怪物等級高 '+spec.offset+' 級。',
  [['進入 '+spec.name+' 週目',spec.note,()=>{runOutcome=null;enterTier(next)}],
   ['先整理裝備','稍後喺選角畫面按「繼續遊戲」再入',()=>panelOpen('gear')],
   ['結束呢局','返回選角畫面',()=>end(true)]]);
}
function rollGuardRole(){const w=mapSpec().roles||[.4,.3,.3],r=Math.random();return r<w[0]?0:r<w[0]+w[1]?1:2}
function campaignSpawn(type){
 const m=mapSpec(),variant=Math.max(0,Math.min(2,type)),angle=rnd(0,Math.PI*2),at={x:p.x+Math.cos(angle)*rnd(300,430),y:p.y+Math.sin(angle)*rnd(300,430)};confine(at);
 const base=95*Math.pow(1.33,routeStage)*rnd(.86,1.2),health=base*[.85,1.65,1][variant]*difficulty().hp*tierSpec().hp;
 // build variation is per-enemy so a wave never reads as one repeated cut-out
 const build=rnd(.86,1.16),lanky=rnd(.9,1.12);
 const f={...at,type:variant,campaign:true,mapId:routeStage,name:m.enemy+[' · 突擊',' · 重裝',' · 遠射'][variant],hp:health,maxhp:health,r:(variant===1?24:18)*build,speed:(72+routeStage*3-variant*9)*difficulty().speed*tierSpec().speed*rnd(.88,1.14),color:m.color,hit:0,attack:rnd(.8,1.9),phase:rnd(0,6),action:0,state:'emerge',stateT:rnd(.45,.85),walk:rnd(0,6),burn:0,burnTick:0,frozen:0,scale:(variant===1?1.18:1)*build,lanky,gait:rnd(.85,1.2),bob:rnd(.7,1.4)};
 modifyEnemy(f);foes.push(f);ring(f.x,f.y,m.color,30,.6);return f;
}
function spawnEscort(boss,count){for(let i=0;i<count;i++){const a=i*Math.PI*2/count+rnd(-.3,.3),at={x:boss.x+Math.cos(a)*rnd(120,190),y:boss.y+Math.sin(a)*rnd(85,135)};confine(at);const f=campaignSpawn(rollGuardRole());f.x=at.x;f.y=at.y;f.escortOf=boss.serial;f.stateT=.4;ring(f.x,f.y,'#ffd9a0',34,.5)}playSfx('summon',boss.x)}
function livingEscorts(boss){return foes.filter(f=>f.hp>0&&f.escortOf===boss.serial).length}
function campaignNextWave(){
 // In exploration mode waves do not exist; calling this means "bring on the boss".
 if(exploring){if(!bossSpawned)exploreForceBoss();return}
 if(pendingChapter>=0||campaignCleared.includes(routeStage))return;
 const local=wave-routeStage*3,m=mapSpec(),kit=bossKit(routeStage);
 if(local>=2){wave=routeStage*3+3;waveSpawn=0;bossSpawned=true;
 const hp=1635*Math.pow(1.41,routeStage)*kit.hp*difficulty().hp*tierSpec().hp*rnd(.94,1.08),speed=(58+routeStage*4)*kit.pace*difficulty().speed*tierSpec().speed;
 const boss={x:1080,y:470,type:3,campaign:true,mapId:routeStage,name:m.boss,hp,maxhp:hp,r:kit.r,speed,baseSpeed:speed,attack:1.2,phase:0,bossPhase:0,serial:++spawnSerial,action:0,state:'seek',stateT:0,walk:0,scale:kit.scale,burn:0,burnTick:0,frozen:0,guardUp:0,hit:0,bob:kit.traits.includes('float')?1.8:.8,gait:kit.pace};
 if(kit.traits.includes('shielded'))boss.guardUp=1;
 foes.push(boss);if(kit.traits.includes('shielded'))spawnEscort(boss,4);
 $('#bossbar').hidden=false;$('#bossbar b').textContent=m.boss;toast(m.boss+' · '+bossHint(routeStage));playSfx('boss',1080);
 }else{wave++;bossSpawned=false;waveSpawn=Math.round((14+routeStage*3+(local===1?6:0))*rnd(.9,1.15));spawnTimer=.5;toast(m.name+' · 第 '+(local+1)+' 波守軍');p.hp=Math.min(p.maxhp,p.hp+25);p.mp=100;}
}
function bossHint(id){const t=bossKit(id).traits;
 return t.includes('shielded')?'護衛結界 · 先清護衛':t.includes('reflect')?'立盾時反傷 · 等佢收盾':t.includes('armored')?'重甲 · 衝鋒後有破綻':t.includes('teleport')?'會閃現同放分身':t.includes('regen')?'會回血 · 要壓輸出':t.includes('summoner')?'會不斷召援':t.includes('frenzy')?'越打越快':'留意地面預警'}
function campaignEnter(stage){
 if(stage!==pendingChapter||stage<1||stage>campaignMaps.length-1)return;
 for(const d of drops)if(d.type==='gear'){if(bag.length<70){delete d.item.grid;bag.push(d.item)}else if(d.item.rarity==='legendary')queueReward(d.item);}
 routeStage=stage;pendingChapter=-1;wave=stage*3+1;bossSpawned=false;waveSpawn=0;rest=2;
 foes=[];shots=[];drops=[];hazards=[];turrets=[];castFields=[];wards=[];casts.length=0;burnZones.length=0;dashFields.length=0;corpses.length=0;effects=[];particles.length=0;scorches.length=0;ghosts.length=0;numbers=[];skillVisuals.length=0;
 populateMap(stage);
 p.x=entryPoint().x;p.y=entryPoint().y;p.hp=Math.min(p.maxhp,p.hp+60);p.mp=100;p.inv=2;p.chill=0;p.poison=0;p.curse=0;
 potions=Math.max(potions,Math.min(potionCap(),3));grantPendingRewards();
 $('#modal').hidden=true;$('#bossbar').hidden=true;mode='play';cancelMouse();chapterFade=1;saveProgress(true);
}
function campaignGate(){const stage=pendingChapter;if(stage<1)return;const m=mapSpec(stage),loose=drops.filter(d=>d.type==='gear').length,extra=loose&&bag.length>=70?' ⚠️ 地上仲有 '+loose+' 件裝備，背包已滿。傳奇會自動保留，其餘離開後唔會帶走。':'';
 openModal('地圖 '+stage+' / '+campaignMaps.length+' · 完成',mapSpec(stage-1).name+' · 守軍已退', '下一站：'+m.act+' · '+m.name+'（建議 LV.'+m.lv+'）。成長與裝備會保留。'+extra,[['前往 '+m.name,m.subtitle,()=>enterChapter(stage)],['整理裝備','換裝或騰出背包空間',()=>panelOpen('gear')],['返回戰場拾取','整理後拾取遺物，再按「前往下一圖」',()=>{$('#modal').hidden=true;mode='play'}],['儲存進度','保存目前檢查點',()=>saveProgress(false)]]);
}
// --- boss moves ---------------------------------------------------------------
function bossDamage(f){return 10*Math.pow(1.29,f.mapId)*rnd(.9,1.15)}
function bossMove(f,move,aim,at){
 const phase=f.bossPhase||0,dmg=bossDamage(f),m=mapSpec(f.mapId);
 switch(move){
  case 'fan':{const n=6+phase*2+Math.floor(rnd(0,2));for(let i=0;i<n;i++)enemyShot(f.x,f.y,aim+(i-(n-1)/2)*rnd(.16,.22),150+f.mapId*5,dmg,2);playSfx('cast',f.x,0);break}
  case 'orbit':{const n=10+phase*4;for(let i=0;i<n;i++)enemyShot(f.x,f.y,i*Math.PI*2/n+f.phase,140+f.mapId*5,dmg,2);f.phase+=rnd(.2,.45);playSfx('cast',f.x,2);break}
  case 'cross':{const arm=2+phase;for(let i=-arm;i<=arm;i++){hazards.push({x:at.x+i*65,y:at.y,r:44,life:.72,max:.72,damage:dmg});hazards.push({x:at.x,y:at.y+i*50,r:44,life:1,max:1,damage:dmg})}break}
  case 'mines':{const n=4+phase*2+Math.floor(rnd(0,3));for(let i=0;i<n;i++){const a=i*Math.PI*2/n+rnd(-.2,.2),d=rnd(85,135);castFields.push({kind:'danger',x:at.x+Math.cos(a)*d,y:at.y+Math.sin(a)*d*.75,r:rnd(44,58),delay:rnd(.75,1.15)+i*.08,life:3,element:f.mapId%2?0:1,damage:dmg})}break}
  case 'charge':{f.state='charge';f.stateT=rnd(.42,.6);f.chargeA=aim;f.chargeLeft=1+phase+(f.traits.includes('frenzy')?1:0);playSfx('roar',f.x,3);break}
  case 'quake':{const rings=2+phase;for(let k=1;k<=rings;k++)for(let i=0;i<8+k*3;i++){const a=i*Math.PI*2/(8+k*3);hazards.push({x:f.x+Math.cos(a)*k*130,y:f.y+Math.sin(a)*k*95,r:66,life:.5+k*.28,max:.5+k*.28,damage:dmg*.85})}shake=11;playSfx('quake',f.x);break}
  case 'wall':{const gap=Math.floor(rnd(0,7)),n=9;for(let i=0;i<n;i++){if(i===gap||i===gap+1)continue;enemyShot(f.x,f.y,aim+(i-(n-1)/2)*.16,120+f.mapId*4,dmg,2)}break}
  case 'volley':{f.state='volley';f.stateT=1+phase*.22;f.volleyTick=0;f.volleyLeft=3+phase;break}
  case 'beam':{f.state='beam';f.stateT=1.3+phase*.3;f.beamA=aim;f.beamTick=0;f.beamDir=Math.random()<.5?1:-1;f.beamSpin=rnd(.35,.85);playSfx('beam',f.x);break}
  case 'pillars':{const n=5+phase*2,a=aim+rnd(-.12,.12);for(let i=0;i<n;i++)castFields.push({kind:'danger',x:f.x+Math.cos(a)*(120+i*115),y:f.y+Math.sin(a)*(120+i*115)*.8,r:60,delay:.45+i*rnd(.09,.14),life:3,element:0,damage:dmg});break}
  case 'rift':{const a=rnd(0,Math.PI*2),to={x:p.x+Math.cos(a)*rnd(150,220),y:p.y+Math.sin(a)*rnd(110,160)};confine(to);
   castFields.push({kind:'danger',x:f.x,y:f.y,r:120,delay:.35,life:2,element:2,damage:dmg});
   f.x=to.x;f.y=to.y;ring(f.x,f.y,'#c0a8ff',150,.7);playSfx('rift',f.x);
   const n=7+phase*3;for(let i=0;i<n;i++)enemyShot(f.x,f.y,i*Math.PI*2/n+rnd(0,.4),150,dmg*.8,2);break}
  case 'hook':{f.state='hook';f.stateT=1.05;f.hookA=aim;f.hookDone=false;f.hookFireAt=.6;playSfx('charge',f.x);break}
  case 'execute':{f.state='execute';f.stateT=.85;f.execA=aim;playSfx('roar',f.x,0);break}
  case 'frostfield':{const n=3+phase;for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),d=rnd(60,220);castFields.push({kind:'danger',x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d*.75,r:rnd(60,88),delay:rnd(.8,1.3),life:3,element:3,damage:dmg*.8})}break}
  case 'rain':{const n=5+phase*3;for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),d=rnd(0,330);castFields.push({kind:'danger',x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d*.75,r:rnd(52,74),delay:rnd(.6,1.6),life:3,element:0,damage:dmg*.9})}break}
  case 'overheat':{f.overheat=2.2;f.state='recover';f.stateT=2.2;playSfx('charge',f.x);break}
  case 'curse':{p.curse=Math.max(p.curse||0,5+phase);toast('被詛咒 · 回復與護盾減半');num(p.x,p.y-90,'詛咒','#c58fe0');playSfx('curse',f.x);break}
  case 'root':{castFields.push({kind:'vortex',x:p.x,y:p.y,r:130+phase*30,life:3.5,tick:0,damage:dmg*.5,element:1,rank:2,enemyOwned:true});break}
  case 'decoy':{const n=1+phase;for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),at2={x:f.x+Math.cos(a)*rnd(160,260),y:f.y+Math.sin(a)*rnd(110,180)};confine(at2);
   const hp=Math.max(40,f.maxhp*.06);foes.push({...at2,type:2,campaign:true,decoy:true,mapId:f.mapId,name:m.boss+' · 鏡影',hp,maxhp:hp,r:22,speed:f.baseSpeed*1.15,color:'#cfc3ff',hit:0,attack:rnd(.6,1.2),phase:rnd(0,6),action:0,state:'seek',stateT:0,walk:0,burn:0,burnTick:0,frozen:0,scale:f.scale*.62,escortOf:f.serial,affix:'plain',affixIndex:0,lanky:1,gait:1,bob:1})}
   ring(f.x,f.y,'#cfc3ff',120,.6);playSfx('rift',f.x);break}
  case 'summon':{spawnEscort(f,2+phase);break}
 }
}
function updateBoss(f,dt){
 const kit=bossKit(f.mapId);f.traits=kit.traits;
 const phase=f.hp<=f.maxhp*(kit.phases===2?.4:.33)?kit.phases-1:f.hp<=f.maxhp*.7?Math.min(1,kit.phases-1):0;
 if(phase>(f.bossPhase||0)){
  f.bossPhase=phase;f.state='recover';f.stateT=1;f.attack=.8;f.speed=f.baseSpeed*(1+phase*(kit.traits.includes('frenzy')?.42:.24));
  shake=12;ring(f.x,f.y,'#ffd08a',230,.9);sparks(f.x,f.y,mapSpec(f.mapId).color,40,240);playSfx('phase',f.x);
  if(kit.traits.includes('shielded')){f.guardUp=1;spawnEscort(f,3+phase)}
  else if(kit.traits.includes('summoner'))spawnEscort(f,1+phase);
  toast(f.name+' · 第 '+(phase+1)+' 階段');
  return;
 }
 if(f.guardUp&&livingEscorts(f)===0){f.guardUp=0;toast(f.name+' 結界破碎');playSfx('break',f.x)}
 if(kit.traits.includes('regen')&&f.hp<f.maxhp)f.hp=Math.min(f.maxhp,f.hp+f.maxhp*.012*dt);
 if(f.overheat>0){f.overheat-=dt;if(f.overheat<=0)burstBossOverheat(f);return}
 const d=dist(f,p),a=Math.atan2(p.y-f.y,p.x-f.x);f.facing=a;
 if(f.state==='beam'){
  f.beamTick-=dt;f.beamA+=f.beamDir*dt*f.beamSpin;
  if(f.beamTick<=0){f.beamTick=.1;const dmg=bossDamage(f)*.55;for(const off of (f.bossPhase>=2?[0,Math.PI]:[0]))enemyShot(f.x,f.y,f.beamA+off,180+f.mapId*5,dmg,2)}
  if(f.stateT<=0){f.state='recover';f.stateT=.5}return;
 }
 if(f.state==='volley'){
  f.volleyTick-=dt;
  if(f.volleyTick<=0&&f.volleyLeft>0){f.volleyLeft--;f.volleyTick=rnd(.2,.32);const lead=Math.atan2(p.y+(p.dy||0)*80-f.y,p.x+(p.dx||0)*80-f.x),dmg=bossDamage(f);for(let i=-1;i<=1;i++)enemyShot(f.x,f.y,lead+i*.12,240+f.mapId*6,dmg,f.mapId%4)}
  if(f.stateT<=0){f.state='recover';f.stateT=.45}return;
 }
 if(f.state==='charge'){
  const sp=(340+(f.bossPhase||0)*70)*(f.traits.includes('heavy')?.85:1);
  f.x+=Math.cos(f.chargeA)*sp*dt;f.y+=Math.sin(f.chargeA)*sp*dt;f.walk+=dt*12;confine(f);
  if(d<f.r+26)hurt(10+f.mapId*2,null,{contact:true});
  if(f.stateT<=0){if((f.chargeLeft=(f.chargeLeft||1)-1)>0){f.stateT=rnd(.35,.5);f.chargeA=Math.atan2(p.y-f.y,p.x-f.x);ring(f.x,f.y,mapSpec(f.mapId).color,60,.3)}else{f.state='recover';f.stateT=f.traits.includes('armored')?1.15:.6}}
  return;
 }
 if(f.state==='hook'){
  // Telegraphed for 0.45s, narrower, shorter, and a dash's i-frames break it.
  if(!f.hookDone&&f.stateT<=f.hookFireAt){
   f.hookDone=true;const reach=380;
   const offAngle=Math.abs(((Math.atan2(p.y-f.y,p.x-f.x)-f.hookA+Math.PI*3)%(Math.PI*2))-Math.PI);
   if(p.inv>0){toast('閃開咗勾索');ring(p.x,p.y,'#9fe0c8',70,.4)}
   else if(offAngle<.26&&d<reach){
    const pull=Math.min(Math.max(0,d-90),180);p.x-=Math.cos(f.hookA)*pull;p.y-=Math.sin(f.hookA)*pull;confine(p);cancelMouse();
    hurt(9+f.mapId*2,null,{contact:true});toast('被勾索拉埋身 · 閃避可以避開');playSfx('hook',p.x)}
  }
  if(f.stateT<=0){f.state='recover';f.stateT=.5}return;
 }
 if(f.state==='execute'){
  if(f.stateT<=0){const reach=f.r+150;
   if(d<reach&&Math.abs(((Math.atan2(p.y-f.y,p.x-f.x)-f.execA+Math.PI*3)%(Math.PI*2))-Math.PI)<.75)hurt(26+f.mapId*3,null,{contact:true});
   ring(f.x+Math.cos(f.execA)*90,f.y+Math.sin(f.execA)*70,'#ffb08a',160,.4);sparks(f.x,f.y,'#ffb08a',26,190);shake=9;
   f.state='recover';f.stateT=.75}
  return;
 }
 if(f.state==='windup'){
  if(f.stateT>0)return;
  f.state='recover';f.stateT=Math.max(.26,.5-(f.bossPhase||0)*.09);
  const at=f.aim||{x:p.x,y:p.y},aim=Math.atan2(at.y-f.y,at.x-f.x);
  const pool=kit.pools[Math.min(kit.pools.length-1,f.bossPhase||0)];
  let move=pool[Math.floor(rnd(0,pool.length))];
  if(move===f.lastMove&&pool.length>1)move=pool[(pool.indexOf(move)+1+Math.floor(rnd(0,pool.length-1)))%pool.length];
  f.lastMove=move;bossMove(f,move,aim,at);
  return;
 }
 if(f.state==='recover'){if(f.stateT<=0)f.state='seek';return}
 const range=(kit.traits.includes('sniper')?330:kit.traits.includes('heavy')?200:250)-(f.bossPhase||0)*30;
 if(d>range){f.x+=Math.cos(a)*f.speed*dt;f.y+=Math.sin(a)*f.speed*dt;f.walk+=f.speed*dt/12;confine(f)}
 else if(kit.traits.includes('agile')&&d<range*.6){f.x-=Math.cos(a)*f.speed*.7*dt;f.y-=Math.sin(a)*f.speed*.7*dt;f.walk+=f.speed*dt/14;confine(f)}
 if(f.attack<=0){f.state='windup';f.stateT=kit.windup[Math.min(kit.windup.length-1,f.bossPhase||0)]*rnd(.85,1.15);f.aim={x:p.x,y:p.y};f.attack=(3.2-(f.bossPhase||0)*.75)*difficulty().tempo*rnd(.82,1.2)}
}
function burstBossOverheat(f){f.overheat=0;const n=18;for(let i=0;i<n;i++)enemyShot(f.x,f.y,i*Math.PI*2/n,200,bossDamage(f)*1.1,0);sparks(f.x,f.y,'#ff9a4a',40,260);shake=13;playSfx('boss',f.x)}
function updateCampaignEnemy(f,dt){
 if(f.state==='emerge'){if(f.stateT<=0)f.state='seek';return;}
 if(f.type===3){updateBoss(f,dt);return}
 const d=dist(f,p),a=Math.atan2(p.y-f.y,p.x-f.x),m=mapSpec(f.mapId);f.facing=a;
 if(f.state==='windup'){
  if(f.stateT>0)return;f.state='recover';f.stateT=rnd(.42,.66);
  const at=f.aim||{x:p.x,y:p.y},aim=Math.atan2(at.y-f.y,at.x-f.x),dmg=4*Math.pow(1.3,f.mapId)*rnd(.85,1.2);
  if(f.type===2){for(let i=0;i<(f.mapId>=6?3:1);i++)enemyShot(f.x,f.y,aim+(i-(f.mapId>=6?1:0))*.16,175+f.mapId*8,dmg,f.mapId%4,f.affix)}
  else if(f.type===0){f.state='charge';f.stateT=rnd(.2,.32);f.chargeA=aim}
  else if(d<85){hurt(dmg+3,f.affix,{contact:true});ring(f.x,f.y,m.color,80,.3)}
  return;
 }
 if(f.state==='charge'){f.x+=Math.cos(f.chargeA)*330*dt;f.y+=Math.sin(f.chargeA)*330*dt;f.walk+=dt*12;confine(f);if(d<50)hurt(3.4*Math.pow(1.3,f.mapId),f.affix,{contact:true});if(f.stateT<=0){f.state='recover';f.stateT=.7}return;}
 if(f.state==='recover'){if(f.stateT<=0)f.state='seek';return;}
 const range=f.type===2?300:f.type===0?150:65;
 if(d>range||f.type===2&&d<170){const sign=f.type===2&&d<170?-1:1,s=f.speed*(f.slow>0?.5:1)*(f.affix==='haste'?1.45:1);f.x+=Math.cos(a)*s*dt*sign;f.y+=Math.sin(a)*s*dt*sign;f.walk+=s*dt*(f.gait||1)/12;confine(f);}
 if(d<range+45&&f.attack<=0){f.state='windup';f.stateT=rnd(.5,.72);f.aim={x:p.x,y:p.y};f.attack=rnd(1.5,2.4)*difficulty().tempo;}
}
function drawCampaignEnemy(f,dead){
 const directed=directionalEnemyTile(f),tile=directed?.tile||humanFrames[(f.type===3?9:0)+((f.mapId??routeStage)%9)];if(!tile)return false;
 const m=mapSpec(f.mapId),lanky=f.lanky||1;
 const height=(f.type===3?150*(f.scale/1.65):88)*(f.type===1?1.15:1)*lanky*(f.type===3?1:(f.scale||1));
 const moving=['seek','charge','sweep','hook'].includes(f.state)&&!f.frozen;
 const step=Math.abs(Math.sin(f.walk||0)),lift=moving?step*3*(f.bob||1):0,hover=f.type===3&&(f.bob||0)>1.4?Math.sin(time*1.6+f.phase)*6:0;
 ctx.save();ctx.globalAlpha=dead?Math.min(.55,f.fade/5):1;
 // contact shadow tracks the step so nothing looks like it is floating
 ctx.fillStyle='#05070a';ctx.globalAlpha=(dead?.3:.5)*(1-lift/9);ctx.beginPath();ctx.ellipse(f.x,f.y,height*.2*(1-lift/26),9*(1-lift/22),0,0,7);ctx.fill();ctx.globalAlpha=dead?Math.min(.55,f.fade/5):1;
 if(!dead&&f.state==='windup'&&f.aim){ctx.strokeStyle='#ff755e';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.aim.x,f.aim.y);ctx.stroke();ctx.setLineDash([]);groundRing(f.aim.x,f.aim.y,f.type===3?85:35,'#ff755e',.8,2);}
 if(!dead&&f.state==='hook'&&!f.hookDone){ctx.save();ctx.strokeStyle='#ffcf7a';ctx.lineWidth=4;ctx.setLineDash([10,8]);ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(f.x,f.y-30);ctx.lineTo(f.x+Math.cos(f.hookA)*380,f.y+Math.sin(f.hookA)*380);ctx.stroke();ctx.setLineDash([]);ctx.restore()}
 if(!dead&&f.escortOf&&!f.decoy)groundRing(f.x,f.y,26,'#ffd08a',.55,2);
 ctx.translate(f.x,f.y-lift-hover);if(directed?directed.flip:f.x>p.x)ctx.scale(-1,1);
 ctx.scale(1/Math.sqrt(lanky),lanky);
 if(dead){ctx.rotate(-.9);ctx.scale(1,.5)}else if(moving)ctx.rotate(Math.sin(f.walk)*.05);
 const filters=[];
 if(f.frozen>0)filters.push('brightness(1.25) saturate(.3)');else if(f.hit>0)filters.push('brightness(1.7)');else if(f.type===1)filters.push('brightness(.86)');
 if(f.decoy)filters.push('brightness(1.3) saturate(.4)');
 if(filters.length)ctx.filter=filters.join(' ');
 drawMotionTile(ctx,m.tint&&!dead?tintedTile(tile,m.tint,(f.mapId??routeStage)+':'+(directed?directed.row:'x')+':'+(f.type===3?'b':'g')):tile,0,0,height);
 ctx.restore();
 if(!dead&&f.elite)groundRing(f.x,f.y,30,f.color,.8,2);
 if(!dead&&f.type===3&&f.overheat>0)groundRing(f.x,f.y,160*(1-f.overheat/2.2),'#ff8a3c',.8,4);
 if(!dead&&f.type===3&&f.guardUp){groundRing(f.x,f.y,52,'#ffe3a8',.85,3);ctx.save();ctx.font='12px Georgia';ctx.textAlign='center';ctx.fillStyle='#ffe3a8';ctx.fillText('護衛結界 · 先清護衛',f.x,f.y-height-22);ctx.restore()}
 if(!dead&&f.hp<f.maxhp&&f.type!==3){ctx.fillStyle='#100b0b';ctx.fillRect(f.x-23,f.y-height-9,46,5);ctx.fillStyle=f.color;ctx.fillRect(f.x-23,f.y-height-9,46*Math.max(0,f.hp/f.maxhp),3);}
 return true;
}
function initCampaign(){
 chapters.splice(0,chapters.length,...campaignMaps);extendSkillTrees();
 spawn=campaignSpawn;nextWave=campaignNextWave;enterChapter=campaignEnter;showChapterGate=campaignGate;
 // The sanctuary three keep their authored ground art; the expedition maps that
 // used to enlarge 512px tiles are painted procedurally instead.
 chapterBackground=()=>routeStage<3?[bg,frostFloor,bellFloor][routeStage]:terrainFor(routeStage).canvas;
 const oldJourney=journeyHUD;journeyHUD=()=>{oldJourney();if(!p)return;ui.chapter.textContent=mapSpec().act+' · '+(routeStage%3+1)+' / 3';$('#regionlabel').textContent=mapSpec().name;$('#xpdetail').textContent=level>=LEVEL_CAP?'最高等級 · LV.'+LEVEL_CAP:'EXP '+Math.floor(xp)+' / '+xpNeed;$('#routehint').textContent=pendingChapter>=0?'本圖完成 · 按下方「前往下一圖」':p.curse>0?'詛咒 · 回復減半':p.shield>0?'護盾 '+Math.ceil(p.shield):'';const go=$('#nextmap');go.hidden=pendingChapter<0;};
 $('#nextmap').onclick=()=>{if(pendingChapter>=0)showChapterGate()};
 const originalProps=initProps;
 // Exploration maps are far too large for the authored sanctuary prop layout.
 initProps=()=>{if(!exploring&&routeStage<3){originalProps();addTerrainDressing(routeStage);return}applyTerrainProps(routeStage)};
 expeditionFloorArt.onload=()=>{prepareExpeditionFloors();loaded()};expeditionFloorArt.onerror=loadError;
 humanArt.onload=()=>{makeGaitFrames(humanArt,9,2,humanFrames);loaded()};humanArt.onerror=loadError;
 relicArt.onload=()=>{makeGaitFrames(relicArt,3,3,relicFrames);loaded()};relicArt.onerror=loadError;
 expeditionFloorArt.src='floors-expedition.png';humanArt.src='expedition-humans.png';relicArt.src='expedition-relics.png';manifestationArt.onload=()=>{makeGaitFrames(manifestationArt,5,3,manifestationFrames);loaded()};manifestationArt.onerror=loadError;manifestationArt.src='skill-manifestations.png';
}
