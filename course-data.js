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
  }
  // The four sessions found only in calendar-2027.html (25-27 Jan 2027 Dubai,
  // 26-28 Apr 2027 Lagos, 26-28 Jul 2027 Jakarta, 23-25 Aug 2027 London) are
  // deliberately NOT included here pending confirmation they are genuine
  // active/bookable sessions. Do not add them without that confirmation.
];
