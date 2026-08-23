/**
 * LPA Global Configuration
 * Update values here once — they apply across the entire site.
 * Do not hardcode phone, email, or webhook anywhere else.
 */
const LPA = {

  // ── Contact ──────────────────────────────────────────────
  phone:       '+44 (0) 1582 516247',
  phone_href:  'tel:+441582516247',
  email:       'info@londonpetroacademy.co.uk',
  email_ih:    'j.rogus@londonpetroacademy.co.uk',  // in-house enquiries
  address:     '207 Regent Street, London, W1B 3HH',
  calendly:    'https://calendly.com/london_petro_academy/ms-teams-session-with-london-petro-academy',

  // ── Analytics ────────────────────────────────────────────
  ga4_id:      'G-M8D1B87952',

  // ── n8n Lead Capture Webhook ─────────────────────────────
  // Switch between test and production URLs here only
  webhook_test: 'https://n8n.srv765009.hstgr.cloud/webhook-test/lpa-leads',
  webhook_prod: 'https://n8n.srv765009.hstgr.cloud/webhook/lpa-leads',
  get webhook() { return this.webhook_prod; }, // now live on production

  // ── Social ────────────────────────────────────────────────
  linkedin:    'https://www.linkedin.com/company/london-petro-academy-limited/',
  twitter:     'https://twitter.com/London_Petro_Ac',

  // ── Site ──────────────────────────────────────────────────
  site_url:    'https://www.londonpetroacademy.co.uk',
  github_url:  'https://cafedelmar74.github.io',

};

// Freeze so nothing overwrites it accidentally
Object.freeze(LPA);

// ── Global form submission helper (no-cors GET to avoid CORS preflight) ──
async function lpaSubmit(payload) {
  var base = 'https://n8n.srv765009.hstgr.cloud/webhook/lpa-leads';
  var qs = Object.keys(payload).map(function(k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k] || '');
  }).join('&');
  await fetch(base + '?' + qs, { method: 'GET', mode: 'no-cors' });
}

// ── GA4 event tracking helpers ────────────────────────────────
// Centralised so every page fires events with the same name/param shape.
// No PII (name/email/phone/company/job title/free text) should ever be
// passed in the params object — bounded values only.

// GA4-only course_category taxonomy — independent of the course_category
// value in each course page's booking/brochure payload (which feeds n8n/CRM
// and is never read or altered by this lookup). Keyed by pathname so no
// course HTML file needs to change. Phase 2A canonical values.
var LPA_COURSE_CATEGORY = {
  '/course-accounting-for-oil-gas.html': 'accounting_finance',
  '/course-accounting-jvs-pscs-upstream-oil-gas.html': 'accounting_finance',
  '/course-advanced-petroleum-economics-decision-analysis.html': 'petroleum_economics_fundamentals',
  '/course-brazil-jv.html': 'legal_fiscal_contracts',
  '/course-commercial-aspects-oil-refining.html': 'refining_downstream',
  '/course-commercial-economic-jv-oil-gas.html': 'legal_fiscal_contracts',
  '/course-corporate-power-purchase-agreements.html': 'renewable_energy_power',
  '/course-crude-oil-evaluation-economics-pricing.html': 'trading_markets',
  '/course-drilling-for-non-drilling-personnel.html': 'drilling_well_ops',
  '/course-drilling-hydraulics-design.html': 'drilling_well_ops',
  '/course-energy-transition-fiscal-systems.html': 'energy_transition',
  '/course-financial-fiscal-aspects-oil-gas-projects-brazil.html': 'legal_fiscal_contracts',
  '/course-gas-lng-contracts-negotiations.html': 'gas_lng',
  '/course-grid-scale-bess-technology-markets-project-finance.html': 'renewable_energy_power',
  '/course-hydrogen-economics-business-models.html': 'renewable_energy_power',
  '/course-ifrs-accounting-jvs-upstream-oil-gas.html': 'accounting_finance',
  '/course-ifrs-fundamentals-upstream-oil-gas.html': 'accounting_finance',
  '/course-international-crude-oil-markets.html': 'trading_markets',
  '/course-international-gas-markets.html': 'gas_lng',
  '/course-international-oil-supply-trading.html': 'trading_markets',
  '/course-ipps-power-project-contracts.html': 'renewable_energy_power',
  '/course-ipps-power-project-finance.html': 'renewable_energy_power',
  '/course-ipps-power-purchase-agreements.html': 'renewable_energy_power',
  '/course-legal-aspects-production-sharing-contracts.html': 'legal_fiscal_contracts',
  '/course-lng-value-chain.html': 'gas_lng',
  '/course-mini-mba-oil-gas-energy-business.html': 'petroleum_economics_fundamentals',
  '/course-mini-mba-renewable-energy-auctions.html': 'renewable_energy_power',
  '/course-offshore-deepwater-drilling.html': 'drilling_well_ops',
  '/course-oil-gas-fundamentals.html': 'petroleum_economics_fundamentals',
  '/course-petroleum-exploration-economics-decision.html': 'petroleum_economics_fundamentals',
  '/course-petroleum-project-economics-risk.html': 'petroleum_economics_fundamentals',
  '/course-petroleum-refining-non-technical.html': 'refining_downstream',
  '/course-production-sharing-contracts-brazil.html': 'legal_fiscal_contracts',
  '/course-renewable-energy-economics-finance.html': 'renewable_energy_power',
  '/course-solar-power-finance.html': 'renewable_energy_power',
  '/course-stuck-pipe-prevention.html': 'drilling_well_ops',
  '/course-world-fiscal-systems-unconventional.html': 'legal_fiscal_contracts'
};

// GA4-only canonical course_name — always overrides whichever literal a given
// call site happens to carry, so every course-level event reports one stable
// name regardless of which CTA/conversion fired it. Independent of the
// course_name/course values in each page's n8n-facing payload, which are
// never read or altered by this lookup. Keyed by pathname; no course HTML
// file needs to change. Phase 2B canonical values (booking-flow name used
// as canonical for the 4 courses where booking/brochure/calendar disagreed).
var LPA_COURSE_NAME = {
  '/course-accounting-for-oil-gas.html': 'Accounting for Oil & Gas',
  '/course-accounting-jvs-pscs-upstream-oil-gas.html': 'Accounting for JVs & PSCs in Upstream Oil & Gas',
  '/course-advanced-petroleum-economics-decision-analysis.html': 'Advanced Petroleum Economics & Decision Analysis',
  '/course-brazil-jv.html': 'Petroleum Agreements & Joint Ventures in Brazil',
  '/course-commercial-aspects-oil-refining.html': 'Commercial Aspects of Oil Refining',
  '/course-commercial-economic-jv-oil-gas.html': 'Indonesia Oil & Gas Fiscal and Joint Venture Training',
  '/course-corporate-power-purchase-agreements.html': 'Corporate Power Purchase Agreements',
  '/course-crude-oil-evaluation-economics-pricing.html': 'Crude Oil Evaluation, Economics & Pricing',
  '/course-drilling-for-non-drilling-personnel.html': 'Drilling for Non-Drilling Personnel',
  '/course-drilling-hydraulics-design.html': 'Drilling Hydraulics Design',
  '/course-energy-transition-fiscal-systems.html': 'Energy Transition & Petroleum Fiscal Systems',
  '/course-financial-fiscal-aspects-oil-gas-projects-brazil.html': 'Financial & Fiscal Aspects of Oil & Gas Projects in Brazil',
  '/course-gas-lng-contracts-negotiations.html': 'Gas & LNG Contracts Negotiations Masterclass',
  '/course-grid-scale-bess-technology-markets-project-finance.html': 'Grid-Scale BESS: Technology, Markets, and Project Finance',
  '/course-hydrogen-economics-business-models.html': 'Hydrogen Technology, Economics & Business Models',
  '/course-ifrs-accounting-jvs-upstream-oil-gas.html': 'IFRS Accounting for JVs in Upstream Oil & Gas',
  '/course-ifrs-fundamentals-upstream-oil-gas.html': 'IFRS Fundamentals for Upstream Oil & Gas',
  '/course-international-crude-oil-markets.html': 'International Crude Oil Markets: Benchmarks, Logistics, Refining Margins & Hedging',
  '/course-international-gas-markets.html': 'International Gas Markets & Economic Evaluation of Gas Projects',
  '/course-international-oil-supply-trading.html': 'International Oil Supply, Trading & Market Dynamics',
  '/course-ipps-power-project-contracts.html': 'Power Project Contracts, Finance, Risk & Negotiation',
  '/course-ipps-power-project-finance.html': 'Independent Power Producers (IPPs): Project Finance & Bankability in Emerging Markets',
  '/course-ipps-power-purchase-agreements.html': 'Independent Power Producers (IPPs): Bankable Power Purchase Agreements',
  '/course-legal-aspects-production-sharing-contracts.html': 'Legal Aspects of Production Sharing Contracts',
  '/course-lng-value-chain.html': 'LNG Value Chain: Markets, Trading, Operations & Energy Transition',
  '/course-mini-mba-oil-gas-energy-business.html': 'Mini MBA: Oil & Gas and Energy Business',
  '/course-mini-mba-renewable-energy-auctions.html': 'Mini MBA: Renewable Energy Markets, Auctions & Project Finance',
  '/course-offshore-deepwater-drilling.html': 'Offshore & Deepwater Drilling',
  '/course-oil-gas-fundamentals.html': 'Oil & Gas Fundamentals',
  '/course-petroleum-exploration-economics-decision.html': 'Petroleum Exploration Economics & Decision Strategies',
  '/course-petroleum-project-economics-risk.html': 'Petroleum Project Economics & Risk Decision Analysis',
  '/course-petroleum-refining-non-technical.html': 'Petroleum Refining for Non-Technical Persons',
  '/course-production-sharing-contracts-brazil.html': 'Production Sharing Contracts — Brazil: Legal, Fiscal & Financial Aspects',
  '/course-renewable-energy-economics-finance.html': 'Renewable Energy Economics and Finance',
  '/course-solar-power-finance.html': 'Solar Power Finance',
  '/course-stuck-pipe-prevention.html': 'Stuck Pipe Prevention',
  '/course-world-fiscal-systems-unconventional.html': 'World Fiscal Systems for Unconventional Oil & Gas'
};

// Only these events/cta_types are eligible for automatic course_category
// (and course_name) enrichment. Deliberately excludes form_error and
// enquiry_submitted.
var LPA_CATEGORY_EVENTS = ['booking_submitted', 'brochure_download', 'calendar_download'];
var LPA_CATEGORY_CTA_TYPES = ['booking_open', 'brochure_open', 'calendar_open'];

function LPA_isCourseEvent(eventName, params) {
  return LPA_CATEGORY_EVENTS.indexOf(eventName) !== -1 ||
    (eventName === 'cta_click' && params && LPA_CATEGORY_CTA_TYPES.indexOf(params.cta_type) !== -1);
}

function LPA_categoryFor(eventName, params) {
  if (!LPA_isCourseEvent(eventName, params)) { return null; }
  return LPA_COURSE_CATEGORY[window.location.pathname] || null;
}

function LPA_nameFor(eventName, params) {
  if (!LPA_isCourseEvent(eventName, params)) { return null; }
  return LPA_COURSE_NAME[window.location.pathname] || null;
}

function LPA_track(eventName, params) {
  params = params || {};
  var category = LPA_categoryFor(eventName, params);
  if (category && !params.course_category) {
    params = Object.assign({}, params, { course_category: category });
  }
  var canonicalName = LPA_nameFor(eventName, params);
  if (canonicalName) {
    params = Object.assign({}, params, { course_name: canonicalName });
  }
  if (typeof gtag === 'function') { gtag('event', eventName, params); }
}
function LPA_trackCTA(ctaType, extra) {
  LPA_track('cta_click', Object.assign({ cta_type: ctaType }, extra || {}));
}

// ── Phase 3D-3D: central course/session data lookup (PILOT) ──────────────
// Additive only — nothing above this point is modified or removed, and the
// other 36 course pages (which do not load course-data.js) never call any
// of the functions below, so this block changes no existing behaviour.

// Looks up the course record whose page_path matches the given pathname.
// This is a LOOKUP, not a derivation: course_id is never generated from
// pathname, it is only retrieved from the matching, pre-authored record in
// LPA_COURSES (course-data.js). Returns null if course-data.js hasn't
// loaded or no record matches.
function LPA_courseForPath(pathname) {
  if (typeof LPA_COURSES === 'undefined') { return null; }
  for (var i = 0; i < LPA_COURSES.length; i++) {
    if (LPA_COURSES[i].page_path === pathname) { return LPA_COURSES[i]; }
  }
  return null;
}

// Looks up a session by its immutable course_session_id. Pure lookup, no
// derivation. Does not validate that the session belongs to any particular
// course or is currently scheduled — callers check that themselves so they
// can report the correct error_type.
function LPA_sessionById(sessionId) {
  if (!sessionId || typeof LPA_SESSIONS === 'undefined') { return null; }
  for (var i = 0; i < LPA_SESSIONS.length; i++) {
    if (LPA_SESSIONS[i].course_session_id === sessionId) { return LPA_SESSIONS[i]; }
  }
  return null;
}

// Builds the booking_submitted session snapshot from a resolved session
// record at the moment of submission. Copies the record's current values —
// if the session is later rescheduled or relocated, this snapshot is
// unaffected, since it was taken at submit time, not re-derived afterward.
function LPA_sessionSnapshot(session) {
  return {
    course_session_id: session.course_session_id,
    course_start_date: session.course_start_date,
    course_end_date: session.course_end_date,
    course_location: session.course_location,
    course_country: session.course_country,
    delivery_format: session.delivery_format,
    virtual_timezone: session.virtual_timezone
  };
}

// Fires the dedicated course_page_view event at most once per page load.
// Deliberately carries no session/date/location — viewing the page doesn't
// imply interest in any one scheduled occurrence.
//
// LPA_coursePageViewFired is a plain in-memory flag, not persisted storage
// — it resets naturally on every real page load/navigation, since config.js
// itself is re-evaluated from scratch each time. A call with course == null
// (lookup not yet resolved, or failed) returns before the flag is checked
// or set, so it never consumes the guard — a later legitimate call in the
// same page load still fires normally.
var LPA_coursePageViewFired = false;
function LPA_fireCoursePageView(course) {
  if (!course) { return; }
  if (LPA_coursePageViewFired) { return; }
  LPA_coursePageViewFired = true;
  LPA_track('course_page_view', {
    course_id: course.course_id,
    course_name: course.course_name,
    course_category: course.course_category
  });
}

// ── Phase 3D-3D correction: render #bkSes from LPA_SESSIONS ──────────────
// The booking dropdown is generated from the central registry at load time
// — nothing about a course's sessions is ever hand-authored in a course
// page's HTML. course_session_id (not display text) is the option's
// authoritative identifier; visitor-facing text/value are formatted from
// the record's canonical fields, never the reverse.

// Display-only abbreviation for the visitor-facing dropdown text and the
// n8n-facing option value. Does NOT change what's stored in LPA_SESSIONS
// or sent to GA4 — course_country stays canonical ("United Kingdom")
// everywhere except this one rendering step.
var LPA_COUNTRY_DISPLAY_ABBR = { 'United Kingdom': 'UK', 'United Arab Emirates': 'UAE', 'United States': 'USA' };
function LPA_displayCountry(country) {
  return LPA_COUNTRY_DISPLAY_ABBR[country] || country;
}

// Presentation-only location label for a session: "City, Country", or
// just the city when course_location and course_country are identical
// (e.g. a city-state like Singapore), so the label doesn't repeat itself
// as "Singapore, Singapore". Same rule for every course — no per-course
// exceptions. Canonical course_location/course_country stay untouched.
function LPA_sessionLocationLabel(session) {
  if (session.delivery_format === 'virtual' && session.virtual_timezone) {
    return 'Virtual (' + (session.course_location ? session.course_location + ' ' : '') + session.virtual_timezone + ')';
  }
  if (session.course_location === session.course_country) { return session.course_location; }
  return session.course_location + ', ' + LPA_displayCountry(session.course_country);
}

var LPA_MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function LPA_formatSessionDateRange(startISO, endISO) {
  var s = startISO.split('-').map(Number), e = endISO.split('-').map(Number);
  var sY=s[0], sM=s[1], sD=s[2], eY=e[0], eM=e[1], eD=e[2];
  if (sY === eY && sM === eM) {
    return sD + '–' + eD + ' ' + LPA_MONTH_ABBR[sM-1] + ' ' + sY;
  }
  if (sY === eY) {
    return sD + ' ' + LPA_MONTH_ABBR[sM-1] + '–' + eD + ' ' + LPA_MONTH_ABBR[eM-1] + ' ' + eY;
  }
  return sD + ' ' + LPA_MONTH_ABBR[sM-1] + ' ' + sY + '–' + eD + ' ' + LPA_MONTH_ABBR[eM-1] + ' ' + eY;
}

// Renders #bkSes entirely from LPA_SESSIONS, filtered to this course and to
// session_status === 'scheduled', sorted chronologically by
// course_start_date. course_session_id is the option's authoritative
// identifier (data-session-id) — nothing is recovered by parsing the
// generated text. Leaves only the placeholder option and disables the
// select — with a distinct message — for both failure states (central data
// unavailable) and the legitimate zero-sessions state, so the existing
// required-field validation in submitBk() blocks submission naturally,
// without needing to fire form_error for a normal business state.
function LPA_renderSessionOptions(course) {
  var sel = document.getElementById('bkSes');
  if (!sel) { return; }
  while (sel.options.length > 1) { sel.remove(1); }
  var placeholder = sel.options[0];
  if (!course || typeof LPA_SESSIONS === 'undefined') {
    if (placeholder) { placeholder.textContent = 'Session data unavailable — please contact us to book'; }
    sel.disabled = true;
    return;
  }
  var sessions = LPA_SESSIONS.filter(function(s) {
    return s.course_id === course.course_id && s.session_status === 'scheduled';
  }).sort(function(a, b) {
    return a.course_start_date < b.course_start_date ? -1 : (a.course_start_date > b.course_start_date ? 1 : 0);
  });
  if (!sessions.length && !course.offers_on_request && !course.offers_in_house) {
    if (placeholder) { placeholder.textContent = 'No sessions currently scheduled — please contact us'; }
    sel.disabled = true;
    return;
  }
  if (placeholder) { placeholder.textContent = '— Choose a date and location —'; }
  sel.disabled = false;
  sessions.forEach(function(s) {
    var dateLabel = LPA_formatSessionDateRange(s.course_start_date, s.course_end_date);
    var locLabel = LPA_sessionLocationLabel(s);
    var opt = document.createElement('option');
    opt.value = dateLabel + ' | ' + locLabel;
    opt.setAttribute('data-session-id', s.course_session_id);
    opt.textContent = dateLabel + ' — ' + locLabel;
    sel.appendChild(opt);
  });
  if (course.offers_on_request) {
    var onReqOpt = document.createElement('option');
    onReqOpt.value = 'Classroom | Contact us for dates';
    onReqOpt.textContent = course.on_request_label || 'Classroom Session — Contact us for dates';
    sel.appendChild(onReqOpt);
  }
  if (course.offers_in_house) {
    var inHouseOpt = document.createElement('option');
    inHouseOpt.value = 'In-House | My location';
    inHouseOpt.textContent = course.in_house_label || 'In-House — My location';
    sel.appendChild(inHouseOpt);
  }
}

// ── Course enquiry modal (shared component) ──────────────────────────────
// Injected once per page load via LPA_renderEnquiryModal(course), called
// from the same DOMContentLoaded block that resolves LPA_CURRENT_COURSE.
// Markup, styling, and submit logic all live here so no course page
// duplicates modal HTML — mirrors how LPA_renderSessionOptions centralizes
// the booking dropdown while pages carry only a thin stub. Entirely
// separate from booking/brochure/contact-page flows: reuses the existing
// lpa-enquiry webhook (same one contact.html's general enquiry form uses)
// but tags itself enquiry_type:'course' so the two never conflate.
var LPA_ENQUIRY_MODAL_INJECTED = false;

// Same DOM-based escaping technique already used by esc() in
// dashboard.html/downloads-dashboard.html — setting textContent then
// reading innerHTML lets the browser's own serializer handle escaping,
// rather than a hand-rolled regex replace. Local to this block since
// those dashboard files aren't loaded by course pages.
function LPA_escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = String(s == null ? '' : s);
  return d.innerHTML;
}

function LPA_renderEnquiryModal(course) {
  if (LPA_ENQUIRY_MODAL_INJECTED) { return; }
  LPA_ENQUIRY_MODAL_INJECTED = true;

  var style = document.createElement('style');
  style.textContent =
    '#enqOverlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(10,11,13,0.92);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;}' +
    '#enqOverlay.open{display:flex;}' +
    '#enqModal{background:#fff;width:100%;max-width:480px;border-top:4px solid #c8873a;box-shadow:0 40px 100px rgba(0,0,0,.6);animation:enqIn .3s cubic-bezier(.34,1.4,.64,1) forwards;max-height:94vh;overflow-y:auto;}' +
    '@keyframes enqIn{from{transform:scale(.94) translateY(12px);opacity:0;}to{transform:scale(1) translateY(0);opacity:1;}}' +
    '.btn-enquiry-glow{position:relative;animation:enqGlow 2.2s ease-in-out infinite;}' +
    '@keyframes enqGlow{0%,100%{box-shadow:0 0 0 0 rgba(200,135,58,.45);}50%{box-shadow:0 0 14px 4px rgba(224,154,74,.35);}}' +
    '@media (prefers-reduced-motion: reduce){.btn-enquiry-glow{animation:none;}}';
  document.head.appendChild(style);

  var courseName = LPA_escapeHtml(course ? course.course_name : document.title);

  var htmlParts = [];
  htmlParts.push('<div id="enqOverlay" onclick="if(event.target===this)closeEnqModal()">');
  htmlParts.push('<div id="enqModal">');
  htmlParts.push('<div class="brh"><div class="brh-left">');
  htmlParts.push('<img src="logo-dark.png" alt="London Petro Academy" width="1202" height="316">');
  htmlParts.push('<div class="brh-t">Send an <em>Enquiry</em></div>');
  htmlParts.push('<div class="brh-s">' + courseName + '</div>');
  htmlParts.push('</div><button class="br-x" onclick="closeEnqModal()">&#x2715;</button></div>');
  htmlParts.push('<div class="brb"><div id="enqFormArea">');
  htmlParts.push('<div class="br-field"><label class="brfl">Full Name <span class="r">*</span></label><input class="brfi" id="enqName" type="text" placeholder="Jane Smith" autocomplete="name"></div>');
  htmlParts.push('<div class="br-field"><label class="brfl">Work Email <span class="r">*</span></label><input class="brfi" id="enqEmail" type="email" placeholder="jane@company.com" autocomplete="email"></div>');
  htmlParts.push('<div class="br-field"><label class="brfl">Phone Number</label><input class="brfi" id="enqPhone" type="tel" placeholder="+44 7700 000000" autocomplete="tel"></div>');
  htmlParts.push('<div class="br-field"><label class="brfl">Company</label><input class="brfi" id="enqCompany" type="text" placeholder="Company name" autocomplete="organization"></div>');
  htmlParts.push('<div class="br-field"><label class="brfl">Job Title</label><input class="brfi" id="enqJobTitle" type="text" placeholder="Job title" autocomplete="organization-title"></div>');
  htmlParts.push('<div class="br-field"><label class="brfl">Preferred Delivery Option</label><select class="brfi" id="enqDelivery">');
  htmlParts.push('<option value="">No preference</option>');
  htmlParts.push('<option value="Classroom">Classroom</option>');
  htmlParts.push('<option value="Virtual">Virtual</option>');
  htmlParts.push('<option value="In-house">In-house</option>');
  htmlParts.push('</select></div>');
  htmlParts.push('<div class="br-field"><label class="brfl">Message</label><textarea class="brfi" id="enqMessage" rows="3" placeholder="Tell us what you need..."></textarea></div>');
  htmlParts.push('<button class="btn-book" id="enqSB" onclick="submitEnquiry()" type="button">Send Enquiry &rarr;</button>');
  htmlParts.push('</div><div id="enqOK" style="display:none;text-align:center;padding:20px 0;"><p>Thanks &mdash; we will be in touch shortly.</p></div></div>');
  htmlParts.push('</div>');
  htmlParts.push('</div>');

  document.body.insertAdjacentHTML('beforeend', htmlParts.join(''));
}

function openEnqModal(){
  document.getElementById('enqOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  LPA_trackCTA('enquiry', LPA_CURRENT_COURSE ? {course_id: LPA_CURRENT_COURSE.course_id, course_name: LPA_CURRENT_COURSE.course_name} : {});
}

function closeEnqModal(){
  document.getElementById('enqOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function submitEnquiry(){
  var name = document.getElementById('enqName');
  var email = document.getElementById('enqEmail');
  var ok = true;
  [name, email].forEach(function(el){
    el.classList.remove('er');
    if (!el.value.trim()) { el.classList.add('er'); ok = false; }
  });
  if (!ok) { return; }

  var btn = document.getElementById('enqSB');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  var course = LPA_CURRENT_COURSE;
  var deliveryOption = document.getElementById('enqDelivery').value;

  var payload = {
    full_name: name.value.trim(),
    email: email.value.trim(),
    phone: document.getElementById('enqPhone').value.trim(),
    company: document.getElementById('enqCompany').value.trim(),
    job_title: document.getElementById('enqJobTitle').value.trim(),
    message: document.getElementById('enqMessage').value.trim(),
    course_id: course ? course.course_id : '',
    course_name: course ? course.course_name : document.title,
    course_category: course ? course.course_category : '',
    preferred_delivery_option: deliveryOption,
    source: 'course_page_enquiry',
    page_url: window.location.href,
    submitted_at: new Date().toISOString()
  };

  var qs = Object.keys(payload).map(function(k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k] || '');
  }).join('&');

  try {
    await fetch('https://n8n.srv765009.hstgr.cloud/webhook/lpa-enquiry?' + qs, { method: 'GET', mode: 'no-cors' });
    document.getElementById('enqFormArea').style.display = 'none';
    document.getElementById('enqOK').style.display = 'block';
    var gaParams = {
      enquiry_type: 'course',
      form_location: 'course_page',
      lead_type: 'public',
      preferred_delivery_option: deliveryOption
    };
    if (course) {
      gaParams.course_id = course.course_id;
      gaParams.course_name = course.course_name;
      gaParams.course_category = course.course_category;
    }
    LPA_track('enquiry_submitted', gaParams);
  } catch (e) {
    btn.textContent = 'Send Enquiry →';
    btn.disabled = false;
    alert('Something went wrong. Please email info@londonpetroacademy.co.uk');
    LPA_track('form_error', {form_location: 'course_page'});
  }
}

// ── Phase 3D-3E: one-calendar pilot — legacy row generation ──────────────
// Additive only. Existing shared functions above (LPA_courseForPath,
// LPA_sessionById, LPA_sessionSnapshot, LPA_fireCoursePageView,
// LPA_renderSessionOptions, and the display/formatting helpers) are
// unmodified. Nothing here is called by any course page.

// Looks up a course record by its immutable course_id — used where the
// current page isn't the course's own page (e.g. a portfolio calendar), so
// page_path can't be used as the lookup key. Pure lookup, no derivation.
function LPA_courseById(courseId) {
  if (typeof LPA_COURSES === 'undefined') { return null; }
  for (var i = 0; i < LPA_COURSES.length; i++) {
    if (LPA_COURSES[i].course_id === courseId) { return LPA_COURSES[i]; }
  }
  return null;
}

// Presentation-only short label for a course_category, used solely to
// reproduce the legacy calendar card's "Upstream · X" tag text. This is
// NOT a taxonomy and is never sent to GA4 or used as an identifier —
// course_category itself stays exactly as authored in LPA_COURSES.
// Deliberately partial: only covers categories exercised by courses
// migrated so far; extend as further courses join the calendar pilot.
var LPA_CALENDAR_CATEGORY_LABELS = {
  'legal_fiscal_contracts': 'Legal & Fiscal',
  'accounting_finance': 'Finance',
  'drilling_well_ops': 'Drilling',
  'refining_downstream': 'Refining'
};
function LPA_calendarCategoryLabel(courseCategory) {
  return LPA_CALENDAR_CATEGORY_LABELS[courseCategory] || courseCategory;
}

// Maps a session's canonical delivery_format to the legacy calendar's two
// display formats. Returns null for anything else — callers must exclude
// the session rather than guess, so an unrecognised format (e.g. in_house,
// tbc_on_request) never gets silently mislabelled as classroom.
function LPA_legacyCalendarFmt(deliveryFormat) {
  if (deliveryFormat === 'in_person') { return 'classroom'; }
  if (deliveryFormat === 'virtual') { return 'virtual'; }
  return null;
}

// Builds legacy-shaped calendar row objects ({month,cat,fmt,title,dates,
// loc,url,tag}) for one course's scheduled sessions falling in the given
// calendar year, sourced entirely from LPA_COURSES/LPA_SESSIONS. year is
// required — each portfolio calendar page covers exactly one year, and
// LPA_SESSIONS is not itself year-partitioned, so the caller must say
// which year it's rendering.
function LPA_legacyCalendarRowsForCourse(courseId, year) {
  var course = LPA_courseById(courseId);
  if (!course || typeof LPA_SESSIONS === 'undefined') { return []; }
  var monthAbbr = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  var rows = [];
  LPA_SESSIONS.filter(function(s) {
    return s.course_id === courseId &&
           s.session_status === 'scheduled' &&
           s.course_start_date.slice(0, 4) === String(year);
  }).forEach(function(s) {
    var fmt = LPA_legacyCalendarFmt(s.delivery_format);
    if (!fmt) { return; }
    var monthIndex = parseInt(s.course_start_date.split('-')[1], 10) - 1;
    rows.push({
      month: monthAbbr[monthIndex],
      cat: course.calendar_category,
      fmt: fmt,
      title: course.course_name,
      dates: LPA_formatSessionDateRange(s.course_start_date, s.course_end_date),
      loc: LPA_sessionLocationLabel(s),
      url: course.page_path.replace(/^\//, ''),
      tag: course.calendar_tag_override || (course.calendar_category.charAt(0).toUpperCase() + course.calendar_category.slice(1) + ' · ' + (course.calendar_label || LPA_calendarCategoryLabel(course.course_category)))
    });
  });
  return rows;
}
