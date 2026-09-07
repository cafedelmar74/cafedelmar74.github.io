/**
 * LPA — website enquiry submission, Step 11-D.
 * POST + JSON, Cloudflare Turnstile, honeypot, form-render timing, and a REAL
 * success/failure result. No personal data ever travels in a URL.
 *
 * Load AFTER config.js and after the Turnstile script:
 *   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
 *   <script src="config.js"></script>
 *   <script src="lpa-enquiry-v2.js"></script>
 */
(function () {
  'use strict';

  // Stamped when the form is first rendered. The server rejects impossibly fast
  // submissions; this is supplementary anti-abuse, never the only control.
  var FORM_RENDERED_AT = new Date().toISOString();

  function endpoint() {
    // Single authoritative configuration value. No URL is hardcoded here.
    if (typeof LPA === 'undefined' || !LPA.enquiry_webhook) {
      throw new Error('LPA.enquiry_webhook is not configured');
    }
    return LPA.enquiry_webhook;
  }

  function turnstileToken(form) {
    // The widget writes its token into a hidden input named cf-turnstile-response.
    var el = form.querySelector('[name="cf-turnstile-response"]');
    return el && el.value ? el.value : '';
  }

  function resetTurnstile(form) {
    try {
      if (window.turnstile) {
        var w = form.querySelector('.cf-turnstile');
        if (w) window.turnstile.reset(w);
      }
    } catch (e) { /* a reset failure must never block the user */ }
  }

  function setBtn(btn, text, bg, disabled) {
    btn.textContent = text;
    btn.style.background = bg || '';
    btn.disabled = !!disabled;
  }

  /**
   * @param {Event} e submit event
   * @param {Object} opts { source, course_name, course_category, course_id, form_location }
   */
  window.lpaSubmitEnquiry = function (e, opts) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"], button');
    var orig = btn.textContent;
    var o = opts || {};

    var token = turnstileToken(form);
    if (!token) {
      setBtn(btn, orig, '', false);
      showError(form, 'Please complete the verification check and try again.');
      return;
    }

    setBtn(btn, 'Sending…', '', true);

    var payload = {
      source: o.source,
      full_name: (form.full_name && form.full_name.value || '').trim(),
      email: (form.email && form.email.value || '').trim(),
      phone: (form.phone && form.phone.value || '').trim(),
      company: (form.organisation && form.organisation.value || '').trim(),
      job_title: (form.job_title && form.job_title.value || '').trim(),
      message: (form.requirements && form.requirements.value || '').trim(),
      course_id: o.course_id || '',
      course_name: o.course_name || '',
      course_category: o.course_category || 'Enquiry',
      preferred_delivery_option: (form.preferred_delivery_option && form.preferred_delivery_option.value || ''),
      lead_intent: (form.lead_intent && form.lead_intent.value || ''),
      page_url: window.location.origin + window.location.pathname,
      submitted_at: new Date().toISOString(),
      turnstile_token: token,
      // Honeypot. Hidden from humans; bots fill it and are rejected server-side.
      fax: (form.fax && form.fax.value || ''),
      form_rendered_at: FORM_RENDERED_AT
    };

    fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        // A real, readable response. Unlike the old image beacon and no-cors fetch,
        // a failure is now genuinely visible to the browser.
        return res.json().catch(function () { return {}; })
          .then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.ok === true) {
          setBtn(btn, 'Enquiry Sent ✓', '#2a7a4e', true);
          clearError(form);
          if (window.LPA_track) {
            LPA_track('enquiry_submitted', { enquiry_type: 'general',
              form_location: o.form_location || 'unknown', lead_type: 'public',
              lead_intent: payload.lead_intent });
          }
          setTimeout(function () {
            form.reset();
            resetTurnstile(form);
            setBtn(btn, orig, '', false);
          }, 4000);
        } else {
          // The server never tells the browser WHICH check failed; we show its
          // generic message, or a safe fallback.
          setBtn(btn, orig, '', false);
          resetTurnstile(form);
          showError(form, (r.data && r.data.message) ||
            'We could not send your enquiry. Please email info@londonpetroacademy.co.uk.');
          if (window.LPA_track) LPA_track('form_error', { form_location: o.form_location || 'unknown' });
        }
      })
      .catch(function () {
        setBtn(btn, orig, '', false);
        resetTurnstile(form);
        showError(form, 'We could not reach our servers. Please email info@londonpetroacademy.co.uk.');
        if (window.LPA_track) LPA_track('form_error', { form_location: o.form_location || 'unknown' });
      });
  };

  function errorEl(form) {
    var el = form.querySelector('.lpa-form-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'lpa-form-error';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'margin:12px 0 0;font-size:14px;color:#c0392b;line-height:1.5;';
      form.appendChild(el);
    }
    return el;
  }
  function showError(form, msg) { errorEl(form).textContent = msg; }
  function clearError(form) { var el = form.querySelector('.lpa-form-error'); if (el) el.textContent = ''; }
})();
