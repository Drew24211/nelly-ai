(()=>{
 const one=s=>document.querySelector(s);
 function greeting(){const hour=new Date().getHours();one('#homeGreeting').replaceChildren(document.createTextNode((hour<12?'Good morning':hour<18?'Good afternoon':'Good evening')+', '));const name=document.createElement('strong');name.textContent='Drew';one('#homeGreeting').append(name)}greeting();setInterval(greeting,60000);
 function navigate(page){
  document.querySelectorAll('[data-home-nav]').forEach(b=>{const chosen=b.dataset.homeNav===page;b.classList.toggle('active',chosen);if(chosen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(page==='Home'){one('#chatLog').hidden=true;one('#dialog').close();return}
  if(page==='Chat'){one('nav [data-page="Chat"]').click();one('#message').focus();return}
  one('nav [data-page="'+page+'"]').click();
  if(page==='Settings'){
   const content=one('#dialogContent');
   const title=document.createElement('h3');title.textContent='Assistant tools';content.append(title);
   for(const label of ['Voice','Models','Memory','Tools']){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>one('nav [data-page="'+label+'"]').click();content.append(b)}
   const phone=one('.phonePanel');if(phone){const b=document.createElement('button');b.type='button';b.textContent='Install & phone options';b.onclick=()=>{one('#dialogContent').replaceChildren();const holder=document.createElement('div');phone.before(holder);one('#dialogContent').append(phone);one('#dialog').addEventListener('close',()=>{holder.replaceWith(phone)},{once:true})};content.append(b)}
  }
 }
 document.querySelectorAll('[data-home-nav]').forEach(b=>b.onclick=()=>navigate(b.dataset.homeNav));
 document.querySelectorAll('[data-home-action]').forEach(b=>b.onclick=()=>{
  const action=b.dataset.homeAction;
  if(action==='research'){navigate('Chat');one('#message').value='Help me research ';one('#message').focus();return}
  if(action==='day'){navigate('Planner');return}
  if(action==='music'){one('#musicTab').click();return}
  if(action==='weather'){
   modal('<h2>Weather</h2><p id="homeWeather"></p><button id="homeWeatherLocation" type="button">Change location</button><p><a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather by Open-Meteo</a></p>');
   one('#homeWeather').textContent=one('#weatherText').textContent;
   one('#homeWeatherLocation').onclick=()=>one('#weatherLocation').click();
  }
 });
})();
