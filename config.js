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

// Country-name normalisation for the two-component "City, Country" case only.
var LPA_COUNTRY_NORMALIZE = { 'UK': 'United Kingdom' };

// Explicit, bounded map for single-component physical locations that are
// genuinely both city and country. Do NOT infer this generically — a future
// bare city (e.g. "Dubai") must not silently become its own country.
var LPA_SINGLE_LOCATION_COUNTRY = { 'Singapore': 'Singapore' };

// Parses a raw <select id="bkSes"> option value into delivery_format plus,
// for in_person sessions, course_location/course_country. No date parsing.
// Returns null when the format isn't recognised — callers must omit fields
// rather than guess.
function LPA_parseSessionLocation(raw) {
  if (!raw) { return null; }
  if (raw === 'On Request' || raw === 'Upon Request') {
    return { delivery_format: 'tbc_on_request' };
  }
  var parts = raw.split('|');
  var first = parts[0] ? parts[0].trim() : '';
  var second = parts[1] ? parts[1].trim() : '';
  if (first === 'Classroom') { return { delivery_format: 'tbc_on_request' }; }
  if (first === 'In-House') { return { delivery_format: 'in_house' }; }
  if (!second) { return null; }
  if (second.indexOf('Virtual') === 0) { return { delivery_format: 'virtual' }; }
  var segs = second.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
  if (!segs.length) { return null; }
  if (segs.length >= 2) {
    var city = segs[0];
    var country = LPA_COUNTRY_NORMALIZE[segs[segs.length - 1]] || segs[segs.length - 1];
    return { delivery_format: 'in_person', course_location: city, course_country: country };
  }
  // Single-component location — only attach a country when explicitly known
  // to be city==country. Otherwise send course_location and omit country.
  var single = segs[0];
  var result = { delivery_format: 'in_person', course_location: single };
  if (LPA_SINGLE_LOCATION_COUNTRY[single]) {
    result.course_country = LPA_SINGLE_LOCATION_COUNTRY[single];
  }
  return result;
}

// Reads the currently-selected booking session directly from the DOM
// (#bkSes already exists on every course page and is already relied on by
// that page's own n8n payload construction) and enriches params with the
// parsed location/country/delivery_format. Only ever called for
// booking_submitted.
function LPA_enrichBookingSession(params) {
  var sel = document.getElementById('bkSes');
  if (!sel || !sel.value) { return params; }
  var parsed = LPA_parseSessionLocation(sel.value);
  if (!parsed) { return params; }
  return Object.assign({}, params, parsed);
}

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
  if (eventName === 'booking_submitted' && LPA_COURSE_NAME[window.location.pathname]) {
    params = LPA_enrichBookingSession(params);
  }
  if (typeof gtag === 'function') { gtag('event', eventName, params); }
}
function LPA_trackCTA(ctaType, extra) {
  LPA_track('cta_click', Object.assign({ cta_type: ctaType }, extra || {}));
}
