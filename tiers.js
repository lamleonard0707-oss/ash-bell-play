'use strict';
// Three passes through the same twelve maps, the way Diablo II has Normal,
// Nightmare and Hell. The character carries everything forward — level, gear,
// every point it has spent. What changes is monster level, and monster level is
// what decides both how much experience a kill is worth and how good the drops are.
//
// The point of the tiers is the level ceiling. Fifty is reachable, but not in one
// pass: the first tier runs out of monsters worth killing at about thirty-four.
// See ash_bell_audit/design/level50_sim.py for the arithmetic behind these numbers.
const tierDefs=[
 {name:'普通',en:'NORMAL',   offset:0,  hp:1,   damage:1,   speed:1,    loot:0, note:'第一次冒險 · 大約打到 LV.34'},
 {name:'中等',en:'NIGHTMARE',offset:10, hp:2.6, damage:1.9, speed:1.08, loot:1, note:'怪物等級 +10 · 大約打到 LV.45'},
 {name:'高階',en:'HELL',     offset:20, hp:6.4, damage:3.4, speed:1.16, loot:2, note:'怪物等級 +20 · 爆機到 LV.50'}
];
// Full experience while the monster is within three levels of you, nothing worth
// having once it is twelve below. This is the whole reason a tier ends.
const XP_FULL_GAP=3,XP_ZERO_GAP=12,XP_FLOOR=.04;
let runTier=0,tiersCleared=[false,false,false];

function tierSpec(t=runTier){return tierDefs[Math.max(0,Math.min(tierDefs.length-1,t|0))]}
function tierUnlocked(t){return t===0||tiersCleared[t-1]===true}
function monsterLevel(id=routeStage,t=runTier){return (campaignMaps[id]||campaignMaps[0]).lv+tierSpec(t).offset}
function experiencePenalty(playerLevel,monsterLv){
 const gap=playerLevel-monsterLv;
 if(gap<=XP_FULL_GAP)return 1;
 if(gap>=XP_ZERO_GAP)return XP_FLOOR;
 return 1-(gap-XP_FULL_GAP)/(XP_ZERO_GAP-XP_FULL_GAP)*(1-XP_FLOOR);
}
function resetTiers(){runTier=0;tiersCleared=[false,false,false]}
function validTierSave(s){
 if(s.runTier!==undefined&&(!Number.isInteger(s.runTier)||s.runTier<0||s.runTier>=tierDefs.length))throw Error('週目存檔不正確');
 if(s.tiersCleared!==undefined&&(!Array.isArray(s.tiersCleared)||s.tiersCleared.length!==tierDefs.length||s.tiersCleared.some(v=>typeof v!=='boolean')))throw Error('週目進度存檔不正確');
}
// Starting the next tier keeps the character and throws away only the map state.
// It deliberately does not call reset(), which would wipe the level and the bag.
function enterTier(t){
 if(!tierUnlocked(t)||!p)return false;
 runTier=t;routeStage=0;pendingChapter=-1;runOutcome=null;campaignCleared=[];pendingRewards=[];
 foes=[];shots=[];drops=[];hazards=[];turrets=[];castFields=[];wards=[];
 casts.length=0;burnZones.length=0;dashFields.length=0;corpses.length=0;
 effects=[];particles.length=0;scorches.length=0;ghosts.length=0;numbers=[];
 runSeed=(Math.random()*4294967296)>>>0;terrainCache.clear();resetExplore();initProps();
 populateMap(0);wave=1;waveSpawn=0;spawnTimer=1;rest=2;bossSpawned=false;
 const at=entryPoint();p.x=at.x;p.y=at.y;p.hp=p.maxhp;p.mp=100;p.inv=2;p.chill=0;p.poison=0;
 $('#bossbar b').textContent=mapSpec().boss;$('#bossbar').hidden=true;
 $('#modal').hidden=true;$('#hud').hidden=false;mode='play';cancelMouse();chapterFade=1;
 syncSkillLabel();updateHUD();saveProgress(true);
 toast(tierSpec().name+' 週目 · 怪物等級 +'+tierSpec().offset);
 return true;
}
// A new character always starts at 普通, the way Diablo II does it: the later tiers
// are somewhere the same character walks into, not a menu option that drops a
// level-one walker into monsters twenty levels above it. The select screen only
// reports where the saved character has reached.
function initTiers(){
 const el=$('#tierprogress');if(!el)return;
 const saved=readSaved();
 const cleared=saved&&Array.isArray(saved.tiersCleared)?saved.tiersCleared:tiersCleared;
 const at=saved?(saved.runTier||0):0;
 const marks=tierDefs.map((d,i)=>{
  const state=cleared[i]?'已通關':i===at&&saved?'進行中':i===0||cleared[i-1]?'可挑戰':'未解鎖';
  return d.name+'（'+state+'）';
 });
 el.textContent='週目：'+marks.join('　·　')+'　—　新角色由普通開始，打爆最後一關先解鎖下一個週目。';
}
