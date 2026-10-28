/* Repository discovery: do not guess repository URLs. */
document.addEventListener('click',e=>{const b=e.target.closest('.project-repo-lookup');if(!b)return;const name=b.dataset.project||'project';window.open('https://github.com/search?q='+encodeURIComponent('"'+name+'" user:nickjon11')+'&type=repositories','_blank','noopener,noreferrer');});
