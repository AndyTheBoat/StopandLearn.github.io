'use strict';
let searchController, nextPage='', submittedQuery='';
function cancelSearch(){if(searchController)searchController.abort();}
async function searchVideos(append=false){
  if(!el('embed-consent').checked)return;
  const query=el('video-url').value.trim();
  if(!query)return;
  cancelSearch();
  const key=el('api-key').value.trim()||window.STOP_AND_LEARN_CONFIG?.youtubeApiKey;
  if(!key){el('search-status').textContent='Connect YouTube with an API key under YouTube connection to search videos.';el('api-key').closest('details').open=true;el('api-key').focus();return;}
  if(append&&query!==submittedQuery)append=false;
  const controller=new AbortController();searchController=controller;
  const button=el('video-form').querySelector('button');button.disabled=true;el('more-results').hidden=true;
  el('search-status').textContent='Searching YouTube…';
  const params=new URLSearchParams({part:'snippet',type:'video',q:query,maxResults:'6',videoEmbeddable:'true',videoSyndicated:'true',safeSearch:'strict',key});
  if(append&&nextPage)params.set('pageToken',nextPage);
  try{
    const response=await fetch('https://www.googleapis.com/youtube/v3/search?'+params,{signal:controller.signal,referrerPolicy:'strict-origin-when-cross-origin'});
    const data=await response.json();
    if(!response.ok){const reason=data.error?.errors?.[0]?.reason;throw new Error(['quotaExceeded','dailyLimitExceeded'].includes(reason)?'YouTube search quota has been reached. Try again after the quota resets or request more quota for this project.':reason==='keyInvalid'?'The YouTube API key is invalid. Check YouTube connection.':'YouTube search is unavailable. Check the API key, API access and website restrictions.');}
    if(controller.signal.aborted||!el('embed-consent').checked)return;
    if(!append)el('search-results').replaceChildren();
    for(const item of data.items||[]){
      const id=item.id?.videoId;if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))continue;
      const card=document.createElement('button');card.type='button';card.className='video-result';
      const title=document.createElement('strong');
      const parsed=new DOMParser().parseFromString(item.snippet.title,'text/html');title.textContent=parsed.documentElement.textContent;
      const channel=document.createElement('span');channel.textContent=item.snippet.channelTitle;
      const thumbnail=item.snippet.thumbnails?.medium?.url;
      if(thumbnail){try{const url=new URL(thumbnail);if(url.protocol==='https:'&&['i.ytimg.com','i1.ytimg.com'].includes(url.hostname)){const img=document.createElement('img');img.src=url.href;img.alt='';img.loading='lazy';card.append(img);}}catch{}}
      card.append(title,channel);card.addEventListener('click',()=>selectVideo(id));el('search-results').append(card);
    }
    submittedQuery=query;nextPage=data.nextPageToken||'';el('more-results').hidden=!nextPage;
    el('search-status').textContent=el('search-results').children.length?'YouTube results · Choose a video to watch.':'No videos found. Try another search.';
  }catch(error){if(error.name!=='AbortError')el('search-status').textContent=error instanceof TypeError?'Unable to connect to YouTube. Check your internet connection.':error.message;}
  finally{if(searchController===controller)button.disabled=!el('embed-consent').checked;}
}
el('video-form').addEventListener('submit',event=>{event.preventDefault();searchVideos();});
el('more-results').addEventListener('click',()=>searchVideos(true));
