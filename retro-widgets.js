(()=>{
  'use strict';
  const stack=document.getElementById('retro-widgets');if(!stack)return;
  if(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)){stack.hidden=true;stack.style.display='none';return;}
  const $=id=>document.getElementById(id);
  stack.querySelectorAll('.widget-collapse').forEach(btn=>btn.addEventListener('click',()=>{const section=btn.closest('.retro-widget');const collapsed=section.classList.toggle('collapsed');btn.textContent=collapsed?'+':'−';btn.setAttribute('aria-expanded',String(!collapsed));}));
  const audio=$('widget-audio'),filePicker=$('widget-audio-file'),list=$('widget-playlist'),seek=$('widget-audio-progress');
  const deck=stack.querySelector('.winamp-widget');let tracks=[],index=-1,objectUrls=[];
  let ctx=null, analyser=null, source=null, frequencies=null, vizFrame=0;
  const bars=[...deck.querySelectorAll('.winamp-visual i')];
  function setupViz(){
    if(ctx)return;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{ctx=new AC();analyser=ctx.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.76;
      source=ctx.createMediaElementSource(audio);source.connect(analyser);analyser.connect(ctx.destination);frequencies=new Uint8Array(analyser.frequencyBinCount);
      const paint=()=>{vizFrame=requestAnimationFrame(paint);if(!analyser||audio.paused){bars.forEach(b=>b.style.height='3px');return;}
        analyser.getByteFrequencyData(frequencies);bars.forEach((b,i)=>{const k=Math.min(frequencies.length-1,Math.floor(i*i*.31)+2);const val=(frequencies[k]+frequencies[Math.min(k+1,frequencies.length-1)])/2;b.style.height=(3+Math.round(val/255*18))+'px';});};paint();
    }catch(e){status('AUDIO ANALYSIS UNAVAILABLE');}
  }
  audio.crossOrigin='anonymous';

  // Drag only from the player title bar; keep it inside the viewport.
  const title=deck.querySelector('.retro-widget-title');
  let drag=null;
  title.addEventListener('pointerdown',e=>{
    if(e.button!==0 || e.target.closest('button'))return;
    const r=stack.getBoundingClientRect();
    drag={pointer:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};
    stack.style.left=r.left+'px';stack.style.top=r.top+'px';
    stack.style.right='auto';stack.style.bottom='auto';
    title.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  title.addEventListener('pointermove',e=>{
    if(!drag||drag.pointer!==e.pointerId)return;
    const maxX=Math.max(0,innerWidth-stack.offsetWidth);
    const maxY=Math.max(0,innerHeight-stack.offsetHeight-40);
    stack.style.left=Math.max(0,Math.min(maxX,e.clientX-drag.x))+'px';
    stack.style.top=Math.max(0,Math.min(maxY,e.clientY-drag.y))+'px';
  });
  function endDrag(e){if(drag?.pointer===e.pointerId)drag=null;}
  title.addEventListener('pointerup',endDrag);
  title.addEventListener('pointercancel',endDrag);

  const status=(s)=>{$('widget-audio-status').textContent=s;};
  const clock=(n)=>{if(!Number.isFinite(n))return 'LIVE';const t=Math.floor(n);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
  function draw(){list.replaceChildren();$('widget-track-count').textContent=tracks.length+' TRACK'+(tracks.length===1?'':'S');if(!tracks.length){const li=document.createElement('li');li.className='winamp-empty';li.textContent='Add audio files or a radio stream';list.append(li);return;}tracks.forEach((track,i)=>{const li=document.createElement('li');li.textContent=track.name;li.title=track.name;if(i===index)li.className='active';li.addEventListener('click',()=>load(i,true));list.append(li);});}
  function load(i,autoplay){if(i<0||i>=tracks.length)return;index=i;audio.pause();audio.src=tracks[i].url;audio.load();$('widget-song').textContent=tracks[i].name;$('widget-playback-type').textContent=tracks[i].kind==='radio'?'RADIO':'LOCAL';$('widget-time').textContent='00:00';seek.value=0;seek.disabled=tracks[i].kind==='radio';status(tracks[i].kind==='radio'?'INTERNET RADIO · CONNECTING':'LOCAL AUDIO · READY');draw();if(autoplay){setupViz();ctx?.resume();audio.play().catch(()=>status('PRESS PLAY OR CHECK SOURCE'));}}
  function addTrack(name,url,kind){tracks.push({name,url,kind});draw();if(index<0)load(0,true);else load(tracks.length-1,true);}
  $('widget-pick-audio').addEventListener('click',()=>filePicker.click());
  filePicker.addEventListener('change',()=>{const files=[...filePicker.files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|ogg|wav|m4a|flac|aac)$/i.test(f.name));if(!files.length){status('NO SUPPORTED AUDIO FILES');return;}for(const file of files){const url=URL.createObjectURL(file);objectUrls.push(url);tracks.push({name:file.name,url,kind:'local'});}draw();load(tracks.length-files.length,true);filePicker.value='';});
  $('widget-open-radio').addEventListener('click',()=>{$('widget-radio-entry').hidden=!$('widget-radio-entry').hidden;});
  $('widget-radio-play').addEventListener('click',()=>{const raw=$('widget-radio-url').value.trim();let url;try{url=new URL(raw);}catch{status('INVALID RADIO URL');return;}if(url.protocol!=='https:'){status('HTTPS STREAM REQUIRED');return;}addTrack(url.hostname,url.href,'radio');$('widget-radio-entry').hidden=true;});
  $('widget-audio-toggle').addEventListener('click',()=>{if(index<0){status('ADD AUDIO FIRST');return;}audio.paused?(setupViz(),ctx?.resume(),audio.play().catch(()=>status('STREAM UNAVAILABLE'))):audio.pause();});
  $('widget-audio-stop').addEventListener('click',()=>{audio.pause();audio.currentTime=0;status('STOPPED');});
  $('widget-audio-prev').addEventListener('click',()=>{if(tracks.length)load((index-1+tracks.length)%tracks.length,true);});
  $('widget-audio-next').addEventListener('click',()=>{if(tracks.length)load((index+1)%tracks.length,true);});
  $('widget-volume').addEventListener('input',e=>{audio.volume=Number(e.target.value)/100;});audio.volume=.75;
  audio.addEventListener('play',()=>{deck.classList.add('is-playing');$('widget-audio-toggle').textContent='Ⅱ';status(tracks[index]?.kind==='radio'?'INTERNET RADIO · PLAYING':'LOCAL AUDIO · PLAYING');});
  audio.addEventListener('pause',()=>{deck.classList.remove('is-playing');$('widget-audio-toggle').textContent='▶';});
  audio.addEventListener('timeupdate',()=>{$('widget-time').textContent=clock(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0){seek.disabled=false;seek.value=100*audio.currentTime/audio.duration;}});
  audio.addEventListener('error',()=>{status('UNAVAILABLE · CHECK FORMAT / CORS');deck.classList.remove('is-playing');});
  audio.addEventListener('ended',()=>{if(tracks.length>1)load((index+1)%tracks.length,true);});
  seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=audio.duration*Number(seek.value)/100;});
  window.addEventListener('pagehide',()=>objectUrls.forEach(url=>URL.revokeObjectURL(url)));
})();
