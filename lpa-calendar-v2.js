/**
 * LPA — calendar download form (POST + JSON + Cloudflare Turnstile).
 *
 * One shared script for the calendar, home, upstream and course pages.
 * Personal details travel in the request body, never in a web address, and the
 * n8n workflow (POST /webhook/lpa-calendar-v2) only saves a request that passes
 * Cloudflare's check.
 *
 * Pages call LPA_calendarSend({...}) and still unlock the calendar straight away,
 * as before. Pages that move on to another page wait for the returned promise
 * (it resolves after at least minDelay ms, and never later than ~15 s).
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://n8n.srv765009.hstgr.cloud/webhook/lpa-calendar-v2';
  var SITE_KEY = '0x4AAAAAAEsAvcbgyopndx7W'; // public by design; the secret lives only in n8n
  var ACTION = 'calendar_download';
  // The name/email/organisation/phone inputs of every calendar form on the site.
  var FIELD_RE = /^(gate|cal|virtualCal)(FirstName|LastName|Email|Org|Phone)$/;

  var renderedAt = new Date().toISOString();
  var token = '';
  var widgetId = null;
  var box = null;
  var waiting = [];

  function track(name, params) {
    try { if (window.LPA_track) window.LPA_track(name, params || {}); } catch (e) { /* analytics must never block */ }
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function gotToken(t) {
    token = t || '';
    if (!token) return;
    var w = waiting; waiting = [];
    w.forEach(function (f) { f(token); });
  }

  function loadTurnstile(cb) {
    if (window.turnstile && window.turnstile.render) return cb();
    if (!document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    var tries = 0;
    (function poll() {
      if (window.turnstile && window.turnstile.render) return cb();
      if (++tries < 150) setTimeout(poll, 100);
    })();
  }

  // Starts Cloudflare's check as soon as the visitor begins filling in a calendar form.
  // It is invisible unless Cloudflare needs the visitor to tick a box.
  function prepare() {
    if (box) return;
    box = document.createElement('div');
    box.id = 'lpaCalendarCheck';
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:100001;';
    document.body.appendChild(box);
    loadTurnstile(function () {
      try {
        widgetId = window.turnstile.render(box, {
          sitekey: SITE_KEY,
          action: ACTION,
          appearance: 'interaction-only',
          'refresh-expired': 'auto',
          callback: gotToken,
          'expired-callback': function () { token = ''; },
          'error-callback': function () { token = ''; }
        });
      } catch (e) { /* a failed check must never block the visitor */ }
    });
  }

  function waitForToken(ms) {
    if (token) return Promise.resolve(token);
    return Promise.race([
      new Promise(function (r) { waiting.push(r); }),
      delay(ms).then(function () { return ''; })
    ]);
  }

  // Each token works once, so get a fresh one for any later submission on the same page.
  function reset() {
    token = '';
    try { if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId); } catch (e) { /* ignore */ }
  }

  document.addEventListener('focusin', function (e) {
    if (e.target && FIELD_RE.test(e.target.id || '')) prepare();
  });

  /**
   * @param {Object} d {
   *   first_name, last_name, email, phone, organisation: form values,
   *   calendar: '2026' | '2027' (optional, defaults to 2026 server-side),
   *   variant: 'virtual' for the home page virtual calendar form (optional),
   *   minDelay: ms to wait at least before resolving (optional)
   * }
   * @returns {Promise<{ok: boolean, reason: *}>}
   */
  window.LPA_calendarSend = function (d) {
    d = d || {};
    prepare();
    var payload = {
      source: 'calendar_download',
      first_name: d.first_name || '',
      last_name: d.last_name || '',
      email: d.email || '',
      phone: d.phone || '',
      organisation: d.organisation || '',
      calendar: d.calendar || '',
      variant: d.variant || '',
      page_url: window.location.href.slice(0, 480),
      fax: '', // honeypot field expected by the server
      form_rendered_at: renderedAt,
      submitted_at: new Date().toISOString()
    };
    var sent = waitForToken(10000).then(function (tok) {
      if (!tok) return { ok: false, reason: 'no_token' };
      payload.turnstile_token = tok;
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (j) {
            return { ok: res.ok && j.ok === true, reason: j.status || res.status };
          });
        })
        .catch(function () { return { ok: false, reason: 'network' }; });
    }).then(function (r) {
      reset();
      if (!r.ok) track('form_error', { form_location: 'calendar_download' });
      return r;
    });
    return Promise.race([
      Promise.all([sent, delay(d.minDelay || 0)]).then(function (a) { return a[0]; }),
      delay(15000).then(function () { return { ok: false, reason: 'timeout' }; })
    ]);
  };
})();
