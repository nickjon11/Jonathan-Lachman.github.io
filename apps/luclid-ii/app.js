"use strict";
const $=id=>document.getElementById(id);
const tabs=[];let current=0;let nextId=1;let worker=null;let modelReady=false;let modelBusy=false;let pending=null;
const welcome={role:'agent',text:'Welcome to Luclid-ii! This version runs a real, small AI model directly in your browser. Click Load AI Model to get started. The first download can take a while.'};
function newTab(){const tab={id:nextId++,name:'Chat '+nextId,messages:[{...welcome}]};tab.name='Chat '+tab.id;tabs.push(tab);current=tab.id;render();}
function render(){const bar=$('tabs');bar.replaceChildren();tabs.forEach(t=>{const item=document.createElement('div');item.className='tab'+(current===t.id?' active':'');item.tabIndex=0;item.setAttribute('role','tab');item.textContent=t.name;item.addEventListener('click',()=>{current=t.id;render()});item.addEventListener('keydown',e=>{if(e.key==='Enter'){current=t.id;render()}});item.addEventListener('contextmenu',e=>{e.preventDefault();const name=prompt('Rename conversation:',t.name);if(name&&name.trim()){t.name=name.trim().slice(0,45);render()}});const close=document.createElement('button');close.textContent='×';close.title='Close tab';close.onclick=e=>{e.stopPropagation();if(tabs.length===1)return;showCloseDialog(()=>{tabs.splice(tabs.indexOf(t),1);if(current===t.id)current=tabs[0].id;render()})};item.append(close);bar.append(item)});const plus=document.createElement('button');plus.textContent='+';plus.title='New conversation';plus.onclick=newTab;bar.append(plus);const log=$('chatlog');log.replaceChildren();tabs.find(t=>t.id===current).messages.forEach(m=>{const box=document.createElement('div');box.className='msg '+(m.role==='user'?'user':'agent');const who=document.createElement('b');who.textContent=m.role==='user'?'You':'Luclid-ii';box.append(who,document.createTextNode(m.text));log.append(box)});log.scrollTop=log.scrollHeight}
const knowledge={
 'python': 'Python is a general-purpose programming language. Example:\n\nfor number in range(1, 4):\n    print(number)\n\nAsk for a Python example involving lists, loops, functions, or dictionaries.',
 'javascript':'JavaScript runs interactive features in web pages. Example:\n\nconst greet = name => `Hello, ${name}!`;\nconsole.log(greet("visitor"));\n\nThis demo itself uses JavaScript.',
 'git':'Git tracks source-code changes. A typical workflow is:\n1. git status\n2. git add .\n3. git commit -m "Describe change"\n4. git push origin main\n\nCheck the branch and remote before pushing.',
 'docker':'Docker packages an application and its dependencies into containers. Common commands: docker ps, docker images, docker compose up -d, docker logs <container>. Avoid running unfamiliar commands on production systems.',
 'linux':'Linux is an operating-system family. Useful commands include pwd, ls -la, cd, cat, grep, and systemctl status. Ask me about a specific command or issue.',
 'network':'For connectivity troubleshooting: check your network connection, inspect IP settings, ping your gateway, then test DNS resolution. A ping failure alone does not always prove a host is down.',
 'security':'Good security basics: use unique passwords, MFA, updates, least privilege, and backups. Never paste passwords or API tokens into a public demo.',
 'fastapi':'FastAPI is a Python framework for APIs. Minimal example:\n\nfrom fastapi import FastAPI\napp = FastAPI()\n@app.get("/")\ndef home():\n    return {"message": "Hello"}',
 'html':'HTML structures web content, CSS styles it, and JavaScript adds behavior. Example:\n\n<button id="hello">Click</button>\n<script>document.querySelector("#hello").onclick = () => alert("Hello!");</script>',
 'sql':'SQL queries relational databases. Example:\n\nSELECT name FROM users WHERE active = TRUE;\n\nUse parameterized queries for user input to reduce SQL injection risk.'
};
function solveMath(q){
 const m=q.match(/(?:calculate|what is|what's|solve|compute)?\s*([-+]?\d+(?:\.\d+)?)\s*(\+|\-|\*|x|×|\/|÷|\^|plus|minus|times|divided by)\s*([-+]?\d+(?:\.\d+)?)/i);
 if(!m)return null;
 const a=Number(m[1]),b=Number(m[3]);let result;
 switch(m[2].toLowerCase()){case '+':case 'plus':result=a+b;break;case '-':case 'minus':result=a-b;break;case '*':case 'x':case '×':case 'times':result=a*b;break;case '/':case '÷':case 'divided by':result=b===0?'undefined (division by zero)':a/b;break;case '^':result=a**b;break;}
 return `Calculation: ${a} ${m[2]} ${b} = ${result}`;
}
function reply(q,tab){
 const s=q.trim().toLowerCase(),prev=tab?.lastTopic;
 if(s==='/help'||/what can you do|help me|show.*capabilit|example prompt/.test(s))return 'I can discuss Python, JavaScript, HTML, SQL, Git, Docker, Linux, networking, and security; explain common errors; do basic arithmetic; and show public GitHub projects. Try “Explain Docker”, “How do I fix a 404?”, “Write a Python loop”, or “What is 18 * 7?”. This is a local rule-based demo, not a general AI model.';
 if(s==='/system_info'||/system (info|diagnostic)|cpu.*ram/.test(s))return 'SAMPLE SYSTEM (NOT YOUR DEVICE)\nOS: Windows 11\nCPU: 8 cores\nRAM: 16 GB\nLocal model: disconnected\nNo real device inspection is performed.';
 if(s==='/status'||/are you online|connection status/.test(s))return 'Web demo: running locally in your browser\nAI model: not connected\nGitHub: public read-only API\nAccount integrations: disabled';
 if(s==='/about'||/who are you|what are you/.test(s))return 'I am Luclid-ii Web Demo v0.2.0, an interactive, rule-based preview of the Luclid-ii desktop AI agent. I do not have access to a real AI model, your computer, or private accounts.';
 if(/github|repositor|source code/.test(s))return 'Open the GitHub tab to explore public repositories. The demo does not request a token or modify repositories.';
 if(/hello|^hi$|^hey$|good morning|good afternoon/.test(s))return 'Hello! Ask me a technical question, request a short code example, or try a calculation. What are you working on?';
 if(/thank/.test(s))return 'You’re welcome! What would you like to explore next?';
 if(/^(why|how|explain more|tell me more|example|show me an example|can you elaborate)/.test(s)&&prev){q=prev+' '+q;}
 const math=solveMath(q);if(math)return math;
 const lower=q.toLowerCase();
 if(/404|not found/.test(lower))return 'A 404 means the requested resource was not found. Check the URL and capitalization, confirm index.html is in the served directory, inspect browser Network tools, and verify the server root. For Python http.server, run it from the folder containing index.html.';
 if(/permission denied|access denied/.test(lower))return 'Permission denied usually means the current user lacks access. Check ownership and permissions (ls -l), confirm the correct path, and use the least-privileged fix. Avoid chmod 777 as a shortcut.';
 if(/module not found|modulenotfounderror|no module named/.test(lower))return 'For a missing Python module, confirm which interpreter runs the script (python -V; which python), activate the intended virtual environment, then install the dependency with python -m pip install PACKAGE. Replace PACKAGE with the actual missing module.';
 if(/connection refused|cannot connect|connection error/.test(lower))return 'Connection refused typically means no service is accepting connections at that address and port. Verify the server is running, the port is correct, and firewall/bind settings permit the connection.';
 if(/write|show|give|make|create|example|sample|loop|function|code/.test(lower)){
  if(/python/.test(lower)){tab.lastTopic='python';if(/loop/.test(lower))return 'Python loop example:\n\nfor i in range(5):\n    print(i)\n\nThis prints 0 through 4.';if(/function/.test(lower))return 'Python function example:\n\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Visitor"))';return knowledge.python;}
  if(/javascript|\bjs\b/.test(lower)){tab.lastTopic='javascript';return knowledge.javascript;}
  if(/sql|database/.test(lower)){tab.lastTopic='sql';return knowledge.sql;}
 }
 const topics=[['python',/python|pip|pytest/],['javascript',/javascript|\bjs\b/],['git',/\bgit\b|commit|branch|push/],['docker',/docker|container/],['linux',/linux|debian|ubuntu|terminal/],['network',/network|dns|ip address|wifi|wi-fi|ping/],['security',/cyber|security|password|malware|phishing/],['fastapi',/fastapi|api endpoint/],['html',/html|css|website|web page/],['sql',/sql|database|postgres/]];
 for(const [key,pattern] of topics){if(pattern.test(lower)){if(tab)tab.lastTopic=key;return knowledge[key];}}
 if(/pentagon island/.test(lower))return 'Pentagon Island is a browser-based strategy game featured in this portfolio. Open it from the portfolio desktop to play the demo.';
 if(/luclid|portfolio|project/.test(lower))return 'Luclid-ii is a local AI-agent project, and this website hosts a safe interactive preview. You can also explore Pentagon Island and the other portfolio projects.';
 return 'I don’t have a reliable answer for that in this offline demo. Try asking about programming, Git, Docker, networking, security, troubleshooting, or arithmetic. For open-ended conversations, the full desktop Luclid-ii uses a connected local AI model.';
}
function setStatus(s){$('model-status').textContent=s}
function startWorker(){
if(location.protocol==='file:'){
 setStatus('Local AI needs HTTP: run python3 -m http.server 8000, then open http://localhost:8000');
 $('load-model').disabled=false;
 return;
}
if(worker)worker.terminate();worker=new Worker('model-worker.js',{type:'module'});modelReady=false;modelBusy=false;pending=null;$('load-model').disabled=true;setStatus('Downloading model / initializing…');worker.onmessage=e=>{const m=e.data;if(m.type==='progress'){setStatus(m.text);return}if(m.type==='ready'){modelReady=true;modelBusy=false;setStatus('AI ready · '+m.device);$('load-model').disabled=false;$('load-model').textContent='AI Loaded';return}if(m.type==='error'){modelBusy=false;setStatus('AI error: '+m.message);$('load-model').disabled=false;if(pending){const t=tabs.find(t=>t.id===pending.id);if(t){t.messages[pending.index].text='Model error: '+m.message;render()}pending=null}return}if(m.type==='answer'&&pending){const t=tabs.find(t=>t.id===pending.id);if(t){t.messages[pending.index].text=m.text; if(current===t.id)render()}pending=null;modelBusy=false;setStatus('AI ready · '+m.device)}};worker.onerror=e=>{modelBusy=false;setStatus('AI worker could not load. Use http://localhost:8000 and check internet access / browser console.');$('load-model').disabled=false;worker.terminate();worker=null};worker.postMessage({type:'load'})}
$('load-model').onclick=()=>{if(!modelReady)startWorker()};
$('reset-model').onclick=()=>{if(worker)worker.terminate();worker=null;modelReady=false;modelBusy=false;pending=null;setStatus('AI not loaded');$('load-model').disabled=false;$('load-model').textContent='Load AI Model'};
$('chat-form').onsubmit=e=>{e.preventDefault();const q=$('prompt').value.trim();if(!q)return;if(modelBusy){setStatus('Wait for the current reply to finish');return}const t=tabs.find(t=>t.id===current);t.messages.push({role:'user',text:q});$('prompt').value='';if(!modelReady){t.messages.push({role:'agent',text:'Please click Load AI Model first. It downloads the model once and caches it in your browser.'});render();return}const history=t.messages.filter(m=>(m.role==='user'||m.role==='agent') && m.text!==welcome.text && !/Please click Load AI Model|Model error:|Thinking…|AI worker could not load/i.test(m.text)).slice(0,-1).slice(-8).map(m=>({role:m.role==='agent'?'assistant':'user',content:m.text}));t.messages.push({role:'agent',text:'Thinking…'});pending={id:t.id,index:t.messages.length-1};modelBusy=true;setStatus('Generating reply…');worker.postMessage({type:'generate',history:[...history,{role:'user',content:q}]});render()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===b.dataset.panel))});
$('simulate').onclick=()=>{$('diagnostics').textContent='[SIMULATION] CPU: 22%\n[SIMULATION] Memory: 5.2 / 16 GB\n[SIMULATION] Disk: healthy\nNo hardware inspection performed.'};
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>{$('tool-output').textContent=reply(b.dataset.command)});
$('github-form').onsubmit=async e=>{e.preventDefault();const user=$('gh-user').value.trim();const out=$('github-results');out.replaceChildren();if(!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(user)){out.textContent='Enter a valid public GitHub username.';return}out.textContent='Loading public repositories…';try{const res=await fetch('https://api.github.com/users/'+encodeURIComponent(user)+'/repos?sort=updated&per_page=20',{headers:{Accept:'application/vnd.github+json'}});if(!res.ok)throw Error(res.status===404?'User not found':`GitHub API returned ${res.status}`);const data=await res.json();out.replaceChildren();if(!data.length){out.textContent='No public repositories found.';return}data.forEach(repo=>{const row=document.createElement('div');row.className='repo';const a=document.createElement('a');a.href=repo.html_url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=repo.name;const detail=document.createElement('small');detail.textContent=(repo.description||'No description')+' · ★ '+repo.stargazers_count;row.append(a,detail);out.append(row)})}catch(err){out.textContent='Unable to load public GitHub repositories: '+err.message+'. You can still use the rest of the demo offline.'}};
newTab();
function showCloseDialog(onConfirm){
 document.querySelector('.retro-confirm-overlay')?.remove();
 const overlay=document.createElement('div');overlay.className='retro-confirm-overlay';
 const box=document.createElement('div');box.className='retro-confirm';box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Close conversation');
 const bar=document.createElement('div');bar.className='retro-confirm-title';bar.textContent='Luclid-ii — Confirm';
 const body=document.createElement('div');body.className='retro-confirm-body';body.textContent='Are you sure you want to close this conversation?';
 const actions=document.createElement('div');actions.className='retro-confirm-actions';
 const yes=document.createElement('button');yes.textContent='Yes, Close';const no=document.createElement('button');no.textContent='Cancel';
 const dismiss=()=>{document.removeEventListener('keydown',onKey);overlay.remove()};
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();dismiss()}};
 yes.onclick=()=>{dismiss();onConfirm()};no.onclick=dismiss;
 actions.append(yes,no);box.append(bar,body,actions);overlay.append(box);document.body.append(overlay);document.addEventListener('keydown',onKey);no.focus();
}
