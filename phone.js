(()=>{
 let installPrompt,lock,keepAwake=false;
 const panel=document.createElement('section');panel.className='phonePanel';panel.setAttribute('aria-label','Phone app');
 panel.innerHTML='<button id="installNelly" type="button">↓ Install Nelly</button><button id="keepNellyAwake" type="button" aria-pressed="false">Keep screen awake: off</button><p id="phoneStatus" role="status"></p>';
 document.querySelector('.rail').append(panel);
 const install=panel.querySelector('#installNelly'),awake=panel.querySelector('#keepNellyAwake'),status=panel.querySelector('#phoneStatus');
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 function updateInstall(){install.textContent=standalone()?'Nelly is installed':'↓ Install Nelly';install.disabled=!!standalone()}
 updateInstall();
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstall()});
 window.addEventListener('appinstalled',()=>{installPrompt=null;install.disabled=true;install.textContent='Nelly is installed';status.textContent='Open Nelly from your home screen.'});
 install.onclick=async()=>{
  if(installPrompt){try{await installPrompt.prompt();const choice=await installPrompt.userChoice;status.textContent=choice.outcome==='accepted'?'Installation accepted. Look for Nelly on your home screen.':'Installation cancelled.'}catch{status.textContent='Open the browser menu and choose Install app or Add to home screen.'}finally{installPrompt=null}return}
  status.textContent=/iPad|iPhone|iPod/.test(navigator.userAgent)?'Use Share → Add to Home Screen → Add.':'Open this HTTPS page in your phone browser. In its menu choose Install app or Add to home screen. If unavailable, try a browser that supports app installation.';
 };
 async function acquire(){
  if(!keepAwake||document.visibilityState!=='visible'||lock)return;
  try{lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null;if(keepAwake)status.textContent='Screen wake lock released by your phone.'});status.textContent='Screen stays awake while Nelly is visible. Voice needs microphone permission.'}catch{keepAwake=false;awake.setAttribute('aria-pressed','false');awake.textContent='Keep screen awake: off';status.textContent='Your phone could not keep the screen awake.'}
 }
 awake.onclick=async()=>{
  if(!('wakeLock' in navigator)){status.textContent='Keeping the screen awake is unavailable in this browser.';return}
  keepAwake=!keepAwake;awake.setAttribute('aria-pressed',String(keepAwake));awake.textContent='Keep screen awake: '+(keepAwake?'on':'off');
  if(keepAwake)await acquire();else {await lock?.release();lock=null;status.textContent='Normal screen timeout restored.'}
 };
 document.addEventListener('visibilitychange',()=>{if(keepAwake)acquire()});
 const notice=document.createElement('div');notice.className='phoneOffline';notice.setAttribute('role','status');notice.textContent='Offline — AI chat, live weather and online voices need internet.';document.body.append(notice);
 function online(){notice.hidden=navigator.onLine}window.addEventListener('online',online);window.addEventListener('offline',online);online();
 if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/sw.js').catch(()=>{status.textContent='Offline screen could not be enabled. You can still use Nelly online.'});
})();
