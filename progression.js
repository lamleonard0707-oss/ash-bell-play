'use strict';
// v0.10 progression: five skill levels, four upgrade lines per skill, and four
// character attributes.
//
// The seven-tier tree stays underneath — it is what actually gates behaviour and
// mastery — but the player now sees five levels per skill, and ranks are derived
// from them. That keeps every existing rank check working while giving the D2
// shape the player asked for.
const SKILL_LEVEL_CAP=5;
const skillLevelReq=[1,1,10,20,30,40];             // character level per skill level
const rankForSkillLevel=[0,1,2,3,5,7];             // 5 visible levels -> 7 internal tiers
const skillNodeIndex=[0,1,2,4,6];                  // which authored node describes each level

const upgradeDefs=[
 {key:'power', name:'威能', text:'技能傷害 +8%',            per:'+8% 傷害'},
 {key:'reach', name:'廣域', text:'範圍 +7%，每 2 點多一發',  per:'+7% 範圍'},
 {key:'swift', name:'迅捷', text:'冷卻 −6%（最多 −30%）',    per:'−6% 冷卻'},
 {key:'focus', name:'節流', text:'靈息消耗 −8%',            per:'−8% 消耗'}
];
const UPGRADE_MAX=5;

const attrDefs=[
 {key:'vit',name:'體',text:'生命上限 +12、每秒回復 +0.4'},
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
let attrs={vit:0,str:0,dex:0,eng:0},attrPoints=0,upgradePoints=0;
// Set while a skill is resolving so the shared helpers know whose upgrades apply.
let castingBranch=0;

function resetProgression(){
 skillLevel=[1,0,0];upgrades=[[0,0,0,0],[0,0,0,0],[0,0,0,0]];
 attrs={vit:0,str:0,dex:0,eng:0};attrPoints=0;upgradePoints=0;castingBranch=0;
 syncRanks();
}
// `ranks` remains the single source of truth for behaviour; it is now derived.
function syncRanks(){for(let b=0;b<3;b++)ranks[b]=rankForSkillLevel[Math.max(0,Math.min(SKILL_LEVEL_CAP,skillLevel[b]||0))]}

// --- diminishing returns -------------------------------------------------------
// Without this, pouring all 145 points into one attribute produces absurd numbers.
function attrEffective(n){
 const a=Math.min(60,n),b=Math.min(40,Math.max(0,n-60)),c=Math.max(0,n-100);
 return a+b*.5+c*.25;
}
function attrValue(key){return attrEffective(attrs[key]||0)}
function attrHealth(){return Math.round(attrValue('vit')*12)}
function attrRegenHp(){return attrValue('vit')*.4}
function attrDamageMult(){return 1+attrValue('str')*.01}
function attrArmor(){return attrValue('str')*.4}
function attrHaste(){return attrValue('dex')*.8}
function attrSpeed(){return attrValue('dex')*.6}
function attrManaRegen(){return attrValue('eng')*.25}
function attrSkillMult(){return 1+attrValue('eng')*.006}

// --- upgrades ------------------------------------------------------------------
function upgradeAt(branch,key){const i=upgradeDefs.findIndex(u=>u.key===key);return (upgrades[branch]&&upgrades[branch][i])||0}
function skillPowerMult(branch=castingBranch){return (1+upgradeAt(branch,'power')*.08)*attrSkillMult()}
function skillReachMult(branch=castingBranch){return 1+upgradeAt(branch,'reach')*.07}
function skillExtraShots(branch=castingBranch){return Math.floor(upgradeAt(branch,'reach')/2)}
function skillCooldownMult(branch){return Math.max(.7,1-upgradeAt(branch,'swift')*.06)}
function skillCostMult(branch){return Math.max(.6,1-upgradeAt(branch,'focus')*.08)}

function canLearnSkillLevel(b){
 const next=(skillLevel[b]||0)+1;
 return next<=SKILL_LEVEL_CAP&&level>=skillLevelReq[next]&&skillPoints>0;
}
function learnSkillLevel(b){
 if(mode!=='panel'||activePanel!=='tree'||!canLearnSkillLevel(b))return false;
 skillLevel[b]=(skillLevel[b]||0)+1;skillPoints--;syncRanks();
 playSfx('level',p&&p.x);drawTree();syncSkillLabel();markDirty();return true;
}
function spendUpgrade(b,i){
 if(mode!=='panel'||activePanel!=='tree')return false;
 if(upgradePoints<1||!skillLevel[b]||upgrades[b][i]>=UPGRADE_MAX)return false;
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
function progressionSnapshot(){return {skillLevel:[...skillLevel],upgrades:upgrades.map(u=>[...u]),attrs:{...attrs},attrPoints,upgradePoints}}
function progressionRestore(s){
 if(!s){resetProgression();return}
 skillLevel=(s.skillLevel||[1,0,0]).slice(0,3);
 upgrades=(s.upgrades||[]).slice(0,3).map(u=>(u||[]).slice(0,4));
 while(upgrades.length<3)upgrades.push([0,0,0,0]);
 upgrades=upgrades.map(u=>{while(u.length<4)u.push(0);return u});
 attrs={vit:0,str:0,dex:0,eng:0,...(s.attrs||{})};
 attrPoints=s.attrPoints||0;upgradePoints=s.upgradePoints||0;
 syncRanks();
}
// v3 saves carry ranks but no levels: read the level back out of the rank, and hand
// over the attribute and upgrade points the character should already have earned.
function progressionMigrate(save){
 const derived=(save.ranks||[1,0,0]).map(r=>{let best=0;for(let i=0;i<rankForSkillLevel.length;i++)if(rankForSkillLevel[i]<=r)best=i;return best});
 return {skillLevel:derived,upgrades:[[0,0,0,0],[0,0,0,0],[0,0,0,0]],
  attrs:{vit:0,str:0,dex:0,eng:0},
  attrPoints:ATTR_PER_LEVEL*Math.max(0,(save.level||1)-1),
  upgradePoints:Math.max(0,(save.level||1)-1)};
}
function validProgression(s){
 if(!s)return;
 const bad=()=>{throw Error('成長資料不正確')};
 if(!Array.isArray(s.skillLevel)||s.skillLevel.length!==3||s.skillLevel.some(v=>!Number.isInteger(v)||v<0||v>SKILL_LEVEL_CAP))bad();
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
  +'。每招四條，每條最多 '+UPGRADE_MAX+' 點；三招四條全點滿要 60 點，'+LEVEL_CAP+' 級一共只有 '+(LEVEL_CAP-1)+' 點，所以要揀專精定平均。';
 root.append(head);
 for(let b=0;b<3;b++){
  const spec=skillTrees[chosen][b],col=document.createElement('section');col.className='upgrade-branch';
  const title=document.createElement('h4');
  const next=(skillLevel[b]||0)+1;
  const gate=skillLevel[b]>=SKILL_LEVEL_CAP?'已滿級':level<skillLevelReq[next]?'下一級要角色 LV.'+skillLevelReq[next]:skillPoints<1?'冇技能點':'可以升級';
  title.textContent=spec.name+' · LV.'+(skillLevel[b]||0)+' / '+SKILL_LEVEL_CAP+'　'+gate;
  col.append(title);
  upgradeDefs.forEach((u,i)=>{
   const row=document.createElement('button');row.className='upgrade-row'+(upgrades[b][i]?' learned':'');
   const value=upgrades[b][i];
   const shown=u.key==='swift'?('−'+Math.round((1-skillCooldownMult(b))*100)+'% 冷卻')
    :u.key==='focus'?('−'+Math.round((1-skillCostMult(b))*100)+'% 消耗')
    :u.key==='power'?('+'+Math.round((skillPowerMult(b)/attrSkillMult()-1)*100)+'% 傷害')
    :('+'+Math.round((skillReachMult(b)-1)*100)+'% 範圍，+'+skillExtraShots(b)+' 發');
   const why=!skillLevel[b]?'未學呢招':value>=UPGRADE_MAX?'已點滿':upgradePoints<1?'冇強化點（每升一級 +1）':'撳一下 +1 點';
   row.textContent=u.name+' '+value+'/'+UPGRADE_MAX+'\n目前：'+shown+'\n每點：'+u.per+'\n'+why;
   row.disabled=!skillLevel[b]||upgradePoints<1||value>=UPGRADE_MAX;
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
