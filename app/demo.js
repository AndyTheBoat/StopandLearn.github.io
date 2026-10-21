'use strict';
const el=id=>document.getElementById(id);
const sets={math:[['6 × 7 = ?','42'],['8 × 4 = ?','32'],['9 × 3 = ?','27'],['5 × 8 = ?','40']]};
let player,apiPromise,pendingQuestion=false,currentQuestion,index=0,answered=0,correct=0,played=0,lastTime=null,generation=0,restoreFullscreen=false,wrongAttempts=0;
function parseVideo(value){const v=value.trim();if(/^[A-Za-z0-9_-]{11}$/.test(v))return v;try{const u=new URL(v);const host=u.hostname.toLowerCase().replace(/^www\./,'');let id;if(host==='youtu.be')id=u.pathname.split('/')[1];else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)){id=u.searchParams.get('v');if(!id&&/^\/(embed|shorts|live)\//.test(u.pathname))id=u.pathname.split('/')[2];}return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;}catch{return null;}}
function parseStart(value){try{const u=new URL(value.trim());const raw=u.searchParams.get('t')||u.searchParams.get('start')||'';if(/^\d+$/.test(raw))return Number(raw);const m=/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);return m?Number(m[1]||0)*3600+Number(m[2]||0)*60+Number(m[3]||0):0;}catch{return 0;}}
function loadAPI(){if(window.YT&&YT.Player)return Promise.resolve();if(apiPromise)return apiPromise;apiPromise=new Promise((resolve,reject)=>{window.onYouTubeIframeAPIReady=resolve;const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{apiPromise=null;reject(new Error('Unable to load YouTube. Check your connection and try again.'));};document.head.append(script);});return apiPromise;}
function clearQuestion(){pendingQuestion=false;wrongAttempts=0;el('answer').disabled=false;el('answer').required=true;el('answer-form').querySelector('button[type=submit]').textContent='Check answer';el('answer-form').hidden=true;el('feedback').textContent='';el('waiting').hidden=false;played=0;lastTime=null;}
function updateScore(){el('score').textContent=`${answered} answered · ${correct} correct`;}
function resumePlayback(){
  const restore=restoreFullscreen;restoreFullscreen=false;
  clearQuestion();
  if(restore&&player){
    const frame=player.getIframe();
    if(frame.requestFullscreen){
      try{const request=frame.requestFullscreen();if(request&&request.catch)request.catch(()=>{el('player-status').textContent='Playing. Use the YouTube full screen button to return to full screen.';});}catch{el('player-status').textContent='Playing. Use the YouTube full screen button to return to full screen.';}
    }
  }
  if(player)player.playVideo();
}
async function revealQuestion(){
  if(document.fullscreenElement&&document.exitFullscreen){
    try{await document.exitFullscreen();}catch{el('player-status').textContent='A question is ready. Exit full screen to answer.';}
  }
  if(!pendingQuestion)return;
  el('answer-form').scrollIntoView({behavior:'smooth',block:'center'});
  el('answer').focus({preventScroll:true});
}
function askQuestion(){if(!player||pendingQuestion)return;restoreFullscreen=!!document.fullscreenElement;player.pauseVideo();pendingQuestion=true;wrongAttempts=0;el('answer').disabled=false;el('answer').required=true;el('answer-form').querySelector('button[type=submit]').textContent='Check answer';const list=sets[el('question-set').value];currentQuestion=list[index++%list.length];el('question').textContent=currentQuestion[0];el('answer').value='';el('answer-form').hidden=false;el('waiting').hidden=true;el('feedback').textContent='';el('player-status').textContent='Time to learn. Answer the question to continue the video.';revealQuestion();}
async function selectVideo(id,startSeconds=0){if(!id){el('player-status').textContent='Select a video from the search results.';return;}if(!el('embed-consent').checked)return;restoreFullscreen=false;el('search-results').hidden=true;el('more-results').hidden=true;el('search-status').textContent='';const request=++generation;el('player-status').textContent='Loading video…';clearQuestion();try{await loadAPI();if(request!==generation)return;if(player){player.loadVideoById({videoId:id,startSeconds});el('player-status').textContent='Starting video…';}else{player=new YT.Player('player',{videoId:id,width:'100%',height:'100%',host:'https://www.youtube-nocookie.com',playerVars:{start:startSeconds,playsinline:1,autoplay:1,controls:1,origin:location.origin},events:{onReady:event=>{event.target.playVideo();},onAutoplayBlocked:()=>{el('player-status').textContent='Your browser blocked automatic playback. Press Play in the YouTube player.';},onStateChange:e=>{lastTime=null;if(e.data===YT.PlayerState.PLAYING){if(pendingQuestion)clearQuestion();el('player-status').textContent='Enjoy watching. Your next question will appear at the break.';}else if(e.data===YT.PlayerState.ENDED){el('player-status').textContent='Video finished. Choose another video to continue.';}},onError:e=>{el('player-status').textContent=`Video unavailable (error ${e.data}). Choose another video.`;}}});}}catch(error){el('player-status').textContent=error.message;}}

el('answer-form').addEventListener('submit',event=>{event.preventDefault();if(!pendingQuestion)return;if(wrongAttempts>=3){resumePlayback();return;}const value=el('answer').value.trim().toLowerCase();if(!value)return;answered++;const ok=value===currentQuestion[1];if(ok){correct++;resumePlayback();el('feedback').textContent='Correct! Continuing the video.';updateScore();return;}wrongAttempts++;if(wrongAttempts>=3){el('feedback').textContent=`The answer is ${currentQuestion[1]}. You can continue the video.`;el('answer').disabled=true;el('answer').required=false;el('answer-form').querySelector('button[type=submit]').textContent='Continue video';}else{el('feedback').textContent=`Not quite. Try again (${wrongAttempts}/3).`;el('answer').focus({preventScroll:true});el('answer').select();}updateScore();});

el('reset').addEventListener('click',()=>{answered=correct=index=0;clearQuestion();el('answer').value='';currentQuestion=null;updateScore();el('player-status').textContent='Progress cleared. Ready to start again.';});
el('question-set').addEventListener('change',()=>{index=0;clearQuestion();});el('interval').addEventListener('change',()=>{played=0;lastTime=null;});
setInterval(()=>{if(!player||typeof player.getPlayerState!=='function'||pendingQuestion||player.getPlayerState()!==YT.PlayerState.PLAYING){lastTime=null;return;}const now=player.getCurrentTime();if(lastTime!==null){const delta=now-lastTime;if(delta>0&&delta<2)played+=delta;}lastTime=now;const seconds=Number(el('interval').value);if(seconds>0&&played>=seconds)askQuestion();},500);

// Agreement is session-only; no cookies, consent identifiers or stored answers.
const gatedControls=['question-set','interval','video-url','api-key'];
function gateDemo(){const agreed=el('embed-consent').checked;gatedControls.forEach(id=>{el(id).disabled=!agreed;});el('video-form').querySelector('button[type=submit]').disabled=!agreed;if(!agreed){if(typeof cancelSearch==='function')cancelSearch();el('search-results').replaceChildren();el('more-results').hidden=true;if(player||apiPromise){generation++;if(player)player.destroy();location.reload();}}}
el('embed-consent').addEventListener('change',gateDemo);
el('withdraw').addEventListener('click',()=>{generation++;if(player)player.destroy();location.reload();});
el('embed-consent').checked=false;gateDemo();
