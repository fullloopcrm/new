// Full Loop CRM — Client Error Monitor
// Embed: <script src="https://<your-domain>/err.js" data-tenant-id="ID" data-tenant-sig="SIG"></script>
// Reports uncaught JS errors and unhandled promise rejections to /api/errors,
// which files them into error_logs and Telegram-alerts the platform owner
// (after filtering known-transient noise — see IGNORABLE_PATTERNS server-side).
;(function () {
  'use strict'

  var ENDPOINT = (document.currentScript && document.currentScript.src)
    ? new URL(document.currentScript.src).origin + '/api/errors'
    : null
  if (!ENDPOINT) return

  var tenantId = document.currentScript && document.currentScript.getAttribute('data-tenant-id')
  var tenantSig = document.currentScript && document.currentScript.getAttribute('data-tenant-sig')

  // Cap reports per page load — a broken third-party script or a render loop
  // can throw hundreds of times a second; report the first few and stop, so
  // one bad session doesn't drown out everything else in error_logs/Telegram.
  var MAX_REPORTS = 5
  var sent = 0

  function report(payload) {
    if (sent >= MAX_REPORTS) return
    sent++
    try {
      var headers = { 'Content-Type': 'application/json' }
      if (tenantId && tenantSig) {
        headers['x-tenant-id'] = tenantId
        headers['x-tenant-sig'] = tenantSig
      }
      fetch(ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {})
    } catch (e) {}
  }

  window.addEventListener('error', function (event) {
    // Ignore cross-origin script errors (event.error is null, message is the
    // opaque "Script error." string) -- nothing actionable in them.
    if (!event.error && event.message === 'Script error.') return
    report({
      message: event.message || (event.error && event.error.message) || 'Unknown error',
      stack: event.error && event.error.stack,
      url: location.href,
      source: 'client/js-error',
    })
  })

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason
    var message = reason instanceof Error ? reason.message : String(reason)
    report({
      message: message,
      stack: reason instanceof Error ? reason.stack : undefined,
      url: location.href,
      source: 'client/unhandled-rejection',
    })
  })
})()
