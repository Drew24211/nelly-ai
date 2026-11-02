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
const assets=['index.html','style.css','app.js','living.js','model-viewer.js','nelly-anime.png','drew-anime.png','pink-daydream.wav','drew-click.wav','nelly-avatar.jpg','nelly-interface.jpg'];
for(const asset of assets)app.get(asset==='index.html'?['/','/index.html']:'/'+asset,(req,res,next)=>{const file=path.join(selected.dir,asset);if(!existsSync(file))return next();if(/\.(?:html|js|css)$/.test(asset))res.set('Cache-Control','no-cache');res.sendFile(file)});
app.use(express.static(path.join(baseDir,'public'),{dotfiles:'deny'}));
app.get('/api/health',(req,res)=>res.json({ok:true,interfaceVersion:selected.version}));
const limiter = new Map();
app.post('/api/chat', async (req,res)=>{
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
app.listen(process.env.PORT||3000,()=>console.log(`NELLY ready at http://localhost:${process.env.PORT||3000}`));
