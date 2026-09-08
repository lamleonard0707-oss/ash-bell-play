'use strict';
// Three linked branches per class: learn → reshape → mastery.
const skillTrees=[
 [
  {name:'焚鐘共鳴',role:'爆發',cost:30,cd:8,nodes:[['焚鐘共鳴','震退周圍異物，留下八道燃燒火柱。'],['重鐘餘震','爆發傷害 +30%；火柱持續 5 秒。'],['末日鳴鐘','傷害 +60%；再次引爆中心火域。']]},
  {name:'隕燼雨',role:'遠程',cost:28,cd:7,nodes:[['隕燼雨','向瞄準位置連續降下三顆隕燼。'],['連星墜落','隕燼增加至五顆，爆炸範圍擴大。'],['熔土天幕','七顆隕燼；每次撞擊留下燃燒地面。']]},
  {name:'巡火護環',role:'護身',cost:24,cd:11,nodes:[['巡火護環','獲得 25 護盾；6 秒內自動射擊近敵。'],['雙鈴守望','護盾增至 40；每次射出雙火球。'],['不熄誓火','護盾 55；護環延長至 10 秒。']]}
 ],
 [
  {name:'白骨花庭',role:'召喚',cost:30,cd:8,nodes:[['白骨花庭','種下三株追擊骨芽，回復 22 生命。'],['繁骨叢生','五株骨芽；存續時間增至 14 秒。'],['永生骨園','七株骨芽；存續 18 秒，回復 44 生命。']]},
  {name:'棘骨扇',role:'穿刺',cost:23,cd:5,nodes:[['棘骨扇','射出五道穿透骨刺，命中減速。'],['分枝骨棘','七道骨刺，額外穿透兩名敵人。'],['白棘暴雨','九道骨刺；命中後再散出兩枚碎骨。']]},
  {name:'噬根井',role:'控制',cost:28,cd:10,nodes:[['噬根井','根井持續 4 秒，拉扯並傷害範圍內敵人。'],['盤根禁錮','範圍擴大；每次脈衝回復 2 生命。'],['枯榮輪轉','根井延長至 7 秒，傷害 +60%。']]}
 ],
 [
  {name:'萬象裂頁',role:'扇射',cost:30,cd:8,nodes:[['萬象裂頁','射出十六道穿透墨刃；拖曳改為扇射。'],['碎頁連斬','墨刃增加至二十道，傷害 +30%。'],['千頁崩解','二十四道墨刃；命中追加虛空脈衝。']]},
  {name:'穿頁斬',role:'突襲',cost:20,cd:5,nodes:[['穿頁斬','沿瞄準方向瞬移，斬擊沿途敵人。'],['折返筆鋒','落點追加一圈返刃，獲得短暫無敵。'],['無痕終章','瞬移距離增加；落點爆發範圍傷害。']]},
  {name:'墨淵',role:'聚怪',cost:30,cd:10,nodes:[['墨淵','留下虛空渦流，聚攏並持續切割敵人。'],['重墨漩渦','渦流範圍及吸力提高。'],['寂滅留白','渦流結束時爆發，傷害 +60%。']]}
 ],
 [
  {name:'冰契槍陣',role:'冰刺',cost:26,cd:6,nodes:[['冰契槍陣','扇形射出七道冰槍，命中減速。'],['雙重霜棘','九道冰槍，額外穿透兩名敵人。'],['碎冰裁決','十一道冰槍；擊中冰凍敵人傷害提高。']]},
  {name:'凝冬震',role:'凍結',cost:30,cd:9,nodes:[['凝冬震','目標區域爆發寒潮，凍結普通敵人 1 秒。'],['封霜領域','範圍擴大；凍結 1.6 秒。'],['極夜碎裂','凍結 2.2 秒，追加一次碎冰爆發。']]},
  {name:'寒鏡誓盾',role:'防禦',cost:24,cd:11,nodes:[['寒鏡誓盾','獲得 35 護盾，6 秒內向近敵射出冰片。'],['稜鏡反擊','護盾 55；每次射出雙冰片。'],['永凍壁壘','護盾 75；持續 10 秒，啟動時凍結近敵。']]}
 ]
];
let ranks=[1,0,0],skillPoints=2,activeSkill=0,skillTimers=[0,0,0],castFields=[],wards=[],spawnSerial=0,routeStage=0;
const seals=[{x:500,y:940,name:'燼落迴廊',color:'#d49d62'},{x:1660,y:940,name:'寒骨庭院',color:'#87c9df'},{x:1080,y:410,name:'噤聲鐘殿',color:'#b0a0e3'}];
const affixes=[
 {key:'plain',name:'原生',color:'#bdad8a',note:'無元素抗性',weight:26},
 {key:'ember',name:'熾焰',color:'#f09a57',note:'火抗 50% · 弱冰 +25% · 死亡爆燃',resist:0,weak:3,weight:10},
 {key:'frost',name:'霜殼',color:'#8cd9ec',note:'冰抗 50% · 弱火 +25% · 攻擊緩速',resist:3,weak:0,weight:10},
 {key:'storm',name:'雷脈',color:'#bd9df8',note:'虛空抗 50% · 弱骨 +25% · 延時雷擊',resist:2,weak:1,weight:10},
 {key:'iron',name:'鐵甲',color:'#c4c7bb',note:'骨刺抗 50% · 弱虛空 +25% · 厚甲',resist:1,weak:2,weight:10},
 {key:'venom',name:'腐囊',color:'#b2ce62',note:'攻擊中毒 · 死亡留下毒池',weight:9},
 {key:'blast',name:'引爆',color:'#ff9d5c',note:'死亡時大範圍爆炸 · 唔好企埋去收屍',weight:7},
 {key:'mender',name:'織血',color:'#e08fb0',note:'持續治療附近同伴 · 優先擊殺',weight:6},
 {key:'warden',name:'護壁',color:'#d8d2a8',note:'光環令附近同伴減傷 35%',weight:6},
 {key:'splitter',name:'裂體',color:'#a9d6a0',note:'死亡分裂成兩隻小體',weight:6},
 {key:'haste',name:'疾風',color:'#9fe6d8',note:'移動極快 · 難以拉開距離',weight:6},
 {key:'leech',name:'汲魂',color:'#c78bd8',note:'命中你就回復自身生命',weight:6}
];
const affixWeightTotal=affixes.reduce((n,a)=>n+a.weight,0);
function rollAffixIndex(){let r=Math.random()*affixWeightTotal;for(let i=0;i<affixes.length;i++){r-=affixes[i].weight;if(r<=0)return i}return 0}
function treeSkill(){return skillTrees[chosen][activeSkill]}
function resetExpansion(){ranks=[1,0,0];resetProgression();skillPoints=2;activeSkill=0;skillTimers=[0,0,0];castFields=[];wards=[];spawnSerial=0;routeStage=0;p.shield=0;p.chill=0;p.poison=0;p.poisonTick=0;p.satiety=0;p.curse=0;p.rewind=null;resetAngel();selectedTreeNode={branch:0,tier:0};$('#treebtn').hidden=false;seedEquipment();syncSkillLabel()}
function syncSkillLabel(){if(!p)return;$('#skill span').textContent=treeSkill().name;$('#treebtn').textContent='技能'+(skillPoints?' · '+skillPoints:'');$('#skillcycle').textContent='換招 · '+treeSkill().name;skillCD=skillTimers[activeSkill];drawSkillIcon()}
function selectSkill(i){if(!ranks[i]||casts.length)return;skillTimers[activeSkill]=skillCD;activeSkill=i;clearAim();syncSkillLabel();if(activePanel==='tree')drawTree()}
function cycleSkill(){if(mode!=='play')return;for(let i=1;i<=3;i++){const next=(activeSkill+i)%3;if(ranks[next]){selectSkill(next);return}}}
// One visible level per point; ranks are derived from it in progression.js.
function learnSkill(i){if(!p)return;learnSkillLevel(i)}
function drawTree(){drawIconTree();drawUpgrades();drawTalents()}
function gainSkillLevel(){skillPoints+=1;grantLevelPoints();p.maxhp+=6;p.hp=Math.min(p.maxhp,p.hp+15);damageMult*=1.08;syncSkillLabel();playSfx('level',p?.x);ring(p.x,p.y,'#ffe0a0',120,.8);toast('升級 · +1 技能等級點 · +1 強化點 · +'+ATTR_PER_LEVEL+' 屬性點')}
function castExpansion(target){if(mode!=='play'||skillCD>0||p.mp<manaCost()||casts.length)return;const spec=treeSkill();if(!monkCastAllowed())return;if(chosen===4&&activeSkill===2)p.hp-=Math.ceil(p.maxhp*.12);p.mp-=manaCost();castingBranch=activeSkill;skillCD=spec.cd*(ranks[activeSkill]>=5?.8:1)*skillCooldownMult(activeSkill);skillTimers[activeSkill]=skillCD;p.action=.65;const near=nearest();let aimTo=target||{x:near&&dist(near,p)<260?near.x:p.x+p.dx*140,y:near&&dist(near,p)<260?near.y:p.y+p.dy*140,dx:p.dx,dy:p.dy};if(!target&&near){const a=Math.atan2(near.y-p.y,near.x-p.x);aimTo.dx=Math.cos(a);aimTo.dy=Math.sin(a)}const at=(activeSkill===0&&chosen<3)||activeSkill===2&&(chosen===0||chosen===3)?(target&&chosen!==2?target:p):aimTo;beginActorGesture(p,activeSkill===1&&[2,4,5].includes(chosen)?'strike':'cast',Math.atan2(aimTo.dy,aimTo.dx),.65);applyBuildCast({branch:activeSkill,x:at.x,y:at.y});casts.push({type:chosen,branch:activeSkill,rank:ranks[activeSkill],x:at.x,y:at.y,dx:aimTo.dx,dy:aimTo.dy,aimed:!!target,age:0,release:.28});addVFX(chosen,p.x,p.y,78,.5);tone(160,.3,'triangle',.04)}
function burstAt(x,y,r,damage,element,freeze=0){r*=skillReachMult();addVFX(element,x,y,r*1.45,.9);ring(x,y,classes[element].color,r,.6);
 if(exploring)for(const s of mapSeals)if(!s.broken&&dist({x,y},s)<r+40)sealDamage(s,damage*.8);for(const f of foes)if(f.hp>0&&dist({x,y},f)<r){hit(f,damage,element);if(element===3){f.slow=3;f.frozen=f.type===3?Math.min(.25,freeze):freeze}}for(const o of props)if(dist({x,y},o)<r)hitProp(o,damage)}
function fanShot(c,count,damage,pierce,element){count+=skillExtraShots(c.branch??castingBranch);const a=Math.atan2(c.dy,c.dx);for(let i=0;i<count;i++){fire(p.x,p.y,a+(i-(count-1)/2)*.13,damage,490,classes[element].color,pierce);const sh=shots[shots.length-1];sh.element=element;sh.slow=3;sh.large=true;sh.shatter=c.rank===3;sh.boneBurst=element===1&&c.rank===3}}
function releaseExpansion(c){const b=c.branch||0,r=c.rank||1;castingBranch=b;const power=gearPower()*(1+(r-1)*.3)*skillPowerMult(b);playSfx('cast',c.x,c.type);shake=5;if(c.type===4){releaseMonk(c);return}if(c.type===5){releaseAngel(c);return}
 if(b===0&&c.type<3){const before=turrets.length,shotStart=shots.length;releaseLegacySkill(c);if(c.type===0){if(r>1)for(const z of burnZones)z.life=Math.max(z.life,5);if(r===3)castFields.push({kind:'meteor',x:c.x,y:c.y,r:170,delay:.7,life:1,damage:65*power,element:0})}if(c.type===1&&r>1){for(const t of turrets.slice(before))t.life=10+(r-1)*4;for(let i=0;i<(r-1)*2;i++)turrets.push({x:c.x+Math.cos(i*2.4)*155,y:c.y+Math.sin(i*2.4)*95,life:10+(r-1)*4,attack:i*.2})}if(c.type===2&&r>1){if(r===3)for(const sh of shots.slice(shotStart))sh.voidBurst=true;for(let i=0;i<(r-1)*4;i++){fire(p.x,p.y,i*Math.PI/2,55*power,500,classes[2].color,7);shots[shots.length-1].large=true;shots[shots.length-1].voidBurst=r===3}}return}
 if(c.type===0&&b===1){for(let i=0;i<1+r*2;i++){const a=i*2.4;castFields.push({kind:'meteor',x:c.x+Math.cos(a)*i*19,y:c.y+Math.sin(a)*i*12,r:75+r*12,delay:.25+i*.23,life:3,damage:48*power,element:0,burn:r===3})}}
 else if((c.type===0||c.type===3)&&b===2){p.shield=Math.max(p.shield,(c.type===3?35:25)+(r-1)*(c.type===3?20:15));wards.push({life:r===3?10:6,tick:0,element:c.type,rank:r});if(c.type===3&&r===3)burstAt(p.x,p.y,150,25*power,3,1.5);ring(p.x,p.y,classes[c.type].color,90,1)}
 else if(c.type===1&&b===1)fanShot(c,3+r*2,38*power,1+r*2,1);
 else if(c.type===1&&b===2||c.type===2&&b===2)castFields.push({kind:'vortex',x:c.x,y:c.y,r:115+r*25,life:r===3?7:4,tick:0,damage:15*power,element:c.type,rank:r});
 else if(c.type===2&&b===1){cancelMouse();const from={x:p.x,y:p.y};p.x+=c.dx*(r===3?280:210);p.y+=c.dy*(r===3?280:210);confine(p);p.inv=r>1?1:.55;for(let i=0;i<6;i++)ghosts.push({x:from.x+(p.x-from.x)*i/6,y:from.y+(p.y-from.y)*i/6,dx:c.dx,dy:c.dy,life:.55});for(const f of foes){const vx=p.x-from.x,vy=p.y-from.y,t=clamp(((f.x-from.x)*vx+(f.y-from.y)*vy)/(vx*vx+vy*vy||1),0,1);if(dist(f,{x:from.x+vx*t,y:from.y+vy*t})<70)hit(f,100*power,2)}if(r>1)burstAt(p.x,p.y,r===3?150:95,45*power,2)}
 else if(c.type===3&&b===0)fanShot(c,5+r*2,40*power,r*2,3);
 else if(c.type===3&&b===1){burstAt(c.x,c.y,135+r*25,75*power,3,.4+r*.6);if(r===3)castFields.push({kind:'meteor',x:c.x,y:c.y,r:180,delay:1.1,life:2,damage:65*power,element:3})}
}
function modifyEnemy(f,forced){const n=++spawnSerial,idx=forced??(n<3?0:rollAffixIndex());f.affix=affixes[idx].key;f.affixIndex=idx;f.name=affixes[idx].name+' · '+f.name;f.color=affixes[idx].color;f.elite=n>4&&Math.random()<.085;f.special=rnd(2,5);f.frozen=0;f.tick=rnd(1,3);
 if(f.affix==='iron'){f.hp*=1.4;f.speed*=.8}
 if(f.affix==='storm')f.speed*=1.25;
 if(f.affix==='haste'){f.speed*=1.35;f.hp*=.8}
 if(f.affix==='warden'){f.hp*=1.25;f.speed*=.9}
 if(f.affix==='mender')f.hp*=1.15;
 if(f.elite){f.hp*=rnd(1.5,1.95);f.scale=(f.scale||1)*1.18;f.name='精英 · '+f.name}
 f.maxhp=f.hp}
function adjustedDamage(f,d,element){const a=affixes[f.affixIndex||0];if(a.resist===element)d*=.5;if(a.weak===element)d*=1.25;if(f.warded>0&&f.affix!=='warden')d*=.65;return d}
function enemyDeath(f){
 if(f.affix==='ember')castFields.push({kind:'danger',x:f.x,y:f.y,r:82,delay:1,life:2,element:0,damage:20});
 if(f.affix==='venom')castFields.push({kind:'poison',x:f.x,y:f.y,r:75,life:4,tick:.7,element:1});
 if(f.affix==='blast')castFields.push({kind:'danger',x:f.x,y:f.y,r:150,delay:1.15,life:2.4,element:0,damage:26+(f.mapId||0)*2});
 if(f.affix==='splitter'&&!f.split&&f.type!==3){for(let i=0;i<2;i++){const hp=Math.max(18,f.maxhp*.3);foes.push({...f,split:true,elite:false,x:f.x+rnd(-40,40),y:f.y+rnd(-30,30),hp,maxhp:hp,r:(f.r||18)*.7,scale:(f.scale||1)*.66,speed:(f.speed||70)*1.25,state:'emerge',stateT:.4,attack:rnd(.6,1.4),name:'裂片 · '+(f.name||''),affix:'plain',affixIndex:0,warded:0})}}
 // BUG-008: elites always dropped an amulet; the slot is now rolled.
 if(f.elite){const slots=gearSlots.map(([k])=>k);dropGear(f.x,f.y,slots[Math.floor(rnd(0,slots.length))],Math.random()<.35+routeStage*.03)}}
function projectileVariation(sh,f){if(sh.slow||sh.element===3)f.slow=3;if(sh.element===3&&weaponWithEffect('shatter')){burstAt(f.x,f.y,48,sh.damage*.2,3,0)}if(sh.boneBurst&&!sh.fragment){for(const side of [-1,1]){fire(f.x,f.y,Math.atan2(sh.vy,sh.vx)+side*.55,sh.damage*.32,400,sh.color);const child=shots[shots.length-1];child.fragment=true;child.element=1;child.hit.add(f)}}if(sh.voidBurst){for(const other of foes)if(other!==f&&other.hp>0&&dist(other,f)<60)hit(other,sh.damage*.25,2)}}
function updateExpansion(dt){updateMonkFields(dt);for(let i=0;i<3;i++)if(i!==activeSkill)skillTimers[i]=Math.max(0,skillTimers[i]-dt);skillTimers[activeSkill]=skillCD;p.chill=Math.max(0,p.chill-dt);p.poison=Math.max(0,p.poison-dt);if(p.poison>0){p.poisonTick-=dt;if(p.poisonTick<=0){p.poisonTick=1;hurt(3,null,{dot:true})}}
 p.curse=Math.max(0,(p.curse||0)-dt);
 for(const f of foes){if(f.hp<=0)continue;f.frozen=Math.max(0,(f.frozen||0)-dt);f.special=(f.special||0)-dt;f.warded=Math.max(0,(f.warded||0)-dt);f.tick=(f.tick||0)-dt;
  if(f.affix==='storm'&&f.special<=0&&dist(f,p)<500){f.special=rnd(4,6);castFields.push({kind:'danger',x:p.x,y:p.y,r:55,delay:.9,life:2,element:2,damage:15})}
  if(f.affix==='warden'&&f.tick<=0){f.tick=.5;for(const q of foes)if(q!==f&&q.hp>0&&dist(q,f)<190)q.warded=.7}
  if(f.affix==='leech'&&f.tick<=0&&dist(f,p)<170){f.tick=1.2;f.hp=Math.min(f.maxhp,f.hp+f.maxhp*.05);hurt(3,null,{dot:true});ring(f.x,f.y,'#c78bd8',60,.35)}
  if(f.affix==='mender'&&f.tick<=0){f.tick=rnd(1.4,2.2);let healed=0;for(const q of foes)if(q!==f&&q.hp>0&&q.hp<q.maxhp&&dist(q,f)<230){q.hp=Math.min(q.maxhp,q.hp+q.maxhp*.07);healed++}if(healed){ring(f.x,f.y,'#e08fb0',110,.5);num(f.x,f.y-70,'治療','#e08fb0')}}
 }
 for(const w of wards){w.life-=dt;w.tick-=dt;const f=nearest();if(w.tick<=0&&f&&dist(f,p)<360){w.tick=.55;for(let i=0;i<(w.rank>1?2:1);i++){fire(p.x,p.y,Math.atan2(f.y-p.y,f.x-p.x)+i*.12,18*gearPower(),430,classes[w.element].color);shots[shots.length-1].element=w.element}}}wards=wards.filter(w=>w.life>0);
 for(const z of castFields){z.life-=dt;if(z.kind==='meteor'||z.kind==='danger'){z.delay-=dt;if(z.delay<=0){if(z.kind==='meteor'){burstAt(z.x,z.y,z.r,z.damage,z.element,z.freeze||0);if(z.burn)burnZones.push({x:z.x,y:z.y,r:z.r*.65,life:3,tick:0})}else{addVFX(z.element,z.x,z.y,z.r*2,.8);if(dist(z,p)<z.r)hurt(z.damage,z.element===2?'storm':'ember')}z.life=0}}
 else if(z.kind==='poison'){z.tick-=dt;if(z.tick<=0){z.tick=.8;if(dist(z,p)<z.r)hurt(5,'venom',{dot:true})}}
 else if(z.kind==='vortex'){z.tick-=dt;if(z.enemyOwned){if(dist(z,p)<z.r){p.x+=(z.x-p.x)*dt*1.15;p.y+=(z.y-p.y)*dt*1.15;confine(p);if(z.tick<=0)hurt(z.damage,null,{dot:true})}if(z.tick<=0)z.tick=.8;if(z.life<=0)continue}else{for(const f of foes)if(f.hp>0&&dist(z,f)<z.r){f.x+=(z.x-f.x)*dt*(z.rank>1?1.3:.8);f.y+=(z.y-f.y)*dt*(z.rank>1?1.3:.8);f.slow=.8;confine(f)}if(z.tick<=0){z.tick=.5;burstAt(z.x,z.y,z.r,z.damage,z.element);if(z.element===1&&z.rank>1)p.hp=Math.min(p.maxhp,p.hp+2)}if(z.life<=0&&z.rank===3)burstAt(z.x,z.y,z.r,70*gearPower(),z.element)}}}castFields=castFields.filter(z=>z.life>0);
}
function drawExpansion(){drawChapterFloorLabel();for(const z of castFields){const col=z.kind==='poison'?'#aaca56':classes[z.element].color;groundRing(z.x,z.y,z.r,col,.65,2);if(z.delay>0)groundRing(z.x,z.y,z.r*clamp(1-z.delay,0,1),col,.5,2);if(z.kind==='vortex'||z.kind==='blood'){drawFXFrame(z.element,2,z.x,z.y,z.r*1.6,.45,time*.7);glow(ctx,z.x,z.y,90,col,.2)}if(z.kind==='poison'){ctx.save();ctx.globalAlpha=.17;ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(z.x,z.y,z.r,z.r*.57,0,0,7);ctx.fill();ctx.restore()}}
 if(p&&p.shield>0)groundRing(p.x,p.y,31,'#b6dded',.8,2);for(const w of wards){for(let i=0;i<3;i++){const a=time*2+i*Math.PI*2/3;drawFXFrame(w.element,1,p.x+Math.cos(a)*47,p.y+Math.sin(a)*26-18,34,.85)}}}
function drawExpandedMap(){mc.clearRect(0,0,160,108);mc.strokeStyle='#a18b61';mc.strokeRect(7,8,146,94);mc.fillStyle=(chapters[routeStage]||chapters[0]).color;mc.font='11px Georgia';mc.fillText('區域 '+(routeStage+1),12,20);if(!p)return;for(const f of foes){mc.fillStyle=f.type===3?'#ff8657':f.color;mc.fillRect(f.x/world.w*160-1,f.y/world.h*108-1,f.elite?4:2,2)}mc.fillStyle='#fff3cc';mc.beginPath();mc.arc(p.x/world.w*160,p.y/world.h*108,3,0,7);mc.fill()}
function expansionHUD(){const waiting=!waveSpawn&&!foes.some(f=>f.hp>0)&&(wave===2||wave===4),seal=seals[Math.min(2,Math.floor(wave/2))];$('#regionlabel').textContent=p.y<620?'噤聲鐘殿':p.x<1080?'燼落迴廊':'寒骨庭院';if(waiting)ui.objective.textContent='前往 '+seal.name+' · '+Math.round(dist(p,seal))+' 步';$('#routehint').textContent=waiting?'跟隨小地圖光點，走入下一座封印':p.shield>0?'護盾 '+Math.ceil(p.shield):p.chill>0?'寒冷 · 移速降低':p.poison>0?'中毒 · 持續失血':'';const target=nearest();if(target){$('#targettype').textContent=target.type===3?'首領 · 蓄力裂環':affixes[target.affixIndex||0].note}$('#skillstatus').textContent=skillCD>0?'冷卻 '+Math.ceil(skillCD)+' 秒':treeSkill().name+' · '+manaCost()+' '+resourceName()}
function initExpansion(){$('#treebtn').onclick=()=>{if(p)panelOpen('tree')};$('#skillcycle').onclick=cycleSkill;addEventListener('keydown',e=>{if(e.repeat||mode!=='play')return;if(e.key.toLowerCase()==='l')panelOpen('tree');if(e.key.toLowerCase()==='q')cycleSkill()})}
// Imported opaque sprite sheets use a neutral matte. Key only edge-connected
// bright neutral backdrop pixels, retaining interior metallic highlights.
function keyAtlasBackdrop(c,w,h){const im=c.getImageData(0,0,w,h),d=im.data,n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;const neutral=i=>{const o=i*4,r=d[o],g=d[o+1],b=d[o+2];return Math.min(r,g,b)>182&&Math.max(r,g,b)-Math.min(r,g,b)<24};function seed(i){if(!seen[i]&&neutral(i)){seen[i]=1;queue[tail++]=i}}for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1)}while(head<tail){const i=queue[head++];d[i*4+3]=0;if(i%w)seed(i-1);if(i%w<w-1)seed(i+1);if(i>=w)seed(i-w);if(i<n-w)seed(i+w)}c.putImageData(im,0,0)}
