// Full Loop CRM — Website Tracking Script
// Embed: <script src="https://app.fullloopcrm.com/t.js" data-tenant="TENANT_ID"></script>
;(function () {
  'use strict'

  var ENDPOINT = (document.currentScript && document.currentScript.src)
    ? new URL(document.currentScript.src).origin + '/api/leads/visits'
    : 'https://app.fullloopcrm.com/api/leads/visits'

  var tenantId = document.currentScript && document.currentScript.getAttribute('data-tenant')
  if (!tenantId) return

  // Session & visitor IDs (persist across page loads)
  var sessionId = sessionStorage.getItem('fl_sid')
  if (!sessionId) {
    sessionId = 'sid_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36)
    sessionStorage.setItem('fl_sid', sessionId)
  }

  var visitorId = localStorage.getItem('fl_vid')
  if (!visitorId) {
    visitorId = 'vid_' + Math.random().toString(36).substr(2, 12) + Date.now().toString(36)
    localStorage.setItem('fl_vid', visitorId)
  }

  // Device detection
  var ua = navigator.userAgent || ''
  var isMobile = /Mobi|Android|iPhone|iPod/i.test(ua)
  var isTablet = /iPad|Tablet|PlayBook/i.test(ua) || (isMobile && Math.min(screen.width, screen.height) > 600)
  var device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  // Referrer normalization
  var referrer = document.referrer || ''
  try {
    if (referrer) {
      var refHost = new URL(referrer).hostname.replace(/^www\./, '')
      // Don't count self-referrals
      if (refHost === location.hostname.replace(/^www\./, '')) referrer = ''
      else referrer = refHost
    }
  } catch (e) { referrer = '' }

  // UTM params
  var params = new URLSearchParams(location.search)
  var utm = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
  }

  // State tracking
  var maxScroll = 0
  var startTime = Date.now()
  var activeTime = 0
  var activeStart = Date.now()
  var isActive = true
  var ctaClicked = false
  var visitId = null

  // Scroll tracking
  function getScrollPct() {
    var h = document.documentElement
    var scrollTop = window.pageYOffset || h.scrollTop || 0
    var scrollHeight = h.scrollHeight - h.clientHeight
    return scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
  }

  window.addEventListener('scroll', function () {
    var pct = getScrollPct()
    if (pct > maxScroll) maxScroll = pct
  }, { passive: true })

  // Active time tracking (pause when tab hidden)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (isActive) {
        activeTime += (Date.now() - activeStart) / 1000
        isActive = false
      }
    } else {
      activeStart = Date.now()
      isActive = true
    }
  })

  // CTA detection — watch for tel:, sms:, booking links
  function detectCTA(el) {
    if (!el || !el.closest) return null
    var link = el.closest('a[href]')
    if (!link) return null
    var href = link.href || ''
    if (href.startsWith('tel:')) return 'call'
    if (href.startsWith('sms:')) return 'text'
    if (/\/book|\/portal\/book|\/schedule|\/appointment/i.test(href)) return 'book'
    if (/\/pay|\/checkout|stripe\.com/i.test(href)) return 'pay'
    if (/maps\.google|maps\.apple|directions/i.test(href)) return 'directions'
    return null
  }

  // Track CTA clicks
  document.addEventListener('click', function (e) {
    var cta = detectCTA(e.target)
    if (!cta) return
    ctaClicked = true
    var placement = ''
    var tracked = e.target.closest('[data-track]')
    if (tracked) placement = tracked.getAttribute('data-track')
    send({
      action: 'cta',
      cta_type: cta,
      placement: placement,
      scroll_depth: getScrollPct(),
      time_on_page: Math.round((Date.now() - startTime) / 1000),
    })
  }, true)

  // Also listen on touchstart for mobile (fires before browser navigation on tel:/sms:)
  if (isMobile) {
    document.addEventListener('touchstart', function (e) {
      var cta = detectCTA(e.target)
      if (!cta) return
      ctaClicked = true
      send({
        action: 'cta',
        cta_type: cta,
        scroll_depth: getScrollPct(),
        time_on_page: Math.round((Date.now() - startTime) / 1000),
      })
    }, { passive: true })
  }

  // Send tracking data
  function send(extra) {
    var payload = {
      tenant_id: tenantId,
      session_id: sessionId,
      visitor_id: visitorId,
      referrer: referrer || null,
      device: device,
      page_url: location.pathname,
      screen_w: screen.width,
      screen_h: screen.height,
      utm_source: utm.source || null,
      utm_medium: utm.medium || null,
      utm_campaign: utm.campaign || null,
    }
    if (extra) {
      for (var k in extra) payload[k] = extra[k]
    }
    // Use sendBeacon if available (reliable on page leave)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, JSON.stringify(payload))
    } else {
      // Fallback to fetch with keepalive
      try {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        })
      } catch (e) {
        // Last resort: image pixel
        new Image().src = ENDPOINT + '?d=' + encodeURIComponent(JSON.stringify(payload))
      }
    }
  }

  // Initial page load tracking
  function trackPageLoad() {
    var loadTime = 0
    if (window.performance && performance.timing) {
      loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart
      if (loadTime < 0) loadTime = 0
    }
    send({
      action: 'visit',
      load_time_ms: loadTime || null,
      scroll_depth: 0,
      time_on_page: 0,
    })
  }

  // Engagement ping after 30 seconds
  setTimeout(function () {
    var totalActive = activeTime + (isActive ? (Date.now() - activeStart) / 1000 : 0)
    send({
      action: 'engaged',
      scroll_depth: maxScroll,
      time_on_page: Math.round((Date.now() - startTime) / 1000),
      active_time: Math.round(totalActive),
    })
  }, 30000)

  // Page leave — send final metrics
  function trackLeave() {
    var totalActive = activeTime + (isActive ? (Date.now() - activeStart) / 1000 : 0)
    send({
      action: 'leave',
      scroll_depth: maxScroll,
      time_on_page: Math.round((Date.now() - startTime) / 1000),
      active_time: Math.round(totalActive),
      cta_clicked: ctaClicked,
    })
  }

  // pagehide is more reliable than beforeunload on mobile
  if ('onpagehide' in window) {
    window.addEventListener('pagehide', trackLeave)
  } else {
    window.addEventListener('beforeunload', trackLeave)
  }

  // Fire page load after DOM ready
  if (document.readyState === 'complete') {
    trackPageLoad()
  } else {
    window.addEventListener('load', trackPageLoad)
  }
})()
