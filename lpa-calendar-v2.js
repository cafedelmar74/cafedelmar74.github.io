/**
 * LPA — calendar download form (POST + JSON + Cloudflare Turnstile).
 *
 * One shared script for the calendar, home, upstream and course pages.
 * Personal details travel in the request body, never in a web address, and the
 * n8n workflow (POST /webhook/lpa-calendar-v2) only saves a request that passes
 * Cloudflare's check.
 *
 * Each page's submit function does:
 *   if (!LPA_calendarReady(btn)) return;   // waits for the check, then re-clicks btn
 *   var sent = LPA_calendarSend({...});    // posts the details
 * and then unlocks the calendar as before. Pages that move on to another page
 * wait for `sent` (it resolves after at least minDelay ms, never later than ~15 s).
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://n8n.srv765009.hstgr.cloud/webhook/lpa-calendar-v2';
  var SITE_KEY = '0x4AAAAAAEsAvcbgyopndx7W'; // public by design; the secret lives only in n8n
  var ACTION = 'calendar_download';
  // Input id prefix -> that form's submit button id.
  var FORMS = { gate: 'gateSubmit', cal: 'calDlSubmit', virtualCal: 'virtualCalDlSubmit' };
  var FIELD_RE = /^(gate|cal|virtualCal)(FirstName|LastName|Email|Org|Phone)$/;
  var GIVE_UP_MS = 12000; // if the check can't finish, let the visitor through (nothing is saved)

  var renderedAt = new Date().toISOString();
  var states = {};   // one Cloudflare check per form, keyed by submit button id
  var current = null;

  function track(name, params) {
    try { if (window.LPA_track) window.LPA_track(name, params || {}); } catch (e) { /* analytics must never block */ }
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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

  function setHint(st, text) {
    if (!st.hint) {
      st.hint = document.createElement('p');
      st.hint.setAttribute('role', 'status');
      st.hint.style.cssText = 'margin:8px 0 0;font-size:12px;line-height:1.5;color:#8a5a1f;text-align:center;';
      st.btn.parentNode.insertBefore(st.hint, st.btn.nextSibling);
    }
    st.hint.textContent = text || '';
    st.hint.style.display = text ? 'block' : 'none';
  }

  // Starts Cloudflare's check inside the form, just above its button. It takes no
  // space and shows nothing unless Cloudflare needs the visitor to tick a box.
  function prepare(btnId) {
    if (states[btnId]) return states[btnId];
    var btn = document.getElementById(btnId);
    if (!btn) return null;
    var st = { btn: btn, token: '', widgetId: null, pending: false, bypass: false, failed: false, hint: null, timer: null };
    states[btnId] = st;
    st.box = document.createElement('div');
    st.box.className = 'lpa-calendar-check';
    st.box.style.cssText = 'margin:0 0 10px;display:flex;justify-content:center;';
    btn.parentNode.insertBefore(st.box, btn);
    loadTurnstile(function () {
      try {
        st.widgetId = window.turnstile.render(st.box, {
          sitekey: SITE_KEY,
          action: ACTION,
          appearance: 'interaction-only',
          'refresh-expired': 'auto',
          callback: function (t) { st.token = t || ''; st.failed = false; st.interactive = false; if (st.pending) resume(st); },
          'expired-callback': function () { st.token = ''; },
          'error-callback': function () { st.token = ''; st.failed = true; if (st.pending) resume(st, true); },
          // The visitor is being asked to tick the box: stop the give-up timer and wait for them.
          'before-interactive-callback': function () { st.interactive = true; clearTimeout(st.timer); if (st.pending) setHint(st, 'Please tick "Verify you are human" above to continue.'); },
          'after-interactive-callback': function () { setHint(st, ''); }
        });
      } catch (e) { st.failed = true; if (st.pending) resume(st, true); }
    });
    return st;
  }

  // Re-runs the page's own submit once the check is done (or has given up).
  function resume(st, giveUp) {
    if (!st.pending) return;
    st.pending = false;
    clearTimeout(st.timer);
    if (giveUp) { st.bypass = true; track('form_error', { form_location: 'calendar_download', reason: 'check_unavailable' }); }
    setHint(st, '');
    st.btn.disabled = false;
    if (st.label != null) st.btn.textContent = st.label;
    st.btn.click();
  }

  document.addEventListener('focusin', function (e) {
    var m = e.target && FIELD_RE.exec(e.target.id || '');
    if (m) prepare(FORMS[m[1]]);
  });

  /**
   * Call after the page's own field validation. Returns true when the details can be
   * sent now. Otherwise it shows "Checking…" on the button and clicks it again by
   * itself as soon as Cloudflare's check is done, so the page function simply returns.
   */
  window.LPA_calendarReady = function (btn) {
    var st = prepare(btn && btn.id);
    current = st;
    if (!st) return true;
    if (st.token || st.bypass || st.failed) return true;
    if (st.pending) return false;
    st.pending = true;
    st.label = st.btn.textContent;
    st.btn.disabled = true;
    st.btn.textContent = 'Checking…';
    if (st.interactive) setHint(st, 'Please tick "Verify you are human" above to continue.');
    else st.timer = setTimeout(function () { resume(st, true); }, GIVE_UP_MS);
    return false;
  };

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
    var st = current;
    var tok = st ? st.token : '';
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
      submitted_at: new Date().toISOString(),
      turnstile_token: tok
    };
    var sent;
    if (!tok) {
      // The check never completed: the visitor still gets the calendar, but nothing is sent.
      sent = Promise.resolve({ ok: false, reason: 'no_token' });
    } else {
      sent = fetch(ENDPOINT, {
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
    }
    if (st) {
      // Each token works once; get a fresh one for any later submission on this page.
      st.token = '';
      st.bypass = false;
      try { if (window.turnstile && st.widgetId !== null) window.turnstile.reset(st.widgetId); } catch (e) { /* ignore */ }
    }
    sent = sent.then(function (r) {
      if (!r.ok) track('form_error', { form_location: 'calendar_download', reason: String(r.reason) });
      return r;
    });
    return Promise.race([
      Promise.all([sent, delay(d.minDelay || 0)]).then(function (a) { return a[0]; }),
      delay(15000).then(function () { return { ok: false, reason: 'timeout' }; })
    ]);
  };
})();
