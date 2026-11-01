import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(express.json({limit:'100kb'}));
app.use(express.static('public'));
const limiter = new Map();
app.post('/api/chat', async (req,res)=>{
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({error:'Claude API key not configured. Add ANTHROPIC_API_KEY to .env on the server.'});
  const ip=req.ip, now=Date.now(), entry=limiter.get(ip)||[];
  const recent=entry.filter(t=>now-t<60000);
  if(recent.length>=20) return res.status(429).json({error:'Too many requests. Try again in a minute.'});
  recent.push(now);limiter.set(ip,recent);
  const {messages,companion}=req.body||{};
  if(companion && (typeof companion.name!=='string'||companion.name.length>60||typeof companion.personality!=='string'||companion.personality.length>1200)) return res.status(400).json({error:'Invalid companion settings.'});
  const companionName=companion?.name?.trim()||'N.E.L.L.Y.';
  const companionStyle=companion?.personality||'Warm, intelligent, approachable and conversational.';
  if(!Array.isArray(messages)||messages.length>30||messages.length===0||messages.some(m=>!['user','assistant'].includes(m?.role)||typeof m?.content!=='string'||m.content.length>6000)) return res.status(400).json({error:'Invalid chat messages.'});
  try{
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5',max_tokens:800,system:`You are ${companionName}, an AI companion. Your conversational style: ${companionStyle}. Be clear and helpful. When replying to voice questions, prefer short natural spoken responses. Do not claim to have taken actions you cannot take. Never pretend to be a real human or the person pictured in an avatar.`,messages})});
    const data=await response.json();
    if(!response.ok) return res.status(response.status).json({error:data.error?.message||'Claude API request failed.'});
    res.json({reply:(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n')||'I could not generate a reply.'});
  }catch(err){res.status(502).json({error:'Could not connect to Claude. Check the server connection.'});}
});
app.listen(process.env.PORT||3000,()=>console.log(`NELLY ready at http://localhost:${process.env.PORT||3000}`));
