/**
 * LPA Central Course & Session Data — PILOT (Phase 3D-3D)
 *
 * Single source of truth for course and session identity, per the approved
 * architecture in lpa-dynamic-analytics-architecture-3D3C.html.
 *
 * course_id and course_session_id are immutable, hand-authored literals.
 * They are never computed from page_path, dates, locations, names, or any
 * other mutable attribute — everything else on a record may change freely
 * without affecting its id.
 *
 * PILOT SCOPE: only course-legal-aspects-production-sharing-contracts.html
 * is represented here. The remaining 36 courses are migrated in a later,
 * separately-approved phase — this file is not yet the portfolio registry.
 */

var LPA_COURSES = [
  {
    course_id:         'legal-aspects-production-sharing-contracts',
    course_name:       'Legal Aspects of Production Sharing Contracts',
    course_category:   'legal_fiscal_contracts',
    calendar_category: 'upstream',
    page_path:         '/course-legal-aspects-production-sharing-contracts.html',
    status:            'active'
  },
  {
    course_id:         'ifrs-accounting-jvs-upstream-oil-gas',
    course_name:       'IFRS Accounting for JVs in Upstream Oil & Gas',
    course_category:   'accounting_finance',
    calendar_category: 'upstream',
    page_path:         '/course-ifrs-accounting-jvs-upstream-oil-gas.html',
    status:            'active'
  },
  {
    course_id:         'drilling-for-non-drilling-personnel',
    course_name:       'Drilling for Non-Drilling Personnel',
    course_category:   'drilling_well_ops',
    calendar_category: 'upstream',
    page_path:         '/course-drilling-for-non-drilling-personnel.html',
    status:            'active'
  },
  {
    course_id:         'ifrs-fundamentals-upstream-oil-gas',
    course_name:       'IFRS Fundamentals for Upstream Oil & Gas',
    course_category:   'accounting_finance',
    calendar_category: 'upstream',
    page_path:         '/course-ifrs-fundamentals-upstream-oil-gas.html',
    status:            'active'
  },
  {
    course_id:         'accounting-jvs-pscs-upstream-oil-gas',
    course_name:       'Accounting for JVs & PSCs in Upstream Oil & Gas',
    course_category:   'accounting_finance',
    calendar_category: 'upstream',
    page_path:         '/course-accounting-jvs-pscs-upstream-oil-gas.html',
    status:            'active'
  },
  {
    course_id:         'commercial-aspects-oil-refining',
    course_name:       'Commercial Aspects of Oil Refining',
    course_category:   'refining_downstream',
    calendar_category: 'downstream',
    page_path:         '/course-commercial-aspects-oil-refining.html',
    status:            'active'
  },
  {
    course_id:         'accounting-for-oil-gas',
    course_name:       'Accounting for Oil & Gas',
    course_category:   'accounting_finance',
    calendar_category: 'upstream',
    page_path:         '/course-accounting-for-oil-gas.html',
    status:            'active'
  },
  {
    // calendar_label overrides LPA_CALENDAR_CATEGORY_LABELS['gas_lng'] for
    // this course only — 'gas_lng' is shared by other courses (Gas & LNG
    // Contracts Negotiations, LNG Value Chain) whose legacy tags differ
    // ('Gas & LNG', 'LNG'), so no single shared label can serve all three.
    course_id:         'international-gas-markets',
    course_name:       'International Gas Markets & Economic Evaluation of Gas Projects',
    course_category:   'gas_lng',
    calendar_category: 'upstream',
    calendar_label:    'Economics',
    page_path:         '/course-international-gas-markets.html',
    status:            'active'
  },
  {
    course_id:         'stuck-pipe-prevention',
    course_name:       'Stuck Pipe Prevention',
    course_category:   'drilling_well_ops',
    calendar_category: 'upstream',
    page_path:         '/course-stuck-pipe-prevention.html',
    status:            'active'
  },
  {
    course_id:         'crude-oil-evaluation-economics-pricing',
    course_name:       'Crude Oil Evaluation, Economics & Pricing',
    course_category:   'trading_markets',
    calendar_category: 'downstream',
    page_path:         '/course-crude-oil-evaluation-economics-pricing.html',
    status:            'active'
  },
  {
    course_id:         'drilling-hydraulics-design',
    course_name:       'Drilling Hydraulics Design',
    course_category:   'drilling_well_ops',
    calendar_category: 'upstream',
    page_path:         '/course-drilling-hydraulics-design.html',
    status:            'active'
  },
  {
    course_id:         'petroleum-refining-non-technical',
    course_name:       'Petroleum Refining for Non-Technical Persons',
    course_category:   'refining_downstream',
    calendar_category: 'downstream',
    page_path:         '/course-petroleum-refining-non-technical.html',
    status:            'active'
  },
  {
    course_id:         'advanced-petroleum-economics-decision-analysis',
    course_name:       'Advanced Petroleum Economics & Decision Analysis',
    course_category:   'petroleum_economics_fundamentals',
    calendar_category: 'upstream',
    calendar_label:    'Economics',
    page_path:         '/course-advanced-petroleum-economics-decision-analysis.html',
    status:            'active'
  },
  {
    // offers_on_request intentionally NOT set — this course's existing
    // "In-House | My location" on-request option has different commercial
    // meaning than the shared offers_on_request renderer's hardcoded
    // "Classroom Session — Contact us for dates" text. Course page wiring
    // (and any offers_on_request field) deferred to a dedicated follow-up.
    course_id:         'petroleum-exploration-economics-decision',
    course_name:       'Petroleum Exploration Economics & Decision Strategies',
    course_category:   'petroleum_economics_fundamentals',
    calendar_category: 'upstream',
    calendar_label:    'Economics',
    page_path:         '/course-petroleum-exploration-economics-decision.html',
    status:            'active'
  },
  {
    course_id:         'petroleum-project-economics-risk',
    course_name:       'Petroleum Project Economics & Risk Decision Analysis',
    course_category:   'petroleum_economics_fundamentals',
    calendar_category: 'upstream',
    calendar_label:    'Economics',
    page_path:         '/course-petroleum-project-economics-risk.html',
    status:            'active'
  },
  {
    course_id:         'mini-mba-oil-gas-energy-business',
    course_name:       'Mini MBA: Oil & Gas and Energy Business',
    course_category:   'petroleum_economics_fundamentals',
    calendar_category: 'upstream',
    calendar_label:    'Leadership',
    page_path:         '/course-mini-mba-oil-gas-energy-business.html',
    status:            'active'
  },
  {
    course_id:         'oil-gas-fundamentals',
    course_name:       'Oil & Gas Fundamentals',
    course_category:   'petroleum_economics_fundamentals',
    calendar_category: 'upstream',
    calendar_label:    'Fundamentals',
    page_path:         '/course-oil-gas-fundamentals.html',
    status:            'active'
  }
];

var LPA_SESSIONS = [
  {
    course_session_id: 'legal-aspects-production-sharing-contracts-s1',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2026-08-24',
    course_end_date:    '2026-08-26',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'legal-aspects-production-sharing-contracts-s2',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2026-11-23',
    course_end_date:    '2026-11-25',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'legal-aspects-production-sharing-contracts-s3',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2027-02-01',
    course_end_date:    '2027-02-03',
    course_location:    'Manila',
    course_country:     'Philippines',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Business-confirmed 2027 session (Phase 3D-3F) — previously ambiguous,
    // now approved. Immutable id continues the existing s1-s3 sequence.
    course_session_id: 'legal-aspects-production-sharing-contracts-s4',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2027-01-25',
    course_end_date:    '2027-01-27',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'legal-aspects-production-sharing-contracts-s5',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2027-04-26',
    course_end_date:    '2027-04-28',
    course_location:    'Lagos',
    course_country:     'Nigeria',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'legal-aspects-production-sharing-contracts-s6',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2027-07-26',
    course_end_date:    '2027-07-28',
    course_location:    'Jakarta',
    course_country:     'Indonesia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'legal-aspects-production-sharing-contracts-s7',
    course_id:          'legal-aspects-production-sharing-contracts',
    course_start_date:  '2027-08-23',
    course_end_date:    '2027-08-25',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Second course migrated (Phase 3D-3H). Business-confirmed sessions.
    course_session_id: 'ifrs-accounting-jvs-upstream-oil-gas-s1',
    course_id:          'ifrs-accounting-jvs-upstream-oil-gas',
    course_start_date:  '2026-10-05',
    course_end_date:    '2026-10-08',
    course_location:    'Calgary',
    course_country:     'Canada',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-accounting-jvs-upstream-oil-gas-s2',
    course_id:          'ifrs-accounting-jvs-upstream-oil-gas',
    course_start_date:  '2027-03-15',
    course_end_date:    '2027-03-18',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-accounting-jvs-upstream-oil-gas-s3',
    course_id:          'ifrs-accounting-jvs-upstream-oil-gas',
    course_start_date:  '2027-07-12',
    course_end_date:    '2027-07-15',
    course_location:    'Kuala Lumpur',
    course_country:     'Malaysia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-accounting-jvs-upstream-oil-gas-s4',
    course_id:          'ifrs-accounting-jvs-upstream-oil-gas',
    course_start_date:  '2027-10-04',
    course_end_date:    '2027-10-07',
    course_location:    'Calgary',
    course_country:     'Canada',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-accounting-jvs-upstream-oil-gas-s5',
    course_id:          'ifrs-accounting-jvs-upstream-oil-gas',
    course_start_date:  '2027-12-06',
    course_end_date:    '2027-12-09',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Third course migrated (Phase 3D-3I). Business-confirmed sessions.
    course_session_id: 'drilling-for-non-drilling-personnel-s1',
    course_id:          'drilling-for-non-drilling-personnel',
    course_start_date:  '2026-11-02',
    course_end_date:    '2026-11-04',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-for-non-drilling-personnel-s2',
    course_id:          'drilling-for-non-drilling-personnel',
    course_start_date:  '2027-04-26',
    course_end_date:    '2027-04-28',
    course_location:    'Aberdeen',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-for-non-drilling-personnel-s3',
    course_id:          'drilling-for-non-drilling-personnel',
    course_start_date:  '2027-05-24',
    course_end_date:    '2027-05-26',
    course_location:    'Cairo',
    course_country:     'Egypt',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-for-non-drilling-personnel-s4',
    course_id:          'drilling-for-non-drilling-personnel',
    course_start_date:  '2027-09-27',
    course_end_date:    '2027-09-29',
    course_location:    'Al Khobar',
    course_country:     'Saudi Arabia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-for-non-drilling-personnel-s5',
    course_id:          'drilling-for-non-drilling-personnel',
    course_start_date:  '2027-11-08',
    course_end_date:    '2027-11-10',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Fourth course migrated (Phase 3D-3J). Business-confirmed sessions.
    course_session_id: 'ifrs-fundamentals-upstream-oil-gas-s1',
    course_id:          'ifrs-fundamentals-upstream-oil-gas',
    course_start_date:  '2026-07-20',
    course_end_date:    '2026-07-22',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-fundamentals-upstream-oil-gas-s2',
    course_id:          'ifrs-fundamentals-upstream-oil-gas',
    course_start_date:  '2026-12-07',
    course_end_date:    '2026-12-09',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-fundamentals-upstream-oil-gas-s3',
    course_id:          'ifrs-fundamentals-upstream-oil-gas',
    course_start_date:  '2027-01-11',
    course_end_date:    '2027-01-13',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-fundamentals-upstream-oil-gas-s4',
    course_id:          'ifrs-fundamentals-upstream-oil-gas',
    course_start_date:  '2027-04-26',
    course_end_date:    '2027-04-28',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-fundamentals-upstream-oil-gas-s5',
    course_id:          'ifrs-fundamentals-upstream-oil-gas',
    course_start_date:  '2027-07-19',
    course_end_date:    '2027-07-21',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'ifrs-fundamentals-upstream-oil-gas-s6',
    course_id:          'ifrs-fundamentals-upstream-oil-gas',
    course_start_date:  '2027-09-20',
    course_end_date:    '2027-09-22',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Fifth course migrated (Phase 3D-3K). Business-confirmed sessions.
    course_session_id: 'accounting-jvs-pscs-upstream-oil-gas-s1',
    course_id:          'accounting-jvs-pscs-upstream-oil-gas',
    course_start_date:  '2026-08-10',
    course_end_date:    '2026-08-14',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-jvs-pscs-upstream-oil-gas-s2',
    course_id:          'accounting-jvs-pscs-upstream-oil-gas',
    course_start_date:  '2026-11-23',
    course_end_date:    '2026-11-27',
    course_location:    'Bali',
    course_country:     'Indonesia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-jvs-pscs-upstream-oil-gas-s3',
    course_id:          'accounting-jvs-pscs-upstream-oil-gas',
    course_start_date:  '2027-02-15',
    course_end_date:    '2027-02-19',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-jvs-pscs-upstream-oil-gas-s4',
    course_id:          'accounting-jvs-pscs-upstream-oil-gas',
    course_start_date:  '2027-08-09',
    course_end_date:    '2027-08-13',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-jvs-pscs-upstream-oil-gas-s5',
    course_id:          'accounting-jvs-pscs-upstream-oil-gas',
    course_start_date:  '2027-10-04',
    course_end_date:    '2027-10-08',
    course_location:    'Lagos',
    course_country:     'Nigeria',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-jvs-pscs-upstream-oil-gas-s6',
    course_id:          'accounting-jvs-pscs-upstream-oil-gas',
    course_start_date:  '2027-11-22',
    course_end_date:    '2027-11-26',
    course_location:    'Bali',
    course_country:     'Indonesia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Sixth course migrated (Phase 3D-3L). Business-confirmed sessions.
    course_session_id: 'commercial-aspects-oil-refining-s1',
    course_id:          'commercial-aspects-oil-refining',
    course_start_date:  '2026-09-14',
    course_end_date:    '2026-09-16',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'commercial-aspects-oil-refining-s2',
    course_id:          'commercial-aspects-oil-refining',
    course_start_date:  '2026-10-26',
    course_end_date:    '2026-10-28',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'commercial-aspects-oil-refining-s3',
    course_id:          'commercial-aspects-oil-refining',
    course_start_date:  '2027-02-22',
    course_end_date:    '2027-02-24',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'commercial-aspects-oil-refining-s4',
    course_id:          'commercial-aspects-oil-refining',
    course_start_date:  '2027-06-07',
    course_end_date:    '2027-06-09',
    course_location:    'Rotterdam',
    course_country:     'Netherlands',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'commercial-aspects-oil-refining-s5',
    course_id:          'commercial-aspects-oil-refining',
    course_start_date:  '2027-09-13',
    course_end_date:    '2027-09-15',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'commercial-aspects-oil-refining-s6',
    course_id:          'commercial-aspects-oil-refining',
    course_start_date:  '2027-11-15',
    course_end_date:    '2027-11-17',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Seventh course migrated (Phase 3D-3M). Business-confirmed sessions.
    // VAT disclosure for London sessions is kept as a page-specific static
    // exception (price table, FAQ, brochure note) — not modeled here or in
    // the shared renderer, per explicit approval.
    course_session_id: 'accounting-for-oil-gas-s1',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2026-08-03',
    course_end_date:    '2026-08-07',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-for-oil-gas-s2',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2026-10-26',
    course_end_date:    '2026-10-30',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-for-oil-gas-s3',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2026-12-04',
    course_end_date:    '2026-12-08',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-for-oil-gas-s4',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2027-03-08',
    course_end_date:    '2027-03-12',
    course_location:    'Cape Town',
    course_country:     'South Africa',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-for-oil-gas-s5',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2027-06-14',
    course_end_date:    '2027-06-18',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-for-oil-gas-s6',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2027-08-02',
    course_end_date:    '2027-08-06',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'accounting-for-oil-gas-s7',
    course_id:          'accounting-for-oil-gas',
    course_start_date:  '2027-12-06',
    course_end_date:    '2027-12-10',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Eighth course migrated (Phase 3D-3N). Business-confirmed sessions.
    course_session_id: 'international-gas-markets-s1',
    course_id:          'international-gas-markets',
    course_start_date:  '2026-08-03',
    course_end_date:    '2026-08-07',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'international-gas-markets-s2',
    course_id:          'international-gas-markets',
    course_start_date:  '2026-09-07',
    course_end_date:    '2026-09-11',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'international-gas-markets-s3',
    course_id:          'international-gas-markets',
    course_start_date:  '2026-11-30',
    course_end_date:    '2026-12-04',
    course_location:    'Doha',
    course_country:     'Qatar',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'international-gas-markets-s4',
    course_id:          'international-gas-markets',
    course_start_date:  '2027-02-01',
    course_end_date:    '2027-02-05',
    course_location:    'Cairo',
    course_country:     'Egypt',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'international-gas-markets-s5',
    course_id:          'international-gas-markets',
    course_start_date:  '2027-07-12',
    course_end_date:    '2027-07-16',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'international-gas-markets-s6',
    course_id:          'international-gas-markets',
    course_start_date:  '2027-09-20',
    course_end_date:    '2027-09-24',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'international-gas-markets-s7',
    course_id:          'international-gas-markets',
    course_start_date:  '2027-11-29',
    course_end_date:    '2027-12-03',
    course_location:    'Doha',
    course_country:     'Qatar',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Ninth course migrated (Phase 3D-3O, final Group A). Business-confirmed sessions.
    course_session_id: 'stuck-pipe-prevention-s1',
    course_id:          'stuck-pipe-prevention',
    course_start_date:  '2026-08-10',
    course_end_date:    '2026-08-12',
    course_location:    'Aberdeen',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'stuck-pipe-prevention-s2',
    course_id:          'stuck-pipe-prevention',
    course_start_date:  '2026-09-18',
    course_end_date:    '2026-09-20',
    course_location:    'Stavanger',
    course_country:     'Norway',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'stuck-pipe-prevention-s3',
    course_id:          'stuck-pipe-prevention',
    course_start_date:  '2027-04-05',
    course_end_date:    '2027-04-07',
    course_location:    'Kuala Lumpur',
    course_country:     'Malaysia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'stuck-pipe-prevention-s4',
    course_id:          'stuck-pipe-prevention',
    course_start_date:  '2027-08-09',
    course_end_date:    '2027-08-11',
    course_location:    'Aberdeen',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'stuck-pipe-prevention-s5',
    course_id:          'stuck-pipe-prevention',
    course_start_date:  '2027-09-20',
    course_end_date:    '2027-09-22',
    course_location:    'Cairo',
    course_country:     'Egypt',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'stuck-pipe-prevention-s6',
    course_id:          'stuck-pipe-prevention',
    course_start_date:  '2027-10-11',
    course_end_date:    '2027-10-13',
    course_location:    'Abu Dhabi',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Tenth course migrated (Phase 3D-3Q, first Group B1 migration). Business-confirmed sessions.
    course_session_id: 'crude-oil-evaluation-economics-pricing-s1',
    course_id:          'crude-oil-evaluation-economics-pricing',
    course_start_date:  '2026-07-06',
    course_end_date:    '2026-07-10',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'crude-oil-evaluation-economics-pricing-s2',
    course_id:          'crude-oil-evaluation-economics-pricing',
    course_start_date:  '2026-11-02',
    course_end_date:    '2026-11-06',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'crude-oil-evaluation-economics-pricing-s3',
    course_id:          'crude-oil-evaluation-economics-pricing',
    course_start_date:  '2027-03-08',
    course_end_date:    '2027-03-12',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'crude-oil-evaluation-economics-pricing-s4',
    course_id:          'crude-oil-evaluation-economics-pricing',
    course_start_date:  '2027-04-26',
    course_end_date:    '2027-04-30',
    course_location:    'Dubai',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'crude-oil-evaluation-economics-pricing-s5',
    course_id:          'crude-oil-evaluation-economics-pricing',
    course_start_date:  '2027-07-05',
    course_end_date:    '2027-07-09',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'crude-oil-evaluation-economics-pricing-s6',
    course_id:          'crude-oil-evaluation-economics-pricing',
    course_start_date:  '2027-11-08',
    course_end_date:    '2027-11-12',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Eleventh course migrated (Phase 3D-3R). Business-confirmed sessions.
    course_session_id: 'drilling-hydraulics-design-s1',
    course_id:          'drilling-hydraulics-design',
    course_start_date:  '2026-07-13',
    course_end_date:    '2026-07-15',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-hydraulics-design-s2',
    course_id:          'drilling-hydraulics-design',
    course_start_date:  '2026-11-09',
    course_end_date:    '2026-11-11',
    course_location:    'Aberdeen',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-hydraulics-design-s3',
    course_id:          'drilling-hydraulics-design',
    course_start_date:  '2027-02-01',
    course_end_date:    '2027-02-03',
    course_location:    'Abu Dhabi',
    course_country:     'United Arab Emirates',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-hydraulics-design-s4',
    course_id:          'drilling-hydraulics-design',
    course_start_date:  '2027-07-12',
    course_end_date:    '2027-07-14',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-hydraulics-design-s5',
    course_id:          'drilling-hydraulics-design',
    course_start_date:  '2027-08-23',
    course_end_date:    '2027-08-25',
    course_location:    'Kuala Lumpur',
    course_country:     'Malaysia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'drilling-hydraulics-design-s6',
    course_id:          'drilling-hydraulics-design',
    course_start_date:  '2027-11-08',
    course_end_date:    '2027-11-10',
    course_location:    'Aberdeen',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Twelfth course migrated (Phase 3D-3S, final Group B1 migration). Business-confirmed sessions.
    course_session_id: 'petroleum-refining-non-technical-s1',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2026-09-08',
    course_end_date:    '2026-09-10',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s2',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2026-10-05',
    course_end_date:    '2026-10-07',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s3',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2026-10-27',
    course_end_date:    '2026-10-29',
    course_location:    'Rotterdam',
    course_country:     'Netherlands',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s4',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2026-12-01',
    course_end_date:    '2026-12-03',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s5',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2027-04-12',
    course_end_date:    '2027-04-14',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s6',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2027-05-24',
    course_end_date:    '2027-05-26',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s7',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2027-09-20',
    course_end_date:    '2027-09-22',
    course_location:    'Manama',
    course_country:     'Bahrain',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-refining-non-technical-s8',
    course_id:          'petroleum-refining-non-technical',
    course_start_date:  '2027-10-25',
    course_end_date:    '2027-10-27',
    course_location:    'Rotterdam',
    course_country:     'Netherlands',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    // Group B2.1 batch (Phase 3D-3T): petroleum_economics_fundamentals
    // cluster. A-tier confirmed sessions only.
    course_session_id: 'advanced-petroleum-economics-decision-analysis-s1',
    course_id:          'advanced-petroleum-economics-decision-analysis',
    course_start_date:  '2026-09-28',
    course_end_date:    '2026-10-02',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'advanced-petroleum-economics-decision-analysis-s2',
    course_id:          'advanced-petroleum-economics-decision-analysis',
    course_start_date:  '2026-10-19',
    course_end_date:    '2026-10-23',
    course_location:    'Kuala Lumpur',
    course_country:     'Malaysia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'advanced-petroleum-economics-decision-analysis-s3',
    course_id:          'advanced-petroleum-economics-decision-analysis',
    course_start_date:  '2026-11-02',
    course_end_date:    '2026-11-06',
    course_location:    'Houston',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-exploration-economics-decision-s1',
    course_id:          'petroleum-exploration-economics-decision',
    course_start_date:  '2026-08-18',
    course_end_date:    '2026-08-22',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-exploration-economics-decision-s2',
    course_id:          'petroleum-exploration-economics-decision',
    course_start_date:  '2026-09-14',
    course_end_date:    '2026-09-18',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-exploration-economics-decision-s3',
    course_id:          'petroleum-exploration-economics-decision',
    course_start_date:  '2026-11-16',
    course_end_date:    '2026-11-20',
    course_location:    'Singapore',
    course_country:     'Singapore',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-exploration-economics-decision-s4',
    course_id:          'petroleum-exploration-economics-decision',
    course_start_date:  '2027-02-08',
    course_end_date:    '2027-02-12',
    course_location:    'Manila',
    course_country:     'Philippines',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-project-economics-risk-s1',
    course_id:          'petroleum-project-economics-risk',
    course_start_date:  '2026-08-17',
    course_end_date:    '2026-08-21',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-project-economics-risk-s2',
    course_id:          'petroleum-project-economics-risk',
    course_start_date:  '2026-12-14',
    course_end_date:    '2026-12-18',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'petroleum-project-economics-risk-s3',
    course_id:          'petroleum-project-economics-risk',
    course_start_date:  '2027-03-01',
    course_end_date:    '2027-03-05',
    course_location:    'Manila',
    course_country:     'Philippines',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'mini-mba-oil-gas-energy-business-s1',
    course_id:          'mini-mba-oil-gas-energy-business',
    course_start_date:  '2026-09-07',
    course_end_date:    '2026-09-11',
    course_location:    'London',
    course_country:     'United Kingdom',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'mini-mba-oil-gas-energy-business-s2',
    course_id:          'mini-mba-oil-gas-energy-business',
    course_start_date:  '2026-11-09',
    course_end_date:    '2026-11-13',
    course_location:    'Miami',
    course_country:     'United States',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'mini-mba-oil-gas-energy-business-s3',
    course_id:          'mini-mba-oil-gas-energy-business',
    course_start_date:  '2026-11-23',
    course_end_date:    '2026-11-27',
    course_location:    'Rio de Janeiro',
    course_country:     'Brazil',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  },
  {
    course_session_id: 'oil-gas-fundamentals-s1',
    course_id:          'oil-gas-fundamentals',
    course_start_date:  '2026-10-19',
    course_end_date:    '2026-10-21',
    course_location:    'Kuala Lumpur',
    course_country:     'Malaysia',
    delivery_format:    'in_person',
    session_status:     'scheduled'
  }
];
