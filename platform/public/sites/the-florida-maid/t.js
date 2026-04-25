(function(){
  // ── Bot detection — bail early ──
  if(navigator.webdriver)return;
  var ua=navigator.userAgent||'';
  if(/bot|crawl|spider|slurp|facebookexternalhit|Mediapartners|AdsBot|Lighthouse|Headless|PhantomJS|wget|curl|python|httpx|node-fetch|Go-http|Java\/|Screaming|Ahrefs|SEMrush|Moz\/|DotBot|Bytespider|GPTBot|ClaudeBot|Barkrowler|BLEXBot|DataForSeo|PetalBot|MJ12bot|YandexBot|Applebot/i.test(ua))return;
  // Require JS engine features bots typically lack
  if(!window.requestAnimationFrame||!document.querySelector)return;

  // ── Session + Visitor IDs ──
  // session_id: per-browser session (resets when localStorage clears)
  // visitor_id: persistent across sessions via cookie fallback
  // session_id resets per browser session (tab close = new session)
  var s;try{s=sessionStorage.getItem('flmaid_sid');}catch(e){}
  s=s||Math.random().toString(36).substr(2,9);
  try{sessionStorage.setItem('flmaid_sid',s);}catch(e){}

  // Persistent visitor ID — survives localStorage clears via cookie
  var vid;try{vid=localStorage.getItem('flmaid_vid');}catch(e){}
  if(!vid){
    try{var m=document.cookie.match(/flmaid_vid=([^;]+)/);}catch(e){var m=null;}
    vid=m?m[1]:Math.random().toString(36).substr(2,12);
    try{localStorage.setItem('flmaid_vid',vid);}catch(e){}
  }
  try{document.cookie='flmaid_vid='+vid+';max-age=31536000;path=/;SameSite=Lax';}catch(e){}

  var start=Date.now(),maxScroll=0,engaged=false,sent={},ctaSent={};
  var activeTime=0,lastActive=Date.now(),tabHidden=false;
  var u=new URLSearchParams(location.search);
  var isMobile=/Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  var isTablet=/iPad|Android(?!.*Mobi)/i.test(ua);

  var base={
    domain:location.hostname.replace(/^www\./,''),
    page:location.pathname,
    referrer:document.referrer||'direct',
    device:isTablet?'tablet':isMobile?'mobile':'desktop',
    session_id:s,
    visitor_id:vid,
    screen_w:screen.width,
    screen_h:screen.height,
    utm_source:u.get('utm_source'),
    utm_medium:u.get('utm_medium'),
    utm_campaign:u.get('utm_campaign')
  };
  var endpoint='https://www.thefloridamaid.com/api/track';

  // ── Reliable send: beacon → fetch → pixel fallback ──
  function track(action,extra){
    var data=Object.assign({},base,{action:action},extra||{});
    var json=JSON.stringify(data);
    var ok=false;

    // Try sendBeacon with string body (more reliable than Blob on mobile Safari)
    if(navigator.sendBeacon){
      try{ok=navigator.sendBeacon(endpoint,json);}catch(e){}
    }

    // Fallback: fetch with keepalive
    if(!ok){
      try{
        fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:json,keepalive:true}).catch(function(){});
        ok=true;
      }catch(e){}
    }

    // Last resort: image pixel (GET request — API handles this)
    if(!ok){
      try{
        var img=new Image();
        img.src=endpoint+'?'+new URLSearchParams(data).toString();
      }catch(e){}
    }
  }

  // ── Page load performance ──
  var loadTime=null;
  try{
    var perf=performance.getEntriesByType('navigation')[0];
    if(perf) loadTime=Math.round(perf.loadEventEnd-perf.startTime);
  }catch(e){}
  if(!loadTime&&performance.timing){
    var t=performance.timing;
    if(t.loadEventEnd>0) loadTime=t.loadEventEnd-t.navigationStart;
  }

  // Track initial visit
  track('visit',{
    scroll_depth:0,
    time_on_page:0,
    load_time_ms:loadTime,
    load_speed:loadTime?loadTime<2000?'fast':loadTime<5000?'medium':'slow':null,
    connection:navigator.connection?navigator.connection.effectiveType:null
  });

  // ── Active time tracking (pause when tab hidden) ──
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'){
      activeTime+=Date.now()-lastActive;
      tabHidden=true;
      onLeave();
    }else{
      lastActive=Date.now();
      tabHidden=false;
    }
  });

  // ── Scroll tracking (passive for perf) ──
  window.addEventListener('scroll',function(){
    var h=document.documentElement;
    var total=h.scrollHeight-h.clientHeight;
    if(total<=0)return;
    var pct=Math.round((window.scrollY/total)*100)||0;
    if(pct>maxScroll)maxScroll=pct;
    var thresholds=[25,50,75,100];
    for(var i=0;i<thresholds.length;i++){
      var t=thresholds[i];
      if(pct>=t&&!sent['scroll_'+t]){
        sent['scroll_'+t]=true;
        track('scroll_'+t,{scroll_depth:pct,time_on_page:Math.round((Date.now()-start)/1000)});
      }
    }
  },{passive:true});

  // ── Engagement tracking (30s of active time) ──
  setTimeout(function(){
    if(!engaged){engaged=true;track('engaged_30s',{scroll_depth:maxScroll,time_on_page:30});}
  },30000);

  // ── CTA detection ──
  function detectCTA(el){
    if(!el||!el.closest)return null;
    var a=el.closest('a[href]');
    if(a){
      var h=(a.getAttribute('href')||'').toLowerCase();
      var t=a.getAttribute('data-track')||el.getAttribute('data-track')||'unknown';
      if(h.indexOf('tel:')===0) return {action:'call',placement:t,href:h};
      if(h.indexOf('sms:')===0) return {action:'text',placement:t,href:h};
      if(h.indexOf('/apply/virtual-operations-manager')!==-1) return {action:'ops_apply',placement:t,href:h};
      if(h.indexOf('/book')!==-1&&h.indexOf('/book/collect')===-1) return {action:'book',placement:t,href:h};
      if(h.indexOf('stripe.com')!==-1||h.indexOf('/pay')!==-1) return {action:'pay',placement:t,href:h};
      if(h.indexOf('maps.google')!==-1||h.indexOf('maps.apple')!==-1||h.indexOf('directions')!==-1) return {action:'directions',placement:t,href:h};
    }
    var btn=el.closest('[data-href],[data-action]');
    if(btn){
      var dh=(btn.getAttribute('data-href')||'').toLowerCase();
      var da=btn.getAttribute('data-action')||'';
      var bt=btn.getAttribute('data-track')||'unknown';
      if(dh.indexOf('tel:')===0||da==='call') return {action:'call',placement:bt,href:dh};
      if(dh.indexOf('sms:')===0||da==='text') return {action:'text',placement:bt,href:dh};
      if(da==='book'||(dh.indexOf('/book')!==-1&&dh.indexOf('/book/collect')===-1)) return {action:'book',placement:bt,href:dh};
      if(da==='directions') return {action:'directions',placement:bt,href:dh};
    }
    return null;
  }

  function handleCTA(e){
    var cta=detectCTA(e.target);
    if(!cta)return;
    // Dedupe window: 3 seconds (longer for mobile tap reliability)
    var key=cta.action+'-'+cta.placement+'-'+Math.floor(Date.now()/3000);
    if(ctaSent[key])return;
    ctaSent[key]=true;
    sent.cta=true;
    var time=Math.round((Date.now()-start)/1000);
    var active=Math.round((activeTime+(tabHidden?0:Date.now()-lastActive))/1000);
    track(cta.action,{
      placement:cta.placement,
      scroll_depth:maxScroll,
      time_on_page:time,
      active_time:active,
      scroll_at_cta:maxScroll,
      time_before_cta:time
    });
  }

  // ── Mobile-first CTA listeners ──
  // touchstart fires FIRST on mobile — before browser intercepts tel:/sms:
  // This is the #1 fix for missing mobile call/text tracking
  document.addEventListener('touchstart',handleCTA,{passive:true});
  if(window.PointerEvent){
    document.addEventListener('pointerdown',handleCTA);
  }else{
    document.addEventListener('mousedown',handleCTA);
  }
  document.addEventListener('click',handleCTA);

  // ── Page leave — final data ──
  var leftSent=false;
  function onLeave(){
    if(leftSent)return;
    leftSent=true;
    var time=Math.round((Date.now()-start)/1000);
    var active=Math.round((activeTime+(tabHidden?0:Date.now()-lastActive))/1000);
    var data={
      session_id:s,
      visitor_id:vid,
      domain:base.domain,
      final_scroll:maxScroll,
      final_time:time,
      active_time:active,
      cta_clicked:!!sent.cta,
      _method:'PATCH'
    };
    var json=JSON.stringify(data);
    if(navigator.sendBeacon){
      try{navigator.sendBeacon(endpoint,json);}catch(e){}
    }else{
      try{fetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:json,keepalive:true}).catch(function(){});}catch(e){}
    }
  }
  window.addEventListener('pagehide',onLeave);
  window.addEventListener('beforeunload',onLeave);
})();
