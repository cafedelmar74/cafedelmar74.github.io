/**
 * LPA — course-page booking submission, Step 13-C.
 * POST + JSON, Cloudflare Turnstile, honeypot, form-render timing, and a REAL
 * success/failure result. No personal data ever travels in a URL.
 *
 * ONE shared implementation for all 37 course pages, replacing 37 independent
 * inline submitBk() transports. Mirrors the Step 11-D enquiry and Step 12-C
 * brochure pattern (lpa-enquiry-v2.js, lpa-brochure-v2.js). Each page keeps only
 * a thin submitBk() wrapper supplying its own course_category, course_duration
 * and (where it has one) its sessions_html presentation blob.
 *
 * Load AFTER course-data.js and config.js, and after the Turnstile script:
 *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
 *   <script src="course-data.js" defer></script>
 *   <script src="config.js" defer></script>
 *   <script src="lpa-booking-v2.js" defer></script>
 *
 * CANONICAL IDENTIFIERS. course_id comes from LPA_CURRENT_COURSE.course_id and
 * course_session_id from the selected option's existing data-session-id. NEITHER
 * is ever derived from the display text the visitor sees. course_session is sent
 * as well, but purely as the human-readable label for the emails and the Sheet.
 */
(function () {
  'use strict';

  /**
   * Stamped when the booking modal is OPENED, not when the script loads — a
   * course page can sit open for hours before a visitor clicks "Book". The
   * server's too-fast and too-old checks must judge elapsed time from when the
   * form actually appeared.
   */
  var formRenderedAt = null;

  window.LPA_bookingModalOpened = function () {
    formRenderedAt = new Date().toISOString();
  };

  function endpoint() {
    if (typeof LPA === 'undefined' || !LPA.booking_webhook) {
      throw new Error('LPA.booking_webhook is not configured');
    }
    return LPA.booking_webhook;
  }

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value.trim() : ''; }

  function turnstileToken(container) {
    var e = container ? container.querySelector('[name="cf-turnstile-response"]') : null;
    return e && e.value ? e.value : '';
  }

  function resetTurnstile(container) {
    try {
      if (window.turnstile && container) {
        var w = container.querySelector('.cf-turnstile');
        if (w) window.turnstile.reset(w);
      }
    } catch (e) { /* a reset failure must never block the user */ }
  }

  /**
   * Resolves the selected session into one of exactly three shapes, using the
   * SAME rules the 37 inline implementations used, unified:
   *
   *   scheduled  — the option carries a data-session-id; it must resolve in
   *                LPA_SESSIONS, belong to THIS course, and still be scheduled.
   *   onRequest  — the course offers on-request classroom dates and the chosen
   *                option carries no session id. Ten course pages do this.
   *   inHouse    — the course offers in-house delivery and the chosen option is
   *                the in-house one. One course page does this.
   *
   * A page whose course has neither flag simply never produces the last two, so
   * this single implementation reproduces every one of the nine per-page variants
   * without any page-specific branching.
   */
  function resolveSelection(course, selectEl) {
    var opt = selectEl && selectEl.selectedOptions ? selectEl.selectedOptions[0] : null;
    var sessionId = opt && opt.dataset ? (opt.dataset.sessionId || '') : '';
    var label = opt ? opt.value : '';

    if (!sessionId) {
      var inHouse = !!(course.offers_in_house && label === 'In-House | My location');
      var onRequest = !!(course.offers_on_request && label && !inHouse);
      if (inHouse) return { kind: 'inHouse', sessionId: '', label: label, session: null };
      if (onRequest) return { kind: 'onRequest', sessionId: '', label: label, session: null };
      return { kind: 'invalid', errorType: 'invalid_session' };
    }

    var session = (typeof LPA_sessionById === 'function') ? LPA_sessionById(sessionId) : null;
    if (!session) return { kind: 'invalid', errorType: 'invalid_session' };
    if (session.course_id !== course.course_id) return { kind: 'invalid', errorType: 'session_course_mismatch' };
    if (session.session_status !== 'scheduled') return { kind: 'invalid', errorType: 'cancelled_session' };
    return { kind: 'scheduled', sessionId: sessionId, label: label, session: session };
  }

  var INVALID_MESSAGE = {
    invalid_session: 'Please select a valid session and try again.',
    session_course_mismatch: 'Something went wrong with your session selection. Please refresh the page and try again.',
    cancelled_session: 'This session is no longer available. Please choose a different date or contact us.'
  };

  /**
   * @param {Object} opts {
   *   courseCategory: the page's existing course_category literal (required),
   *   courseDuration: the page's existing course_duration literal (required),
   *   sessionsHtml:   optional legacy presentation HTML for the team email —
   *                   a string, or a function returning one (seven pages build
   *                   it dynamically). NEVER used for identity or Course/Session
   *                   resolution: the server does not forward it to the resolver.
   *   fieldIds:       optional overrides; all 37 pages share the default ids.
   * }
   */
  window.lpaSubmitBooking = function (opts) {
    var o = opts || {};
    var ids = o.fieldIds || {};
    var overlay = el(ids.overlay || 'bkOverlay');
    var formArea = el(ids.formArea || 'bkFormArea');
    var okArea = el(ids.ok || 'bkOK');
    var btn = el(ids.sb || 'bkSB');
    var selectEl = el(ids.session || 'bkSes');

    var required = [ids.session || 'bkSes', ids.firstName || 'bkFN', ids.lastName || 'bkLN',
                     ids.email || 'bkEM', ids.phone || 'bkPH', ids.company || 'bkCO',
                     ids.jobTitle || 'bkJT', ids.address || 'bkAD', ids.country || 'bkCN'];
    var ok = true;
    required.forEach(function (id) {
      var e = el(id);
      if (!e) return;
      e.classList.remove('er');
      if (!e.value.trim()) { e.classList.add('er'); ok = false; }
    });

    var termsEl = el(ids.terms || 'bkTerms');
    var termsErr = el(ids.termsErr || 'bkTermsErr');
    if (termsErr) termsErr.style.display = (termsEl && termsEl.checked) ? 'none' : 'block';
    if (!termsEl || !termsEl.checked) ok = false;

    var privEl = el(ids.privacy || 'bkPrivacy');
    var privErr = el(ids.privacyErr || 'bkPrivacyErr');
    if (privErr) privErr.style.display = (privEl && privEl.checked) ? 'none' : 'block';
    if (!privEl || !privEl.checked) ok = false;

    if (!ok) {
      var fe = document.querySelector('.bkfi.er') || document.querySelector('.er');
      if (fe) fe.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (typeof LPA_SESSIONS === 'undefined' || !window.LPA_CURRENT_COURSE) {
      showError(overlay, 'Something went wrong loading course session data. Please email info@londonpetroacademy.co.uk to book.');
      if (window.LPA_track) LPA_track('form_error', { form_location: 'course_page',
        error_type: (typeof LPA_SESSIONS === 'undefined') ? 'central_data_load_failure' : 'course_lookup_failure' });
      return;
    }

    var course = window.LPA_CURRENT_COURSE;
    var sel = resolveSelection(course, selectEl);
    if (sel.kind === 'invalid') {
      showError(overlay, INVALID_MESSAGE[sel.errorType] || INVALID_MESSAGE.invalid_session);
      if (window.LPA_track) LPA_track('form_error', { form_location: 'course_page', error_type: sel.errorType });
      return;
    }

    var token = turnstileToken(overlay);
    if (!token) {
      showError(overlay, 'Please complete the verification check and try again.');
      return;
    }

    var origLabel = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    clearError(overlay);

    var firstName = val(ids.firstName || 'bkFN');
    var lastName = val(ids.lastName || 'bkLN');
    var dial = el(ids.dial || 'bkDial');

    var payload = {
      source: 'booking_form',
      // Canonical, never derived from display text.
      course_id: course.course_id,
      course_session_id: sel.sessionId,
      // Human-readable label only.
      course_name: course.course_name,
      course_session: sel.label,
      first_name: firstName,
      last_name: lastName,
      full_name: (firstName + ' ' + lastName).trim(),
      email: val(ids.email || 'bkEM'),
      phone: ((dial ? dial.value : '') + ' ' + val(ids.phone || 'bkPH')).trim(),
      company: val(ids.company || 'bkCO'),
      job_title: val(ids.jobTitle || 'bkJT'),
      billing_address: val(ids.address || 'bkAD'),
      country: val(ids.country || 'bkCN'),
      course_category: o.courseCategory || '',
      course_duration: o.courseDuration || '',
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
      turnstile_token: token,
      // Honeypot. Hidden from humans; bots fill it and are rejected server-side.
      fax: val(ids.fax || 'bkFax'),
      form_rendered_at: formRenderedAt || new Date().toISOString()
    };

    var sessionsHtml = (typeof o.sessionsHtml === 'function') ? o.sessionsHtml() : o.sessionsHtml;
    if (sessionsHtml) {
      // Legacy/untrusted presentation-only context for the team email. Never used
      // for identity, Course or Session resolution server-side.
      payload.sessions_html = sessionsHtml;
    }

    // Local booking history, preserved from the previous transport for the
    // internal dashboard. Best-effort only; never blocks the submission.
    try {
      var stored = localStorage.getItem('lpa_bookings');
      var bookings = [];
      try { bookings = JSON.parse(stored) || []; } catch (e) { bookings = []; }
      var exists = bookings.find(function (b) {
        return b.submitted_at === payload.submitted_at && b.email === payload.email;
      });
      if (!exists) { bookings.unshift(payload); localStorage.setItem('lpa_bookings', JSON.stringify(bookings)); }
    } catch (e) { /* storage unavailable — never block a booking */ }

    fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; })
          .then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.ok === true) {
          if (formArea) formArea.style.display = 'none';
          if (okArea) okArea.style.display = 'block';
          if (window.LPA_track) {
            LPA_track('booking_submitted', Object.assign({
              course_id: course.course_id,
              course_name: course.course_name,
              course_category: course.course_category,
              lead_type: 'public',
              form_location: 'course_page'
            }, (sel.session && typeof LPA_sessionSnapshot === 'function')
                 ? LPA_sessionSnapshot(sel.session) : {}));
          }
        } else {
          if (btn) { btn.textContent = origLabel; btn.disabled = false; }
          resetTurnstile(overlay);
          showError(overlay, (r.data && r.data.message) ||
            'We could not submit your booking request. Please email info@londonpetroacademy.co.uk.');
          if (window.LPA_track) LPA_track('form_error', { form_location: 'course_page' });
        }
      })
      .catch(function () {
        if (btn) { btn.textContent = origLabel; btn.disabled = false; }
        resetTurnstile(overlay);
        showError(overlay, 'We could not reach our servers. Please email info@londonpetroacademy.co.uk.');
        if (window.LPA_track) LPA_track('form_error', { form_location: 'course_page' });
      });
  };

  function errorEl(container) {
    if (!container) return null;
    var e = container.querySelector('.lpa-booking-error');
    if (!e) {
      e = document.createElement('p');
      e.className = 'lpa-booking-error';
      e.setAttribute('role', 'alert');
      e.style.cssText = 'margin:12px 0 0;font-size:13px;color:#c0392b;line-height:1.5;';
      var area = container.querySelector('#bkFormArea') || container;
      area.appendChild(e);
    }
    return e;
  }
  function showError(container, msg) { var e = errorEl(container); if (e) e.textContent = msg; }
  function clearError(container) {
    if (!container) return;
    var e = container.querySelector('.lpa-booking-error');
    if (e) e.textContent = '';
  }
})();
