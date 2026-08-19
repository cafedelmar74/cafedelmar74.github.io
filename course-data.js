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
  }
];
