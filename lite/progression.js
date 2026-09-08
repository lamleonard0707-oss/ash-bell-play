'use strict';
// v0.13 progression: fifty skill levels per branch, four upgrade lines per skill,
// and four character attributes.
//
// The seven-rank tree stays underneath — it is what actually gates behaviour and
// mastery — but a branch now takes fifty points instead of five, so a player who
// wants to specialise always has somewhere to put the next point. Ranks are derived
// from the level, which keeps every existing rank check working.
const SKILL_LEVEL_CAP=50;
// 七個形態（rank 1-7）各自喺邊個技能等級解鎖。專攻一條線先去到終極形態；
// 三條線平均分點只會停喺中段形態。呢個就係「專精 vs 通吃」嘅分別。
const rankUnlockLevel=[0,1,8,16,24,32,40,50];
// 升級成本遞增：淺嘗好平，愈深愈貴。一條線由 0 撳到 50 級 ＝ 80 點，
// 而全程收入大約 86 點，所以 all-in 一條線係真取捨，唔使額外懲罰。
function skillLevelCost(next){return next<=30?1:next<=40?2:3}
function rankForLevel(lv){let r=0;for(let i=1;i<rankUnlockLevel.length;i++)if(lv>=rankUnlockLevel[i])r=i;return r}
// 下一個形態喺幾多級；已經滿級就回 0。
function nextRankLevel(lv){for(let i=1;i<rankUnlockLevel.length;i++)if(lv<rankUnlockLevel[i])return rankUnlockLevel[i];return 0}
// 形態對應 spec.nodes 邊一項（三個原始節點 ＋ 四個 mastery 節點）。
function skillNodeFor(lv){return Math.max(0,rankForLevel(lv)-1)}

const upgradeDefs=[
 {key:'power', name:'威能', text:'技能傷害 +8%',            per:'+8% 傷害'},
 {key:'reach', name:'廣域', text:'範圍 +7%，每 2 點多一發',  per:'+7% 範圍'},
 {key:'swift', name:'迅捷', text:'冷卻 −6%（最多 −30%）',    per:'−6% 冷卻'},
 {key:'focus', name:'節流', text:'靈息消耗 −8%',            per:'−8% 消耗'}
];
const UPGRADE_MAX=5;

const attrDefs=[
 {key:'vit',name:'體',text:'生命上限 +12、每秒回復 +0.12（受傷後 4 秒停）'},
 {key:'str',name:'力',text:'傷害 +1%、減傷 +0.4%；解鎖重裝備需求'},
 {key:'dex',name:'敏',text:'攻速 +0.8%、移速 +0.6%；解鎖靈巧裝備需求'},
 {key:'eng',name:'魔',text:'靈息回復 +0.25／秒、技能傷害 +0.6%'}
];
const ATTR_PER_LEVEL=5;
// Each class starts with a build, the way a D2 character does. These count toward
// equipment requirements but not toward the bonuses, so early power stays flat and
// the requirement gate still means something.
const classBaseAttrs=[
 {vit:20,str:15,dex:20,eng:30},
 {vit:25,str:15,dex:15,eng:30},
 {vit:15,str:12,dex:30,eng:28},
 {vit:28,str:25,dex:15,eng:17},
 {vit:32,str:32,dex:12,eng:9},
 {vit:18,str:14,dex:24,eng:29}
];
function baseAttr(key){return (classBaseAttrs[chosen]||classBaseAttrs[0])[key]||0}
function totalAttr(key){return baseAttr(key)+(attrs[key]||0)}

let skillLevel=[1,0,0],upgrades=[[0,0,0,0],[0,0,0,0],[0,0,0,0]];
// 由舊存檔換算送返嘅等級：玩家冇為佢俾過點數，所以洗點唔可以退返俾佢。
let grantedLevel=[1,0,0];
let attrs={vit:0,str:0,dex:0,eng:0},attrPoints=0,upgradePoints=0;
// 每張圖可以洗一次技能點，唔洗玩家驚 all-in 錯咗流派。
let respecStage=-1;
// Set while a skill is resolving so the shared helpers know whose upgrades apply.
let castingBranch=0;

function resetProgression(){
 skillLevel=[1,0,0];grantedLevel=[1,0,0];upgrades=[[0,0,0,0],[0,0,0,0],[0,0,0,0]];
 attrs={vit:0,str:0,dex:0,eng:0};attrPoints=0;upgradePoints=0;castingBranch=0;respecStage=-1;
 syncRanks();
}
// `ranks` remains the single source of truth for behaviour; it is now derived.
function syncRanks(){for(let b=0;b<3;b++)ranks[b]=rankForLevel(Math.max(0,Math.min(SKILL_LEVEL_CAP,skillLevel[b]||0)))}

// --- diminishing returns -------------------------------------------------------
// Without this, pouring all 145 points into one attribute produces absurd numbers.
function attrEffective(n){
 const a=Math.min(60,n),b=Math.min(40,Math.max(0,n-60)),c=Math.max(0,n-100);
 return a+b*.5+c*.25;
}
function attrValue(key){return attrEffective(attrs[key]||0)}
function attrHealth(){return Math.round(attrValue('vit')*12)}
// 2026-09-09：每點體 0.4／秒係冇上限嘅，夾埋 +12 最大血，玩家企定挨打都回得返，
// Boss 打唔死人。回血減到 0.12／秒，再封頂每秒最多回最大血嘅 1%。
let REGEN_CAP_RATIO=.01,REGEN_LOCK_SECONDS=4;
function attrRegenHp(){const raw=attrValue('vit')*.12;return p?Math.min(raw,p.maxhp*REGEN_CAP_RATIO):raw}
function attrDamageMult(){return 1+attrValue('str')*.01}
function attrArmor(){return attrValue('str')*.4}
function attrHaste(){return attrValue('dex')*.8}
function attrSpeed(){return attrValue('dex')*.6}
function attrManaRegen(){return attrValue('eng')*.25}
function attrSkillMult(){return 1+attrValue('eng')*.006}

// --- upgrades ------------------------------------------------------------------
function upgradeAt(branch,key){const i=upgradeDefs.findIndex(u=>u.key===key);return (upgrades[branch]&&upgrades[branch][i])||0}
// 每一級都要即刻有回報，唔可以淨係等下一個形態。
function skillLevelDamage(branch){return 1+Math.max(0,(skillLevel[branch]||0)-1)*.04}
function skillLevelRelief(branch){return Math.min(.25,Math.floor((skillLevel[branch]||0)/10)*.05)}
// 專精天賦（talents 9-11）只加自己嗰條流派；buildcraft.js 未載入時當冇。
function masteryTalent(branch){return typeof talents!=='undefined'&&talents?(talents[9+branch]||0):0}
// 加強線嘅上限跟流派等級走：每 10 級解一點，撳到 50 級先可以點滿五點。
function upgradeCapFor(branch){return Math.max(0,Math.min(UPGRADE_MAX,1+Math.floor((skillLevel[branch]||0)/10)))}
function skillPowerMult(branch=castingBranch){return (1+upgradeAt(branch,'power')*.08)*skillLevelDamage(branch)*(1+masteryTalent(branch)*.06)*attrSkillMult()}
function skillReachMult(branch=castingBranch){return 1+upgradeAt(branch,'reach')*.07}
function skillExtraShots(branch=castingBranch){return Math.floor(upgradeAt(branch,'reach')/2)}
function skillCooldownMult(branch){return Math.max(.7,1-upgradeAt(branch,'swift')*.06)*(1-skillLevelRelief(branch))*(1-Math.min(.15,masteryTalent(branch)*.03))}
function skillCostMult(branch){return Math.max(.6,1-upgradeAt(branch,'focus')*.08)*(1-skillLevelRelief(branch))}

function canLearnSkillLevel(b){
 const next=(skillLevel[b]||0)+1;
 return next<=SKILL_LEVEL_CAP&&skillPoints>=skillLevelCost(next);
}
function learnSkillLevel(b){
 if(mode!=='panel'||activePanel!=='tree'||!canLearnSkillLevel(b))return false;
 const next=(skillLevel[b]||0)+1;
 skillLevel[b]=next;skillPoints-=skillLevelCost(next);syncRanks();
 playSfx('level',p&&p.x);drawTree();syncSkillLabel();markDirty();return true;
}
// 洗點：技能等級、天賦、加強全部退返點數，屬性點唔郁（同流派無關）。
// 每張圖一次，所以試流派唔使驚，但唔可以喺同一張圖不停調來調去。
function respecFloor(b){return Math.max(b===0?1:0,grantedLevel[b]||0)}
function canRespec(){return respecStage!==routeStage&&(skillLevel.some((v,b)=>v>respecFloor(b))||upgrades.some(u=>u.some(v=>v>0))||(typeof talents!=='undefined'&&talents.some(v=>v>0)))}
function respecSkills(){
 if(mode!=='panel'||activePanel!=='tree'||!canRespec())return false;
 let refund=0;
 for(let b=0;b<3;b++){for(let lv=respecFloor(b)+1;lv<=(skillLevel[b]||0);lv++)refund+=skillLevelCost(lv)}
 if(typeof talents!=='undefined')for(let i=0;i<talents.length;i++){refund+=talents[i];talents[i]=0}
 for(let b=0;b<3;b++)for(let i=0;i<upgrades[b].length;i++){upgradePoints+=upgrades[b][i];upgrades[b][i]=0}
 skillLevel=[0,1,2].map(respecFloor);skillPoints+=refund;respecStage=routeStage;syncRanks();
 playSfx('equip',p&&p.x);drawTree();syncSkillLabel();markDirty();
 if(typeof toast==='function')toast('已洗返技能點 · 退返 '+refund+' 點');
 return true;
}
function spendUpgrade(b,i){
 if(mode!=='panel'||activePanel!=='tree')return false;
 if(upgradePoints<1||!skillLevel[b]||upgrades[b][i]>=upgradeCapFor(b))return false;
 upgrades[b][i]++;upgradePoints--;playSfx('equip',p&&p.x);drawTree();syncSkillLabel();markDirty();return true;
}
function spendAttribute(key){
 if(attrPoints<1||!(key in attrs))return false;
 const beforeHealth=key==='vit'?attrHealth():0;
 attrs[key]++;attrPoints--;
 if(key==='vit'){const gain=attrHealth()-beforeHealth;p.maxhp+=gain;p.hp=Math.min(p.maxhp,p.hp+gain)}
 playSfx('equip',p&&p.x);updateHUD();if(activePanel==='gear')drawInventory();markDirty();return true;
}
// Only for display and for the equipment-requirement panel; max health itself is
// always adjusted by delta, never recomputed, so it cannot drift from the +6 per
// level that gainSkillLevel applies.
function baseMaxHp(){return classes[chosen].hp+6*(level-1)}

function grantLevelPoints(){attrPoints+=ATTR_PER_LEVEL;upgradePoints+=1}

// --- equipment requirements ----------------------------------------------------
function itemRequirement(item){return item&&item.req?item.req:null}
function meetsRequirement(item){
 const r=itemRequirement(item);if(!r)return true;
 return totalAttr('str')>=(r.str||0)&&totalAttr('dex')>=(r.dex||0);
}
function requirementText(item){
 const r=itemRequirement(item);if(!r)return '';
 const bits=[];if(r.str)bits.push('力 '+r.str);if(r.dex)bits.push('敏 '+r.dex);
 return bits.length?'需求：'+bits.join(' · '):'';
}
function rollRequirement(slot,rarity,depth){
 if(rarity==='common')return null;
 const heavy=['chest','helmet','legs','shoulders','offhand'].includes(slot);
 const nimble=['ring','amulet','knees','belt'].includes(slot);
 const scale=rarity==='legendary'?1.6:1;
 const base=Math.round((4+depth*2.1)*scale*rnd(.8,1.2));
 if(base<5)return null;
 if(heavy)return {str:base};
 if(nimble)return {dex:base};
 return {str:Math.round(base*.6),dex:Math.round(base*.6)};
}

// --- persistence ---------------------------------------------------------------
// `scale` 標明呢份存檔用緊邊個刻度：冇 scale 就係舊嘅五級刻度，要換算。
function progressionSnapshot(){return {scale:SKILL_LEVEL_CAP,skillLevel:[...skillLevel],grantedLevel:[...grantedLevel],upgrades:upgrades.map(u=>[...u]),attrs:{...attrs},attrPoints,upgradePoints,respecStage}}
function progressionRestore(s){
 if(!s){resetProgression();return}
 skillLevel=(s.skillLevel||[1,0,0]).slice(0,3);
 upgrades=(s.upgrades||[]).slice(0,3).map(u=>(u||[]).slice(0,4));
 while(upgrades.length<3)upgrades.push([0,0,0,0]);
 upgrades=upgrades.map(u=>{while(u.length<4)u.push(0);return u});
 attrs={vit:0,str:0,dex:0,eng:0,...(s.attrs||{})};
 attrPoints=s.attrPoints||0;upgradePoints=s.upgradePoints||0;respecStage=Number.isInteger(s.respecStage)?s.respecStage:-1;
 // 舊存檔嘅五級刻度換算成新嘅五十級刻度，同一個形態換返同一個形態。
 if(s.scale!==SKILL_LEVEL_CAP){skillLevel=skillLevel.map(legacySkillLevel);grantedLevel=[...skillLevel]}
 else grantedLevel=(s.grantedLevel||[1,0,0]).slice(0,3).map((v,b)=>Math.min(skillLevel[b]||0,Math.max(0,v|0)));
 while(grantedLevel.length<3)grantedLevel.push(0);
 syncRanks();
}
// v3 saves carry ranks but no levels: read the level back out of the rank, and hand
// over the attribute and upgrade points the character should already have earned.
// 舊刻度 0-5 級 → 新刻度：同一個形態對返同一個形態（rank 0/1/2/3/5/7）。
const legacySkillLevels=[0,1,8,16,32,50];
function legacySkillLevel(v){return v>5?v:(legacySkillLevels[Math.max(0,v|0)]||0)}
function progressionMigrate(save){
 const derived=(save.ranks||[1,0,0]).map(r=>legacySkillLevel([0,1,2,3,3,4,4,5][Math.max(0,Math.min(7,r|0))]));
 return {scale:SKILL_LEVEL_CAP,skillLevel:derived,grantedLevel:[...derived],upgrades:[[0,0,0,0],[0,0,0,0],[0,0,0,0]],
  attrs:{vit:0,str:0,dex:0,eng:0},
  attrPoints:ATTR_PER_LEVEL*Math.max(0,(save.level||1)-1),
  upgradePoints:Math.max(0,(save.level||1)-1)};
}
function validProgression(s){
 if(!s)return;
 const bad=()=>{throw Error('成長資料不正確')};
 if(!Array.isArray(s.skillLevel)||s.skillLevel.length!==3||s.skillLevel.some(v=>!Number.isInteger(v)||v<0||v>SKILL_LEVEL_CAP))bad();
 if(s.grantedLevel!==undefined&&(!Array.isArray(s.grantedLevel)||s.grantedLevel.length!==3||s.grantedLevel.some(v=>!Number.isInteger(v)||v<0||v>SKILL_LEVEL_CAP)))bad();
 if(s.respecStage!==undefined&&(!Number.isInteger(s.respecStage)||s.respecStage<-1||s.respecStage>=MAP_COUNT))bad();
 if(!Array.isArray(s.upgrades)||s.upgrades.length!==3||s.upgrades.some(u=>!Array.isArray(u)||u.length!==4||u.some(v=>!Number.isInteger(v)||v<0||v>UPGRADE_MAX)))bad();
 if(!s.attrs||attrDefs.some(a=>!Number.isInteger(s.attrs[a.key])||s.attrs[a.key]<0||s.attrs[a.key]>400))bad();
 for(const k of ['attrPoints','upgradePoints'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>400)bad();
}

// --- panels --------------------------------------------------------------------
function drawUpgrades(){
 const root=$('#upgrade-web');if(!root)return;
 root.replaceChildren();
 const head=document.createElement('p');head.className='panel-note';
 head.textContent=(upgradePoints?'技能強化點 '+upgradePoints:'⚠️ 而家冇強化點 —— 每升一級先會 +1 點')
  +'。每招四條，每條上限跟流派等級走（每 10 級解 1 點，撳到 LV.'+SKILL_LEVEL_CAP+' 先可以點滿 '+UPGRADE_MAX+' 點）。'
  +LEVEL_CAP+' 級一共只有 '+(LEVEL_CAP-1)+' 點，所以要揀專精定平均。';
 root.append(head);
 for(let b=0;b<3;b++){
  const spec=skillTrees[chosen][b],col=document.createElement('section');col.className='upgrade-branch';
  const title=document.createElement('h4');
  const lv=skillLevel[b]||0,cap=upgradeCapFor(b);
  const gate=lv>=SKILL_LEVEL_CAP?'已滿級':skillPoints<skillLevelCost(lv+1)?'下一級要 '+skillLevelCost(lv+1)+' 技能點':'可以升級（'+skillLevelCost(lv+1)+' 點）';
  title.textContent=spec.name+' · LV.'+lv+' / '+SKILL_LEVEL_CAP+'　'+gate+'　加強上限 '+cap+'/'+UPGRADE_MAX;
  col.append(title);
  upgradeDefs.forEach((u,i)=>{
   const row=document.createElement('button');row.className='upgrade-row'+(upgrades[b][i]?' learned':'');
   const value=upgrades[b][i];
   const shown=u.key==='swift'?('−'+Math.round((1-skillCooldownMult(b))*100)+'% 冷卻')
    :u.key==='focus'?('−'+Math.round((1-skillCostMult(b))*100)+'% 消耗')
    :u.key==='power'?('+'+Math.round((skillPowerMult(b)/attrSkillMult()-1)*100)+'% 傷害')
    :('+'+Math.round((skillReachMult(b)-1)*100)+'% 範圍，+'+skillExtraShots(b)+' 發');
   const why=!lv?'未學呢招':value>=cap?(cap>=UPGRADE_MAX?'已點滿':'要 LV.'+((cap)*10)+' 先可以再加'):upgradePoints<1?'冇強化點（每升一級 +1）':'撳一下 +1 點';
   row.textContent=u.name+' '+value+'/'+cap+'\n目前：'+shown+'\n每點：'+u.per+'\n'+why;
   row.disabled=!lv||upgradePoints<1||value>=cap;
   row.onclick=()=>spendUpgrade(b,i);
   col.append(row);
  });
  root.append(col);
 }
}
function drawAttributes(){
 const root=$('#attr-panel');if(!root||!p)return;
 root.replaceChildren();
 const head=document.createElement('p');head.className='panel-note';
 head.textContent=(attrPoints?'屬性點 '+attrPoints:'⚠️ 而家冇屬性點 —— 每升一級先會 +'+ATTR_PER_LEVEL+' 點')
  +'。同一屬性超過 60 點後每點效果減半，超過 100 點再減半。';
 root.append(head);
 const rows=[
  ['vit','生命上限 +'+attrHealth()+'　回復 +'+attrRegenHp().toFixed(1)+'／秒'],
  ['str','傷害 +'+Math.round((attrDamageMult()-1)*100)+'%　減傷 +'+attrArmor().toFixed(1)+'%'],
  ['dex','攻速 +'+attrHaste().toFixed(1)+'%　移速 +'+attrSpeed().toFixed(1)+'%'],
  ['eng',resourceName()+'回復 +'+attrManaRegen().toFixed(2)+'／秒　技能傷害 +'+Math.round((attrSkillMult()-1)*100)+'%']
 ];
 for(const [key,detail] of rows){
  const def=attrDefs.find(a=>a.key===key),row=document.createElement('div');row.className='attr-row';
  const name=document.createElement('b');name.textContent=def.name+' '+totalAttr(key)+(attrs[key]?'（基礎 '+baseAttr(key)+' ＋ '+attrs[key]+'）':'（基礎）');
  const text=document.createElement('small');text.textContent=detail;
  const add=document.createElement('button');add.textContent='+';add.disabled=attrPoints<1;
  add.setAttribute('aria-label','增加'+def.name);
  add.onclick=()=>{spendAttribute(key);drawAttributes()};
  row.append(name,text,add);root.append(row);
 }
}
