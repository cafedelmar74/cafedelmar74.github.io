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
  fetch(base + '?' + qs, { method: 'GET', mode: 'no-cors' }).catch(function(){});
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

// Only these events/cta_types are eligible for automatic course_category
// enrichment. Deliberately excludes form_error and enquiry_submitted.
var LPA_CATEGORY_EVENTS = ['booking_submitted', 'brochure_download', 'calendar_download'];
var LPA_CATEGORY_CTA_TYPES = ['booking_open', 'brochure_open', 'calendar_open'];

function LPA_categoryFor(eventName, params) {
  var eligible = LPA_CATEGORY_EVENTS.indexOf(eventName) !== -1 ||
    (eventName === 'cta_click' && params && LPA_CATEGORY_CTA_TYPES.indexOf(params.cta_type) !== -1);
  if (!eligible) { return null; }
  return LPA_COURSE_CATEGORY[window.location.pathname] || null;
}

function LPA_track(eventName, params) {
  params = params || {};
  var category = LPA_categoryFor(eventName, params);
  if (category && !params.course_category) {
    params = Object.assign({}, params, { course_category: category });
  }
  if (typeof gtag === 'function') { gtag('event', eventName, params); }
}
function LPA_trackCTA(ctaType, extra) {
  LPA_track('cta_click', Object.assign({ cta_type: ctaType }, extra || {}));
}
