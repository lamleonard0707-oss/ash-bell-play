'use strict';
// BUG-004: the selection clips were composited with globalCompositeOperation
// 'screen', which only hides pure black. The sources sit at about rgb(9,9,9), so a
// lighter rectangle showed behind each hero and the hero itself went translucent.
// The clips are now also shipped as VP9 WebM with a real alpha channel; where the
// browser can play that we draw them normally, and the mp4 + screen blend stays as
// the fallback for players whose browser cannot.
const selectionVideos=[];
const CLIP_COUNT=6;
const alphaSources=Array.from({length:CLIP_COUNT},()=>({})),plainSources=Array.from({length:CLIP_COUNT},()=>({}));
let cinematicIndex=-1,cinematicAlpha=false;
function supportsAlphaVideo(){
 try{const probe=document.createElement('video');
  if(typeof probe.canPlayType!=='function')return false;
  return probe.canPlayType('video/webm; codecs="vp9"')==='probably';
 }catch{return false}
}
function beginSelectionVideo(i){
 for(const v of selectionVideos)v.pause?.();
 const v=selectionVideos[i];cinematicIndex=i;
 if(!v||typeof v.play!=='function'){cinematicIndex=-1;return}
 v.currentTime=0;const attempt=v.play();attempt?.catch(()=>{cinematicIndex=-1});
}
function paintSelectionVideo(c,i,height){
 const v=selectionVideos[i];
 if(i!==cinematicIndex||!v||v.readyState<2||v.ended||v.paused||!v.videoWidth)return false;
 c.save();
 // With a real alpha channel the clip composites like any other sprite.
 if(!cinematicAlpha)c.globalCompositeOperation='screen';
 const width=height*v.videoWidth/v.videoHeight;
 c.drawImage(v,-width/2,-height,width,height);
 c.restore();return true;
}
function initCinematics(){
 cinematicAlpha=supportsAlphaVideo();
 // Literal asset paths let both offline exporters embed every clip.
 alphaSources[0].src='cinematics/hero-0.webm';plainSources[0].src='cinematics/hero-0.mp4';
 alphaSources[1].src='cinematics/hero-1.webm';plainSources[1].src='cinematics/hero-1.mp4';
 alphaSources[2].src='cinematics/hero-2.webm';plainSources[2].src='cinematics/hero-2.mp4';
 alphaSources[3].src='cinematics/hero-3.webm';plainSources[3].src='cinematics/hero-3.mp4';
 alphaSources[4].src='cinematics/hero-4.webm';plainSources[4].src='cinematics/hero-4.mp4';
 alphaSources[5].src='cinematics/hero-5.webm';plainSources[5].src='cinematics/hero-5.mp4';
 for(let i=0;i<CLIP_COUNT;i++){
  const v=document.createElement('video');
  v.muted=true;v.playsInline=true;v.loop=true;v.preload='metadata';v.setAttribute?.('playsinline','');
  v.addEventListener?.('error',()=>{
   // One retry on the other container before giving up on the clip entirely.
   if(cinematicAlpha&&v.src===alphaSources[i].src){cinematicAlpha=false;v.src=plainSources[i].src;return}
   if(cinematicIndex===i)cinematicIndex=-1;
  });
  v.src=cinematicAlpha?alphaSources[i].src:plainSources[i].src;
  selectionVideos.push(v);
 }
}
