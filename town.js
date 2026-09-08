'use strict';
// 城鎮休息區（U018）：每張圖入口都有一個安全區。入面唔會有怪，有三個設施 ——
// 補給站（每張圖一次，補滿生命／靈息並補回藥水）、寶箱（跨圖共用嘅倉），
// 同傳送石碑（U019，未開通嘅時候會講明）。⛔ 冇金錢機制，所有嘢免費。
const TOWN_RADIUS=430,TOWN_STASH_CAP=60,TOWN_POTION_TOPUP=5;
let stash=[],supplyUsed=[],townFocus='';
function townCenter(){const e=entryPoint();return {x:e.x,y:e.y-60}}
// 地圖係俯視壓扁嘅，所以 y 方向要收窄先睇落係個圓。
function inTown(x,y){const c=townCenter();return Math.hypot(x-c.x,(y-c.y)*1.35)<TOWN_RADIUS}
function townStructures(){
 const c=townCenter();
 return [
  {key:'supply',name:'補給站',x:c.x-190,y:c.y+20},
  {key:'stash',name:'寶箱',x:c.x+190,y:c.y+20},
  {key:'waypoint',name:'傳送石碑',x:c.x,y:c.y-170}
 ];
}
function resetTown(){stash=[];supplyUsed=[];townFocus=''}
function supplyReady(){return !supplyUsed[routeStage]}
// 怪唔可以行入嚟。追住玩家嘅怪照樣會撞到條邊界就企定，唔會跟你入城。
function pushEnemiesOutOfTown(){
 const c=townCenter();
 for(const f of foes){
  if(f.hp<=0||!inTown(f.x,f.y))continue;
  let dx=f.x-c.x,dy=(f.y-c.y)*1.35,len=Math.hypot(dx,dy);
  if(len<1){dx=0;dy=1;len=1}
  f.x=c.x+dx/len*(TOWN_RADIUS+6);
  f.y=c.y+dy/len/1.35*(TOWN_RADIUS+6);
  f.state='seek';f.stateT=0;
 }
}
function townStructureAt(x,y){
 for(const s of townStructures())if(Math.abs(x-s.x)<58&&y>s.y-104&&y<s.y+30)return s;
 return null;
}
// 要行埋去先用得，唔可以隔住成張圖撳。
function townReach(s){return p&&Math.hypot(p.x-s.x,(p.y-s.y)*1.35)<200}
function useTownStructure(s){
 if(!s||mode!=='play'||!p)return false;
 if(!townReach(s)){toast('行埋去 '+s.name+' 先用得到');return false}
 if(s.key==='supply')return useSupply();
 if(s.key==='stash'){townFocus='stash';panelOpen('town');return true}
 if(s.key==='waypoint'){townFocus='waypoint';panelOpen('town');return true}
 return false;
}
function useSupply(){
 if(!supplyReady()){toast('呢張圖嘅補給已經攞咗');return false}
 supplyUsed[routeStage]=true;
 p.hp=p.maxhp;p.mp=100;
 const before=potions;potions=Math.max(potions,Math.min(potionCap(),TOWN_POTION_TOPUP));
 playSfx('potion',p.x);ring(p.x,p.y,'#c5d59b',150,.8);
 toast('補給站 · 生命同'+resourceName()+'補滿'+(potions>before?' · 藥水 '+before+' → '+potions:''));
 markDirty();return true;
}
// --- 寶箱 ---------------------------------------------------------------------
function stashItem(id){
 const i=bag.findIndex(v=>v.id===id);if(i<0)return false;
 if(stash.length>=TOWN_STASH_CAP){toast('寶箱滿咗（'+TOWN_STASH_CAP+' 件）');return false}
 const item=bag[i];
 if(Object.values(equipped).some(e=>e&&e.id===id)){toast('著緊嘅裝備要先除低');return false}
 bag.splice(i,1);delete item.grid;stash.push(item);
 $('#gearbtn').textContent='裝備 · '+bag.length;
 playSfx('equip',p&&p.x);drawTown();markDirty();return true;
}
function retrieveItem(id){
 const i=stash.findIndex(v=>v.id===id);if(i<0)return false;
 const item=stash[i];
 if(!awardGear(item))return false;
 stash.splice(i,1);drawTown();markDirty();return true;
}
// --- 傳送石碑（U019 未開通）----------------------------------------------------
function waypointMaps(){return campaignCleared.slice().sort((a,b)=>a-b)}
// --- 面板 ---------------------------------------------------------------------
function drawTown(){
 const root=$('#townview');if(!root)return;
 root.replaceChildren();
 const head=document.createElement('p');head.className='panel-note';
 head.textContent=townFocus==='waypoint'
  ?'傳送石碑仲喺度亮緊 —— 傳送功能未開通，下一輪先接。已通關嘅圖：'+(waypointMaps().length||'仲未有')
  :'寶箱跨圖共用：喺呢張圖擺低，第幾張圖嘅城鎮開返都仲喺度。上限 '+TOWN_STASH_CAP+' 件。';
 root.append(head);
 if(townFocus==='waypoint')return;
 const columns=document.createElement('div');columns.className='stash-columns';
 for(const [title,list,action,empty] of [
  ['背包 · '+bag.length,bag.filter(i=>!Object.values(equipped).some(e=>e&&e.id===i.id)),stashItem,'背包冇嘢可以擺'],
  ['寶箱 · '+stash.length+' / '+TOWN_STASH_CAP,stash,retrieveItem,'寶箱仲係空嘅']
 ]){
  const col=document.createElement('section');col.className='stash-column';
  const h=document.createElement('h4');h.textContent=title;col.append(h);
  if(!list.length){const none=document.createElement('small');none.textContent=empty;col.append(none)}
  for(const item of list){
   const b=document.createElement('button');b.className='stash-row '+(item.rarity||'magic');
   b.textContent=item.name+'\n'+gearLabel(item.slot)+' · '+describeItem(item);
   b.onclick=()=>action(item.id);
   col.append(b);
  }
  columns.append(col);
 }
 root.append(columns);
}
function townSnapshot(){return {stash:stash.map(i=>({...i})),supplyUsed:[...supplyUsed]}}
function townRestore(s){
 if(!s){resetTown();return}
 stash=(s.stash||[]).slice(0,TOWN_STASH_CAP).map(i=>({...i}));
 supplyUsed=(s.supplyUsed||[]).slice(0,MAP_COUNT).map(v=>!!v);
 townFocus='';
}
function validTownSave(s){
 if(s.town===undefined)return;
 const bad=()=>{throw Error('城鎮存檔不正確')};
 if(!s.town||!Array.isArray(s.town.stash)||s.town.stash.length>TOWN_STASH_CAP)bad();
 if(!Array.isArray(s.town.supplyUsed)||s.town.supplyUsed.length>MAP_COUNT)bad();
 for(const i of s.town.stash)if(!i||typeof i.name!=='string'||!Number.isInteger(i.id))bad();
}

// --- 畫面 ---------------------------------------------------------------------
// 冇專屬美術，所以用場景幾何畫：一圈暖光地台 ＋ 三支石碑，行埋去先亮名。
function drawTownGround(){
 const c=townCenter();
 ctx.save();
 const g=ctx.createRadialGradient(c.x,c.y,40,c.x,c.y,TOWN_RADIUS);
 g.addColorStop(0,'rgba(232,186,102,.16)');g.addColorStop(.72,'rgba(232,186,102,.07)');g.addColorStop(1,'rgba(232,186,102,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(c.x,c.y,TOWN_RADIUS,TOWN_RADIUS/1.35,0,0,7);ctx.fill();
 ctx.strokeStyle='rgba(233,196,126,.34)';ctx.lineWidth=3;ctx.setLineDash([26,20]);
 ctx.beginPath();ctx.ellipse(c.x,c.y,TOWN_RADIUS,TOWN_RADIUS/1.35,0,0,7);ctx.stroke();
 ctx.setLineDash([]);ctx.restore();
}
function drawTownStructures(){
 for(const s of townStructures()){
  const near=townReach(s),lit=s.key!=='supply'||supplyReady();
  ctx.save();
  ctx.fillStyle='#05030260';ctx.beginPath();ctx.ellipse(s.x,s.y+6,34,11,0,0,7);ctx.fill();
  const col=s.key==='supply'?(lit?'#c5d59b':'#6d6f5c'):s.key==='stash'?'#e8a54f':'#9bbff0';
  glow(ctx,s.x,s.y-34,near?66:46,col,near?.34:.2);
  ctx.fillStyle='#1b1410';ctx.strokeStyle=col;ctx.lineWidth=2.4;
  if(s.key==='stash'){ctx.beginPath();ctx.rect(s.x-30,s.y-46,60,44);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(s.x-30,s.y-30);ctx.lineTo(s.x+30,s.y-30);ctx.stroke()}
  else if(s.key==='supply'){ctx.beginPath();ctx.moveTo(s.x-26,s.y-2);ctx.lineTo(s.x-16,s.y-58);ctx.lineTo(s.x+16,s.y-58);ctx.lineTo(s.x+26,s.y-2);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.arc(s.x,s.y-34,10,0,7);ctx.stroke()}
  else{ctx.beginPath();ctx.moveTo(s.x-22,s.y-2);ctx.lineTo(s.x-14,s.y-74);ctx.lineTo(s.x+14,s.y-74);ctx.lineTo(s.x+22,s.y-2);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.arc(s.x,s.y-46,13,0,7);ctx.stroke()}
  ctx.font='12px Georgia';ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=5;
  ctx.fillStyle=near?'#f3e2bd':'#b6a68a';
  const label=s.key==='supply'?(supplyReady()?'補給站 · 撳一下攞補給':'補給站 · 呢張圖攞咗喇')
   :s.key==='stash'?'寶箱 · 撳一下開':'傳送石碑 · 未開通';
  ctx.fillText(near?label:s.name,s.x,s.y-84);
  ctx.restore();
 }
}
