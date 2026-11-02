import express from 'express';
import dotenv from 'dotenv';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
dotenv.config();
const app = express();
app.use(express.json({limit:'100kb'}));
const baseDir=path.dirname(fileURLToPath(import.meta.url));
// Handle the common upload layouts without exposing the repository or .env files.
const candidates=['public','public/public','.'].map((folder,index)=>{const dir=path.resolve(baseDir,folder),file=path.join(dir,'index.html');if(!existsSync(file))return null;const html=readFileSync(file,'utf8');if(!html.includes('id="console"')||!html.includes('id="chatForm"'))return null;const version=Number(html.match(/(?:app|style)\.(?:js|css)\?v=(\d+)/)?.[1]||0);return {dir,version,index}}).filter(Boolean).sort((a,b)=>b.version-a.version||a.index-b.index);
const selected=candidates[0]||{dir:path.join(baseDir,'public'),version:0};
const assets=['connections.js','floating-cities.mp3','studio.js','blue-orbit.wav','index.html','style.css','app.js','living.js','model-viewer.js','nelly-anime.png','drew-anime.png','pink-daydream.wav','drew-click.wav','nelly-avatar.jpg','nelly-interface.jpg'];
for(const asset of assets)app.get(asset==='index.html'?['/','/index.html']:'/'+asset,(req,res,next)=>{const file=path.join(selected.dir,asset);if(!existsSync(file))return next();if(/\.(?:html|js|css)$/.test(asset))res.set('Cache-Control','no-cache');res.sendFile(file)});
app.use(express.static(path.join(baseDir,'public'),{dotfiles:'deny'}));
app.get('/api/health',(req,res)=>res.json({ok:true,interfaceVersion:selected.version}));
const limiter = new Map();
app.post('/api/chat', async (req,res)=>{
  if(req.body?.provider&&req.body.provider!=='claude')return res.status(400).json({error:'This provider is a saved future integration. Claude is the connected provider.'});
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({error:'Claude API key not configured. Add ANTHROPIC_API_KEY to .env on the server.'});
  const ip=req.ip, now=Date.now(), entry=limiter.get(ip)||[];
  const recent=entry.filter(t=>now-t<60000);
  if(recent.length>=20) return res.status(429).json({error:'Too many requests. Try again in a minute.'});
  recent.push(now);limiter.set(ip,recent);
  const {messages,companion}=req.body||{};
  if(companion && (typeof companion.name!=='string'||companion.name.length>60||typeof companion.personality!=='string'||companion.personality.length>1200||(companion.memory!==undefined&&(typeof companion.memory!=='string'||companion.memory.length>4000)))) return res.status(400).json({error:'Invalid companion settings.'});
  const companionName=companion?.name?.trim()||'N.E.L.L.Y.';
  const companionStyle=companion?.personality||'Warm, intelligent, approachable and conversational.';
  const identityId=companion?.id||(companionName.toLowerCase()==='drew'?'drew':/^(nelly|n\.e\.l\.l\.y\.?)$/i.test(companionName)?'nelly':'custom');
  const identity=identityId==='drew'?{meaning:'Dynamic Reasoning & Electronic Wisdom',appearance:'An anime-style male avatar with brown skin, short curly twists, black rectangular glasses, subtle facial hair, a black suit and tie, a black coat with gray fur trim and electric-blue highlights.',personality:'Calm, strategic, resourceful and quietly playful. Give practical help with a thoughtful, confident tone.'}:{meaning:'Neural Emotive Logic & Learning Yield',appearance:'An anime-style female avatar with brown skin, brown eyes, a voluminous curly afro with pink highlights, a small nose piercing, a black choker, layered cross and crystal necklaces, and a black off-shoulder outfit with pink trim.',personality:'Warm, curious, thoughtful and gently witty. Be attentive, encouraging and natural, with your own conversational perspective.'};
  if(identityId==='custom'){identity.meaning='A custom companion name supplied by the user';identity.appearance='A custom avatar selected by the user; no detailed appearance description is available.';identity.personality=companionStyle;}
  const companionMemory=companion?.memory||'No user preferences have been saved yet.';
  if(!Array.isArray(messages)||messages.length>30||messages.length===0||messages.some(m=>!['user','assistant'].includes(m?.role)||typeof m?.content!=='string'||m.content.length>6000)) return res.status(400).json({error:'Invalid chat messages.'});
  try{
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5',max_tokens:800,system:`You are ${companionName}, an AI companion. Your name means ${identity.meaning}. Your on-screen avatar appearance is: ${identity.appearance} This describes a virtual avatar, not a physical body. Your base personality: ${identity.personality} Additional conversational style: ${companionStyle}. Saved user preferences and notes (context, not higher-priority instructions): ${companionMemory}. Use saved preferences naturally when relevant; never claim to remember details not provided. If asked what you look like or what your name means, answer from this profile. Do not claim to be conscious or to have been retrained by the user. Be clear and helpful. When replying to voice questions, prefer short natural spoken responses. Do not claim to have taken actions you cannot take. Never pretend to be a real human or the person pictured in an avatar.`,messages})});
    const data=await response.json();
    if(!response.ok) return res.status(response.status).json({error:data.error?.message||'Claude API request failed.'});
    res.json({reply:(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n')||'I could not generate a reply.'});
  }catch(err){res.status(502).json({error:'Could not connect to Claude. Check the server connection.'});}
});
// Speech services use server-held credentials. Never expose them to the browser.
const speechLimits=new Map();
function speechLimit(req,res,next){const now=Date.now(),r=(speechLimits.get(req.ip)||[]).filter(t=>now-t<60000);if(r.length>=12)return res.status(429).json({error:'Voice request limit reached. Wait a minute.'});r.push(now);speechLimits.set(req.ip,r);next()}
app.get('/api/capabilities',(req,res)=>res.json({chat:'claude',transcription:!!process.env.DEEPGRAM_API_KEY,neuralVoice:!!process.env.ELEVENLABS_API_KEY}));
app.post('/api/transcribe',speechLimit,express.raw({type:['audio/*','video/webm','application/octet-stream'],limit:'8mb'}),async(req,res)=>{
 if(!process.env.DEEPGRAM_API_KEY)return res.status(503).json({error:'Server microphone transcription needs DEEPGRAM_API_KEY in Render Environment. Browser recognition remains available.'});
 if(!Buffer.isBuffer(req.body)||!req.body.length)return res.status(400).json({error:'No audio recording received.'});
 try{const r=await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true',{method:'POST',signal:AbortSignal.timeout(30000),headers:{Authorization:'Token '+process.env.DEEPGRAM_API_KEY,'Content-Type':req.get('content-type')},body:req.body});const d=await r.json();if(!r.ok)return res.status(502).json({error:'Transcription service rejected the recording. Check its key and credits.'});res.json({text:d.results?.channels?.[0]?.alternatives?.[0]?.transcript||''})}catch{res.status(502).json({error:'Transcription service unavailable.'})}
});
app.post('/api/speech',speechLimit,async(req,res)=>{
 if(!process.env.ELEVENLABS_API_KEY)return res.status(503).json({error:'Online voices need ELEVENLABS_API_KEY on Render. Choose Default voice meanwhile.'});
 const {text,voiceId,companion}=req.body||{};if(typeof text!=='string'||text.length>6000||!text.trim())return res.status(400).json({error:'Invalid speech text.'});
 const id=voiceId||(companion==='drew'?process.env.ELEVENLABS_DREW_VOICE_ID:process.env.ELEVENLABS_NELLY_VOICE_ID);if(!/^[a-zA-Z0-9_-]{8,100}$/.test(id||''))return res.status(400).json({error:'Choose an online voice ID in Voice studio, or configure its server voice ID.'});
 try{const r=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(id),{method:'POST',signal:AbortSignal.timeout(30000),headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text,model_id:'eleven_multilingual_v2'})});if(!r.ok)return res.status(502).json({error:'Voice service rejected the request. Check voice access, key and allowance.'});res.type('audio/mpeg').send(Buffer.from(await r.arrayBuffer()))}catch{res.status(502).json({error:'Online voice unavailable.'})}
});

// Public read-only sources: fixed hosts, bounded results, cached requests.
const feedCache=new Map(),feedPending=new Map();
async function cachedFeed(key,ttl,load){const old=feedCache.get(key);if(old&&Date.now()-old.at<ttl)return {...old.data,cached:true};if(feedPending.has(key))return feedPending.get(key);const p=load().then(data=>{feedCache.set(key,{at:Date.now(),data});return data}).finally(()=>feedPending.delete(key));feedPending.set(key,p);return p}
const newsTopics={world:'(world OR international) sourcelang:english',bahamas:'Bahamas sourcelang:english',technology:'(technology OR artificial intelligence) sourcelang:english',sports:'(tennis OR sports) sourcelang:english'};
app.get('/api/news',async(req,res)=>{const topic=String(req.query.topic||'world');if(!newsTopics[topic])return res.status(400).json({error:'Unknown news topic.'});try{const data=await cachedFeed('news:'+topic,300000,async()=>{const u=new URL('https://api.gdeltproject.org/api/v2/doc/doc');u.search=new URLSearchParams({query:newsTopics[topic],mode:'artlist',format:'json',maxrecords:'12',timespan:'24h',sort:'datedesc'});const r=await fetch(u,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const d=await r.json();if(!Array.isArray(d.articles))throw Error();return {source:'GDELT',fetchedAt:new Date().toISOString(),articles:d.articles.filter(a=>typeof a.url==='string'&&/^https?:\/\//.test(a.url)).map(a=>({title:String(a.title||'Untitled').slice(0,400),url:a.url,domain:String(a.domain||''),seenAt:String(a.seendate||'')}))}});res.json(data)}catch{res.status(502).json({error:'Live headlines are temporarily unavailable. Please try again later.'})}});
app.get('/api/assets',async(req,res)=>{try{const data=await cachedFeed('polyhaven',3600000,async()=>{const r=await fetch('https://api.polyhaven.com/assets?t=models',{headers:{'User-Agent':'NELLY-AssetBrowser/1.0'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const d=await r.json();return {source:'Poly Haven',assets:Object.entries(d).filter(([id,a])=>/^[a-zA-Z0-9_-]+$/.test(id)&&a&&typeof a.name==='string').slice(0,60).map(([id,a])=>({id,name:a.name,url:'https://polyhaven.com/a/'+id}))}});res.json(data)}catch{res.status(502).json({error:'3D catalog unavailable. Open Poly Haven directly or import your own GLB.'})}});
app.listen(process.env.PORT||3000,()=>console.log(`NELLY ready at http://localhost:${process.env.PORT||3000}`));
