const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktopMq=matchMedia('(min-width: 721px)');
const panel=document.querySelector('#country-story');
let timingToken=0;
let fallbackTimer=0;

if(panel){
  const style=document.createElement('style');
  style.dataset.spotlightTiming='r5';
  style.textContent=`
@keyframes spotlightPayloadRevealR5{
  0%{clip-path:inset(0 100% 0 0);transform:translate3d(14px,0,0);filter:brightness(.76)}
  72%{clip-path:inset(0 0 0 0);transform:translate3d(-2px,0,0);filter:brightness(1.09)}
  100%{clip-path:inset(0 0 0 0);transform:none;filter:brightness(1)}
}
@media (min-width:721px) and (prefers-reduced-motion:no-preference){
  #country-story.spotlight-timing-pending #country-title,
  #country-story.spotlight-timing-pending #country-rank,
  #country-story.spotlight-timing-pending #country-detail{
    clip-path:inset(0 100% 0 0)!important;
    transform:translate3d(14px,0,0)!important;
    filter:brightness(.76)!important;
    animation:none!important;
    transition:none!important;
  }
  #country-story.spotlight-timing-arrived #country-title,
  #country-story.spotlight-timing-arrived #country-rank,
  #country-story.spotlight-timing-arrived #country-detail{
    animation:spotlightPayloadRevealR5 .34s cubic-bezier(.2,.8,.2,1) both!important;
  }
}
@media (prefers-reduced-motion:reduce){
  #country-story.spotlight-timing-pending #country-title,
  #country-story.spotlight-timing-pending #country-rank,
  #country-story.spotlight-timing-pending #country-detail,
  #country-story.spotlight-timing-arrived #country-title,
  #country-story.spotlight-timing-arrived #country-rank,
  #country-story.spotlight-timing-arrived #country-detail{
    clip-path:none!important;
    transform:none!important;
    filter:none!important;
    animation:none!important;
  }
}
`;
  document.head.append(style);

  function clearFallback(){if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=0}}
  function finishTiming(token,source='connector'){
    if(token!==timingToken)return;
    clearFallback();
    panel.classList.remove('spotlight-timing-pending');
    panel.classList.add('spotlight-timing-arrived');
    panel.dataset.spotlightPhase='reveal';
    panel.dataset.spotlightArrival=source;
    panel.dataset.spotlightArrivedAt=String(performance.now());
    setTimeout(()=>{
      if(token!==timingToken)return;
      panel.classList.remove('spotlight-timing-arrived');
      panel.dataset.spotlightPhase='ready';
    },380);
  }
  function beginTiming(){
    if(reduceMotion||!desktopMq.matches)return;
    const token=++timingToken;
    clearFallback();
    panel.classList.remove('connector-reveal','spotlight-timing-arrived');
    panel.classList.add('spotlight-timing-pending');
    panel.dataset.spotlightPhase='travel';
    panel.dataset.spotlightArrival='';
    panel.dataset.spotlightStartedAt=String(performance.now());
    panel.dataset.spotlightArrivedAt='';
    fallbackTimer=setTimeout(()=>finishTiming(token,'fallback'),900);
  }
  function isSelectionClick(event){
    if(!desktopMq.matches||reduceMotion)return false;
    if(event.target.closest?.('#ranking a'))return false;
    if(event.target.closest?.('#map path.country.has-data'))return true;
    return Boolean(event.target.closest?.('#ranking tr'));
  }

  document.addEventListener('click',event=>{if(isSelectionClick(event))beginTiming()},true);

  const classObserver=new MutationObserver(()=>{
    if(!panel.classList.contains('spotlight-timing-pending'))return;
    if(panel.classList.contains('connector-reveal'))finishTiming(timingToken,'connector');
  });
  classObserver.observe(panel,{attributes:true,attributeFilter:['class']});

  addEventListener('resize',()=>{
    if(desktopMq.matches)return;
    clearFallback();
    timingToken++;
    panel.classList.remove('spotlight-timing-pending','spotlight-timing-arrived');
    panel.dataset.spotlightPhase='ready';
  },{passive:true});
}
