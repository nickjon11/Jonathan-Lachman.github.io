import {pipeline, env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels=false;
const MODEL='onnx-community/SmolLM2-135M-Instruct-ONNX';
let generator=null;let device='';
const notify=(type,data)=>self.postMessage({type,...data});
async function load(){if(generator){notify('ready',{device});return}let last='';const progress_callback=p=>{if(p.status==='progress'&&p.total){const text='Downloading model: '+Math.round(p.progress||100*p.loaded/p.total)+'%';if(text!==last){last=text;notify('progress',{text})}}else if(p.status==='initiate')notify('progress',{text:'Fetching '+(p.file||'model files')})};
let error;
for(const dev of (self.navigator?.gpu?['webgpu','wasm']:['wasm'])){try{notify('progress',{text:'Initializing '+dev.toUpperCase()+'…'});generator=await pipeline('text-generation',MODEL,{device:dev,dtype:dev==='webgpu'?'q4':'q8',progress_callback});device=dev.toUpperCase();notify('ready',{device});return}catch(e){error=e;notify('progress',{text:dev+' unavailable; trying fallback…'})}}
throw error||Error('Model could not be loaded')}
self.onmessage=async e=>{const m=e.data;try{if(m.type==='load'){await load()}else if(m.type==='generate'){if(!generator)throw Error('Model not loaded');const messages=[{role:'system',content:'You are Luclid-ii, a friendly, concise assistant in a public portfolio demo. Be truthful about uncertainty. You have no tools, account access, or access to the visitor computer. Never claim to have executed actions.'},...m.history.slice(-10)];const result=await generator(messages,{max_new_tokens:180,do_sample:false,repetition_penalty:1.16,max_new_tokens:160});const output=result?.[0]?.generated_text;const answer=typeof output==='string'?output:Array.isArray(output)?output.at(-1)?.content:JSON.stringify(output);notify('answer',{text:String(answer||'No response generated.').trim(),device})}}catch(err){notify('error',{message:String(err?.message||err).slice(0,240)})}};
