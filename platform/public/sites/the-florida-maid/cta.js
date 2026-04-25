(function(){
  var phone='9547103636';
  var phoneFormatted='(954) 710-3636';

  // ── Brand colors ──
  var navy='#1E2A4A';
  var mint='#A8F0DC';
  var white='#fff';

  // ── Detect mobile ──
  var ua=navigator.userAgent||'';
  var isMobile=/Mobi|Android|iPhone|iPad|iPod/i.test(ua);

  // ── Helper: create element with styles ──
  function el(tag,styles,attrs){
    var e=document.createElement(tag);
    if(styles) Object.assign(e.style,styles);
    if(attrs) for(var k in attrs) e.setAttribute(k,attrs[k]);
    return e;
  }

  // ── 1. Hero CTA buttons — injected after the first h1 or h2 ──
  function injectHeroCTA(){
    var heading=document.querySelector('h1')||document.querySelector('h2');
    if(!heading) return;

    // Don't inject if there's already a tel: or sms: link near the heading
    var parent=heading.parentElement;
    if(parent&&parent.querySelector('a[href^="tel:"],a[href^="sms:"]')) return;

    var wrap=el('div',{
      display:'flex',
      gap:'12px',
      justifyContent:'center',
      flexWrap:'wrap',
      margin:'24px 0 16px'
    });

    var callBtn=el('a',{
      display:'inline-flex',
      alignItems:'center',
      gap:'8px',
      background:navy,
      color:white,
      padding:isMobile?'16px 28px':'14px 28px',
      borderRadius:'8px',
      fontWeight:'700',
      fontSize:isMobile?'17px':'16px',
      textDecoration:'none',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      transition:'opacity .2s',
      cursor:'pointer'
    },{href:'tel:'+phone,'data-track':'hero'});
    callBtn.textContent='\u{1F4DE} Call Now';
    callBtn.onmouseover=function(){this.style.opacity='0.9';};
    callBtn.onmouseout=function(){this.style.opacity='1';};

    var textBtn=el('a',{
      display:'inline-flex',
      alignItems:'center',
      gap:'8px',
      background:mint,
      color:navy,
      padding:isMobile?'16px 28px':'14px 28px',
      borderRadius:'8px',
      fontWeight:'700',
      fontSize:isMobile?'17px':'16px',
      textDecoration:'none',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif',
      transition:'opacity .2s',
      cursor:'pointer'
    },{href:'sms:'+phone,'data-track':'hero'});
    textBtn.textContent='\u{1F4AC} Text Us';
    textBtn.onmouseover=function(){this.style.opacity='0.9';};
    textBtn.onmouseout=function(){this.style.opacity='1';};

    wrap.appendChild(callBtn);
    wrap.appendChild(textBtn);

    // Insert after heading (or after subtitle paragraph if one follows)
    var next=heading.nextElementSibling;
    if(next&&(next.tagName==='P'||next.tagName==='SPAN')&&next.textContent.length<200){
      next.parentNode.insertBefore(wrap,next.nextSibling);
    }else{
      heading.parentNode.insertBefore(wrap,heading.nextSibling);
    }
  }

  // ── 2. Sticky bottom bar (mobile only) ──
  function injectStickyBar(){
    if(!isMobile) return;

    var bar=el('div',{
      position:'fixed',
      bottom:'0',
      left:'0',
      right:'0',
      display:'flex',
      zIndex:'9999',
      boxShadow:'0 -2px 12px rgba(0,0,0,.2)',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'
    });

    var callLink=el('a',{
      flex:'1',
      textAlign:'center',
      background:navy,
      color:white,
      padding:'16px 0',
      fontWeight:'700',
      fontSize:'15px',
      textDecoration:'none',
      letterSpacing:'0.5px'
    },{href:'tel:'+phone,'data-track':'sticky'});
    callLink.textContent='\u{1F4DE} Call '+phoneFormatted;

    var textLink=el('a',{
      flex:'1',
      textAlign:'center',
      background:mint,
      color:navy,
      padding:'16px 0',
      fontWeight:'700',
      fontSize:'15px',
      textDecoration:'none',
      letterSpacing:'0.5px'
    },{href:'sms:'+phone,'data-track':'sticky'});
    textLink.textContent='\u{1F4AC} Text Us';

    bar.appendChild(callLink);
    bar.appendChild(textLink);
    document.body.appendChild(bar);

    // Add bottom padding so sticky bar doesn't cover content
    document.body.style.paddingBottom='60px';
  }

  // ── 3. Footer CTA — append before the last element or footer ──
  function injectFooterCTA(){
    var footer=document.querySelector('footer');
    var target=footer||document.body;

    // Don't inject if footer already has call/text links
    if(target.querySelector('a[href^="tel:"],a[href^="sms:"]')) return;

    var wrap=el('div',{
      textAlign:'center',
      padding:'32px 20px',
      background:'#f8f9fa',
      borderTop:'1px solid #e9ecef'
    });

    var title=el('p',{
      fontSize:'20px',
      fontWeight:'700',
      color:navy,
      margin:'0 0 8px',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'
    });
    title.textContent='Ready to get started?';

    var sub=el('p',{
      fontSize:'14px',
      color:'#6b7280',
      margin:'0 0 20px',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'
    });
    sub.textContent='Call or text us — we respond in minutes.';

    var btns=el('div',{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'});

    var callBtn=el('a',{
      display:'inline-flex',alignItems:'center',gap:'8px',
      background:navy,color:white,
      padding:'14px 32px',borderRadius:'8px',
      fontWeight:'700',fontSize:'16px',textDecoration:'none',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'
    },{href:'tel:'+phone,'data-track':'footer'});
    callBtn.textContent='\u{1F4DE} Call '+phoneFormatted;

    var textBtn=el('a',{
      display:'inline-flex',alignItems:'center',gap:'8px',
      background:mint,color:navy,
      padding:'14px 32px',borderRadius:'8px',
      fontWeight:'700',fontSize:'16px',textDecoration:'none',
      fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'
    },{href:'sms:'+phone,'data-track':'footer'});
    textBtn.textContent='\u{1F4AC} Text Us';

    btns.appendChild(callBtn);
    btns.appendChild(textBtn);
    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(btns);

    if(footer){
      footer.parentNode.insertBefore(wrap,footer);
    }else{
      document.body.appendChild(wrap);
    }
  }

  // ── Run after DOM ready ──
  function init(){
    injectHeroCTA();
    injectStickyBar();
    injectFooterCTA();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
