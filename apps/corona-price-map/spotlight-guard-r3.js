function enforceSpotlight(){
  const explore=document.querySelector('#map-section.explore-grid');
  const mapPanel=explore?.querySelector(':scope > .map-panel');
  const panel=document.querySelector('#country-story.country-panel');
  if(!explore||!mapPanel||!panel)return;
  if(panel.parentElement!==explore)explore.insertBefore(panel,mapPanel.nextSibling);
  if(panel.hasAttribute('hidden'))panel.removeAttribute('hidden');
  panel.setAttribute('data-spotlight-pinned','1');
}

function boot(){
  enforceSpotlight();
  requestAnimationFrame(enforceSpotlight);
  setTimeout(enforceSpotlight,250);
  setTimeout(enforceSpotlight,1200);
  const title=document.querySelector('#country-title');
  if(title)new MutationObserver(enforceSpotlight).observe(title,{childList:true,subtree:true,characterData:true});
}

if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
