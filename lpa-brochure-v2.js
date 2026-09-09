/**
 * LPA — course-page brochure download submission, Step 12-C.
 * POST + JSON, Cloudflare Turnstile, honeypot, form-render timing, and a REAL
 * success/failure result. No personal data ever travels in a URL.
 *
 * One shared implementation for all 37 course pages, mirroring the Step 11-D
 * enquiry pattern (lpa-enquiry-v2.js). Each page keeps only a thin
 * submitBrochure() wrapper supplying its own course title and pdf_url.
 *
 * Load AFTER config.js and after the Turnstile script:
 *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
 *   <script src="config.js" defer></script>
 *   <script src="lpa-brochure-v2.js" defer></script>
 *
 * NOT YET WIRED LIVE: this file is additive only. Course pages continue to
 * call the old GET /webhook/lpa-brochure endpoint until each page's
 * submitBrochure() is explicitly migrated to call lpaSubmitBrochure().
 */
(function () {
  'use strict';

  // Stamped when the brochure modal is first OPENED, not merely when the
  // script loads — a page can sit open for hours before a visitor clicks
  // "Download Brochure", and the server's too-fast/too-old checks must judge
  // elapsed time from when the form actually appeared, not from page load.
  var formRenderedAt = null;

  window.LPA_brochureModalOpened = function () {
    formRenderedAt = new Date().toISOString();
  };

  function endpoint() {
    if (typeof LPA === 'undefined' || !LPA.brochure_webhook) {
      throw new Error('LPA.brochure_webhook is not configured');
    }
    return LPA.brochure_webhook;
  }

  function turnstileToken(container) {
    var el = container.querySelector('[name="cf-turnstile-response"]');
    return el && el.value ? el.value : '';
  }

  function resetTurnstile(container) {
    try {
      if (window.turnstile) {
        var w = container.querySelector('.cf-turnstile');
        if (w) window.turnstile.reset(w);
      }
    } catch (e) { /* a reset failure must never block the user */ }
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /**
   * @param {Object} opts {
   *   course: display title (required, preserves the existing per-page copy),
   *   pdfUrl: the existing page-specific brochure PDF URL (required, unchanged),
   *   courseId: LPA_CURRENT_COURSE.course_id when available, else null,
   *   fieldIds: { overlay, formArea, ok, name, email, dial, phone, org, sb, fax },
   *   sessionsHtml: optional legacy/untrusted presentation HTML for the
   *     customer email (never used for identity or Course/Session resolution)
   * }
   */
  window.lpaSubmitBrochure = function (opts) {
    var o = opts || {};
    var ids = o.fieldIds || {};
    var overlayEl = document.getElementById(ids.overlay || 'brOverlay');
    var nameEl = document.getElementById(ids.name || 'brName');
    var emailEl = document.getElementById(ids.email || 'brEmail');
    var phoneEl = document.getElementById(ids.phone || 'brPhone');
    var dialEl = document.getElementById(ids.dial || 'brDial');
    var btn = document.getElementById(ids.sb || 'brSB');
    var formArea = document.getElementById(ids.formArea || 'brFormArea');
    var okArea = document.getElementById(ids.ok || 'brOK');

    var ok = true;
    [nameEl, emailEl, phoneEl].forEach(function (el) {
      if (!el) return;
      el.classList.remove('er');
      if (!el.value.trim()) { el.classList.add('er'); ok = false; }
    });
    if (!ok) return;

    var token = overlayEl ? turnstileToken(overlayEl) : '';
    if (!token) {
      showError(overlayEl, 'Please complete the verification check and try again.');
      return;
    }

    var origLabel = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }
    clearError(overlayEl);

    var payload = {
      source: 'brochure_download',
      full_name: nameEl ? nameEl.value.trim() : '',
      email: emailEl ? emailEl.value.trim() : '',
      phone: (dialEl ? dialEl.value : '') + ' ' + (phoneEl ? phoneEl.value.trim() : ''),
      organisation: val(ids.org || 'brOrg'),
      course_id: o.courseId || '',
      course: o.course || '',
      pdf_url: o.pdfUrl || '',
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
      turnstile_token: token,
      // Honeypot. Hidden from humans; bots fill it and are rejected server-side.
      fax: val(ids.fax || 'brFax'),
      form_rendered_at: formRenderedAt || new Date().toISOString()
    };
    if (o.sessionsHtml) {
      // Legacy/untrusted presentation-only context for the customer email.
      // Never used for identity, Course, or Session resolution server-side.
      payload.sessions_html = o.sessionsHtml;
    }

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
            LPA_track('brochure_download', Object.assign(
              { lead_type: 'public', form_location: 'course_page' },
              window.LPA_CURRENT_COURSE
                ? { course_id: window.LPA_CURRENT_COURSE.course_id, course_name: window.LPA_CURRENT_COURSE.course_name, course_category: window.LPA_CURRENT_COURSE.course_category }
                : { course_name: o.course }
            ));
          }
        } else {
          if (btn) { btn.textContent = origLabel; btn.disabled = false; }
          resetTurnstile(overlayEl);
          showError(overlayEl, (r.data && r.data.message) ||
            'We could not send your brochure. Please email info@londonpetroacademy.co.uk.');
          if (window.LPA_track) LPA_track('form_error', { form_location: 'course_page' });
        }
      })
      .catch(function () {
        if (btn) { btn.textContent = origLabel; btn.disabled = false; }
        resetTurnstile(overlayEl);
        showError(overlayEl, 'We could not reach our servers. Please email info@londonpetroacademy.co.uk.');
        if (window.LPA_track) LPA_track('form_error', { form_location: 'course_page' });
      });
  };

  function errorEl(container) {
    if (!container) return null;
    var el = container.querySelector('.lpa-brochure-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'lpa-brochure-error';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'margin:12px 0 0;font-size:13px;color:#c0392b;line-height:1.5;';
      var formArea = container.querySelector('[id$="FormArea"]') || container;
      formArea.appendChild(el);
    }
    return el;
  }
  function showError(container, msg) { var el = errorEl(container); if (el) el.textContent = msg; }
  function clearError(container) { if (!container) return; var el = container.querySelector('.lpa-brochure-error'); if (el) el.textContent = ''; }
})();
