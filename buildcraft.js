'use strict';
// Optional v2 save extension; missing fields preserve the old easy campaign.
const difficulties=[
 {name:'淺易',hp:1,damage:1,speed:1,tempo:1,note:'原有難度 · 熟悉角色'},
 {name:'中等',hp:1.5,damage:1.45,speed:1.08,tempo:.9,note:'守軍更耐打、反擊更密'},
 {name:'困難',hp:2.2,damage:2.1,speed:1.16,tempo:.78,note:'走位與技能連動至關重要'},
 {name:'超難',hp:3.1,damage:3,speed:1.25,tempo:.65,note:'高壓攻勢 · 留意預警及資源'}
];
let runDifficulty=0,talents=Array(9).fill(0),lastCastBranch=-1,lastCastAt=-99,comboUntil=0;
const talentDefs=[
 {name:'接力',max:5,req:[1,1,0],text:'五秒內接續不同路線，返還 每點 3 靈息。'},
 {name:'護脈',max:5,req:[0,1,1],text:'接續不同路線獲得生命上限 每點 3% 護盾。'},
 {name:'迴響',max:5,req:[1,0,1],text:'接續技能令另外兩招剩餘冷卻縮短 每點 8%。'},
 {name:'餘燼／骨芽／裂頁',max:5,req:[2,1,0],text:'連招後四秒傷害 +每點 8%；職業印記額外作用。'},
 {name:'借勢',max:5,req:[0,2,1],text:'連招後回復生命上限 每點 2%。'},
 {name:'通脈',max:5,req:[1,0,2],text:'所有技能消耗減少 每點 2 靈息。'},
 {name:'破陣',max:5,req:[3,2,0],text:'對燃燒、緩速或冰凍敵人傷害 +每點 10%。'},
 {name:'共生',max:5,req:[0,3,2],text:'每件魔法／傳奇裝備提供 每點 +0.15 靈息每秒。'},
 {name:'三脈合一',max:5,req:[2,2,3],text:'三條路線都學習時，連招護盾另加 每點 4%，冷卻另減 每點 5%。'}
];
const classMarks=['焚鐘印','骨芽印','裂頁印','霜契印','血宴印','墜羽印'];
function difficulty(){return difficulties[runDifficulty]||difficulties[0]}
function resetBuildcraft(){runDifficulty=Number($('#difficulty').value)||0;runTier=0;tiersCleared=tiersCleared.map(()=>false);talents=Array(9).fill(0);lastCastBranch=-1;lastCastAt=-99;comboUntil=0;}
function validBuildSave(s){if(s.runDifficulty!==undefined&&(!Number.isInteger(s.runDifficulty)||s.runDifficulty<0||s.runDifficulty>3))throw Error('難度存檔不正確');if(s.talents!==undefined&&(!Array.isArray(s.talents)||s.talents.length!==9||s.talents.some(v=>!Number.isInteger(v)||v<0||v>5)))throw Error('天賦存檔不正確');}
function learnTalent(i){const d=talentDefs[i];if(mode!=='panel'||activePanel!=='tree'||!d||skillPoints<1||talents[i]>=d.max||d.req.some((v,j)=>ranks[j]<v))return;talents[i]++;skillPoints--;drawTree();syncSkillLabel();markDirty();}
function talentGap(d){return d.req.map((v,j)=>v&&ranks[j]<v?skillTrees[chosen][j].name+' 第 '+v+' 階（目前 '+ranks[j]+'）':'').filter(Boolean)}
function drawTalents(){const root=$('#talent-web');root.replaceChildren();
 for(let i=0;i<9;i++){
  const d=talentDefs[i],gap=talentGap(d),maxed=talents[i]>=d.max,b=document.createElement('button');
  b.className='talent-node'+(talents[i]?' learned':'')+(gap.length?' locked':'');
  const status=maxed?'已點滿':gap.length?'仲差：'+gap.join('、'):skillPoints<1?'技能點不足':'可以點';
  b.textContent=(i===3?classMarks[chosen]:d.name)+' '+talents[i]+'/'+d.max+'\n'+d.text+'\n'+status;
  b.title='前置：'+(d.req.map((n,j)=>n?skillTrees[chosen][j].name+' 第 '+n+' 階':'').filter(Boolean).join(' ＋ ')||'無');
  b.disabled=maxed||skillPoints<1||gap.length>0;b.onclick=()=>learnTalent(i);root.append(b);
 }}
function castLoadout(branch){if(mode!=='play'||!ranks[branch]||casts.length)return;selectSkill(branch);const at=cursorAim();skill(at);}
function applyBuildCast(c){const combo=lastCastBranch>=0&&lastCastBranch!==c.branch&&elapsed-lastCastAt<=5;lastCastBranch=c.branch;lastCastAt=elapsed;if(!combo)return;const tri=ranks.every(v=>v>0)?talents[8]:0;p.mp=Math.min(100,p.mp+talents[0]*3);p.shield=Math.min(p.maxhp*.65,(p.shield||0)+p.maxhp*(talents[1]*.03+tri*.04));p.hp=Math.min(p.maxhp,p.hp+p.maxhp*talents[4]*.02);for(let i=0;i<3;i++)if(i!==c.branch)skillTimers[i]*=1-talents[2]*.08-tri*.05;comboUntil=elapsed+4;
 if(talents[3]){for(const f of foes)if(dist(f,{x:c.x,y:c.y})<170){if(chosen===0){f.burn=Math.max(f.burn||0,2);f.burnTick=0;}else if(chosen===1||chosen===3)f.slow=2;else if(chosen===2)f.markUntil=elapsed+4;}if(chosen===4)p.satiety=Math.min(100,(p.satiety||0)+talents[3]*4);}
 ring(p.x,p.y,classes[chosen].color,55,.45);}
function buildDamage(f,d){return d*(comboUntil>elapsed?1+talents[3]*.08:1)*((f.burn>0||f.slow>0||f.frozen>0)?1+talents[6]*.1:1)*(f.markUntil>elapsed?1.15:1);}
function buildManaRegen(){return talents[7]*.15*Object.values(equipped).filter(i=>i&&i.rarity!=='common').length}
let cursorPosition=null;
function cursorAim(){if(!p||!cursorPosition)return undefined;const at=mouseWorld(cursorPosition.x,cursorPosition.y),a=Math.atan2(at.y-p.y,at.x-p.x);return {...at,dx:Math.cos(a),dy:Math.sin(a)}}
function buildHUD(){if(!p)return;for(let i=0;i<3;i++){const b=$('#quickskill'+i),cd=i===activeSkill?skillCD:skillTimers[i];b.textContent=(i+1)+' · '+skillTrees[chosen][i].name+'\n'+(!ranks[i]?'未學習':cd>0?cd.toFixed(1)+' 秒':'就緒');b.disabled=!ranks[i]||cd>0;b.className=activeSkill===i?'active':'';}$('#difficulty-label').textContent=difficulty().name;}
function initBuildcraft(){initTiers();const sel=$('#difficulty');for(let i=0;i<4;i++){const o=document.createElement('option');o.value=i;o.textContent=difficulties[i].name+' · '+difficulties[i].note;sel.append(o)}sel.value='0';for(let i=0;i<3;i++)$('#quickskill'+i).onclick=()=>castLoadout(i);addEventListener('keydown',e=>{if(!e.repeat&&['1','2','3'].includes(e.key)){e.preventDefault();castLoadout(Number(e.key)-1)}});canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')cursorPosition={x:e.clientX,y:e.clientY}});canvas.addEventListener('pointerleave',()=>cursorPosition=null);}

const packSize={helmet:[2,2],chest:[2,3],legs:[2,3],amulet:[1,1],ring:[1,1],shoulders:[2,2],knees:[1,2],offhand:[2,3],weapon:[2,4],belt:[2,1]};
let packSelected=null;
function carriedItems(){return bag.filter(i=>equipped[i.slot]?.id!==i.id)}
function itemSize(item){return packSize[item.slot]||[1,1]}
function packFits(item,x,y,items=carriedItems()){const [w,h]=itemSize(item);if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+w>10||y+h>6)return false;return !items.some(i=>i.id!==item.id&&i.grid&&x<i.grid.x+itemSize(i)[0]&&x+w>i.grid.x&&y<i.grid.y+itemSize(i)[1]&&y+h>i.grid.y)}
function packPlace(item,items=carriedItems()){for(let y=0;y<6;y++)for(let x=0;x<10;x++)if(packFits(item,x,y,items)){item.grid={x,y};return true}return false}
function normalizePack(){const placed=[];for(const item of carriedItems()){if(!item.grid||!packFits(item,item.grid.x,item.grid.y,placed)){delete item.grid;packPlace(item,placed)}if(item.grid)placed.push(item)}}
function packMove(id,x,y){const item=carriedItems().find(i=>i.id===id);if(!item||!packFits(item,x,y))return false;item.grid={x,y};drawInventory();markDirty();return true}
function packCanUnequip(slot){const item=equipped[slot];return !item||!!carriedItems().find(i=>i.id===item.id)||packPlace(item)}
function drawItemArt(c,item){c.width=120;c.height=180;const g=c.getContext('2d'),index=gearSlots.findIndex(([s])=>s===item.slot),tile=(item.relicMap!=null?relicFrames[item.relicMap]:equipmentFrames[wardrobeTier(item)*10+index])||lootFrames[index];if(tile){const iw=tile.width,ih=tile.height,k=Math.min(112/iw,172/ih);g.drawImage(tile,(120-iw*k)/2,(180-ih*k)/2,iw*k,ih*k)}c.setAttribute('aria-label',item.name)}
const equipmentFrames=[];
function drawPack(){normalizePack();const root=$('#pack-grid');root.replaceChildren();for(let y=0;y<6;y++)for(let x=0;x<10;x++){const b=document.createElement('button');b.className='pack-cell';b.style.gridColumn=String(x+1);b.style.gridRow=String(y+1);b.setAttribute('aria-label','背包第 '+(y+1)+' 行第 '+(x+1)+' 格');b.onclick=()=>{if(packSelected&&!packMove(packSelected,x,y))toast('此處空間不足')};root.append(b)}const overflow=$('#pack-overflow');overflow.replaceChildren();for(const item of carriedItems()){const b=document.createElement('button'),icon=document.createElement('canvas'),[w,h]=itemSize(item);b.className='pack-item'+(packSelected===item.id?' selected':'');b.style.borderColor=gearColor(item);b.title=item.name+' · '+w+'×'+h+' 格\n'+describeItem(item);b.setAttribute('aria-label',b.title);drawItemArt(icon,item);b.append(icon);if(item.grid){b.style.gridColumn=(item.grid.x+1)+' / span '+w;b.style.gridRow=(item.grid.y+1)+' / span '+h;root.append(b)}else{b.style.width='90px';b.style.height='120px';overflow.append(b)}b.onclick=()=>{packSelected=item.id;drawInventory()};b.ondblclick=()=>equipItem(item.id)}overflow.hidden=!overflow.children.length;$('#pack-overflow-label').hidden=overflow.hidden;
 const selected=bag.find(i=>i.id===packSelected),detail=$('#pack-detail');detail.replaceChildren();if(selected){const txt=document.createElement('p');txt.textContent=selected.name+' · '+itemSize(selected).join('×')+' 格\n'+describeItem(selected);const equip=document.createElement('button');equip.textContent='裝備';equip.onclick=()=>equipItem(selected.id);detail.append(txt,equip);if(equipped[selected.slot]?.id!==selected.id){const drop=document.createElement('button');drop.textContent='放到地上';drop.onclick=()=>{drops.push({type:'gear',x:p.x+45,y:p.y,item:selected,life:3600});bag=bag.filter(i=>i.id!==selected.id);packSelected=null;drawInventory();markDirty()};detail.append(drop)}}$('#bagcount').textContent=carriedItems().filter(i=>i.grid).reduce((n,i)=>n+itemSize(i)[0]*itemSize(i)[1],0)+' / 60 格';}
