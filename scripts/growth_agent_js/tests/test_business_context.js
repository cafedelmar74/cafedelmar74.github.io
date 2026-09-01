"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const bc = require("../business_context.js");

const REAL_DATA_PATH = "/Users/tariktobbichi/Documents/GitHub/cafedelmar74.github.io/data/lpa-course-data.json";
const realCourseData = JSON.parse(fs.readFileSync(REAL_DATA_PATH, "utf8"));

function makeCourse(overrides) {
  return Object.assign(
    {
      course_id: "test-course",
      course_name: "Test Course",
      course_category: "test_category",
      calendar_category: "upstream",
      status: "active",
    },
    overrides
  );
}

function makeSession(overrides) {
  return Object.assign(
    {
      course_session_id: "test-course-s1",
      course_id: "test-course",
      course_start_date: "2026-10-01",
      course_end_date: "2026-10-03",
      course_location: "London",
      course_country: "United Kingdom",
      delivery_format: "in_person",
      session_status: "scheduled",
    },
    overrides
  );
}

// =============================================================================
// 1. Real dataset smoke test
// =============================================================================

test("real dataset: 37 courses, 129 sessions, all 37 courses appear exactly once", () => {
  assert.equal(realCourseData.courses.length, 37);
  assert.equal(realCourseData.sessions.length, 129);

  const result = bc.buildBusinessContext(realCourseData, "2026-09-01");
  assert.equal(result.business_context.courses.length, 37);

  const seenIds = result.business_context.courses.map((c) => c.course_id);
  assert.equal(new Set(seenIds).size, 37);

  const sourceIds = new Set(realCourseData.courses.map((c) => c.course_id));
  for (const id of seenIds) assert.ok(sourceIds.has(id), "unexpected course_id: " + id);
  for (const id of sourceIds) assert.ok(seenIds.includes(id), "missing course_id: " + id);
});

// =============================================================================
// 2. Determinism
// =============================================================================

test("determinism: same courseData + same referenceDate produces deep-identical output twice", () => {
  const result1 = bc.buildBusinessContext(realCourseData, "2026-09-01");
  const result2 = bc.buildBusinessContext(realCourseData, "2026-09-01");
  assert.deepStrictEqual(result1, result2);
  assert.equal(JSON.stringify(result1), JSON.stringify(result2));
});

// =============================================================================
// 3. Zero-session course
// =============================================================================

test("zero-session course (world-fiscal-systems-unconventional): no crash, all-empty/false", () => {
  const result = bc.buildBusinessContext(realCourseData, "2026-09-01");
  const course = result.business_context.courses.find((c) => c.course_id === "world-fiscal-systems-unconventional");
  assert.ok(course, "course not found in output");
  assert.equal(course.has_upcoming_session, false);
  assert.equal(course.has_in_progress_session, false);
  assert.equal(course.next_session, null);
  assert.deepStrictEqual(course.upcoming_sessions, []);
  assert.deepStrictEqual(course.upcoming_countries, []);
  assert.deepStrictEqual(course.upcoming_delivery_formats, []);
  assert.equal(course.upcoming_session_count, 0);
  assert.equal(course.in_progress_session_count, 0);
  assert.equal(course.past_session_count, 0);
});

// =============================================================================
// 4. Multiple-session course: earliest upcoming selected, deterministic ties
// =============================================================================

test("multiple-session course: earliest upcoming session selected as next_session", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "multi" })],
    sessions: [
      makeSession({ course_session_id: "multi-s3", course_id: "multi", course_start_date: "2026-12-01", course_end_date: "2026-12-03" }),
      makeSession({ course_session_id: "multi-s1", course_id: "multi", course_start_date: "2026-10-01", course_end_date: "2026-10-03" }),
      makeSession({ course_session_id: "multi-s2", course_id: "multi", course_start_date: "2026-11-01", course_end_date: "2026-11-03" }),
    ],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.next_session.course_session_id, "multi-s1");
  assert.equal(course.upcoming_session_count, 3);
  assert.deepStrictEqual(
    course.upcoming_sessions.map((s) => s.course_session_id),
    ["multi-s1", "multi-s2", "multi-s3"]
  );
});

test("multiple-session course: tie on identical start dates broken by course_session_id", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "tie" })],
    sessions: [
      makeSession({ course_session_id: "tie-s-b", course_id: "tie", course_start_date: "2026-10-01", course_end_date: "2026-10-03" }),
      makeSession({ course_session_id: "tie-s-a", course_id: "tie", course_start_date: "2026-10-01", course_end_date: "2026-10-03" }),
    ],
  };
  const result1 = bc.buildBusinessContext(courseData, "2026-09-01");
  const result2 = bc.buildBusinessContext(courseData, "2026-09-01");
  assert.equal(result1.business_context.courses[0].next_session.course_session_id, "tie-s-a");
  assert.deepStrictEqual(result1, result2);
});

// =============================================================================
// 5. Exact start-date boundary
// =============================================================================

test("session starting exactly on referenceDate counts as upcoming with days_until_start = 0", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "boundary" })],
    sessions: [makeSession({ course_session_id: "boundary-s1", course_id: "boundary", course_start_date: "2026-09-01", course_end_date: "2026-09-03" })],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.has_upcoming_session, true);
  assert.equal(course.next_session.days_until_start, 0);
  assert.equal(course.next_session.urgency_window, "next_30_days");
});

// =============================================================================
// 6. In-progress session
// =============================================================================

test("in-progress session (start < referenceDate <= end): flagged, excluded from upcoming/next/past", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "inprog" })],
    sessions: [makeSession({ course_session_id: "inprog-s1", course_id: "inprog", course_start_date: "2026-08-30", course_end_date: "2026-09-02" })],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.has_in_progress_session, true);
  assert.equal(course.in_progress_session_count, 1);
  assert.equal(course.has_upcoming_session, false);
  assert.equal(course.next_session, null);
  assert.equal(course.past_session_count, 0);
});

test("in-progress session where referenceDate equals course_end_date exactly is still in_progress, not past", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "inprog2" })],
    sessions: [makeSession({ course_session_id: "inprog2-s1", course_id: "inprog2", course_start_date: "2026-08-30", course_end_date: "2026-09-01" })],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.has_in_progress_session, true);
  assert.equal(course.past_session_count, 0);
});

// =============================================================================
// 7. Past session
// =============================================================================

test("past session (end_date < referenceDate): counted as past, excluded from upcoming/in-progress", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "pastc" })],
    sessions: [makeSession({ course_session_id: "pastc-s1", course_id: "pastc", course_start_date: "2026-06-01", course_end_date: "2026-06-03" })],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.past_session_count, 1);
  assert.equal(course.has_upcoming_session, false);
  assert.equal(course.has_in_progress_session, false);
});

// =============================================================================
// 8. Urgency boundaries
// =============================================================================

test("urgency window boundaries: 30/31/90/91/180/181 days map correctly", () => {
  const cases = [
    { days: 30, expected: "next_30_days" },
    { days: 31, expected: "31_90_days" },
    { days: 90, expected: "31_90_days" },
    { days: 91, expected: "91_180_days" },
    { days: 180, expected: "91_180_days" },
    { days: 181, expected: "beyond_180_days" },
  ];
  const referenceDate = "2026-09-01";
  for (const { days, expected } of cases) {
    const startMs = Date.UTC(2026, 8, 1) + days * 86400000;
    const startDate = new Date(startMs).toISOString().slice(0, 10);
    const courseData = {
      courses: [makeCourse({ course_id: "u-" + days })],
      sessions: [makeSession({ course_session_id: "u-" + days + "-s1", course_id: "u-" + days, course_start_date: startDate, course_end_date: startDate })],
    };
    const result = bc.buildBusinessContext(courseData, referenceDate);
    const course = result.business_context.courses[0];
    assert.equal(course.next_session.days_until_start, days, "days mismatch for " + days);
    assert.equal(course.next_session.urgency_window, expected, "window mismatch for " + days + " days");
  }
});

// =============================================================================
// 9. offers_on_request / offers_in_house preserved independently
// =============================================================================

test("offers_on_request/offers_in_house preserved even with no upcoming session", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "onreq", offers_on_request: true })],
    sessions: [],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.has_upcoming_session, false);
  assert.equal(course.offers_on_request, true);
  assert.equal(course.offers_in_house, false);
});

test("offers_in_house true is preserved alongside an upcoming session", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "inhouse", offers_in_house: true })],
    sessions: [makeSession({ course_session_id: "inhouse-s1", course_id: "inhouse", course_start_date: "2026-10-01", course_end_date: "2026-10-03" })],
  };
  const result = bc.buildBusinessContext(courseData, "2026-09-01");
  const course = result.business_context.courses[0];
  assert.equal(course.has_upcoming_session, true);
  assert.equal(course.offers_in_house, true);
});

// =============================================================================
// 10. Input immutability
// =============================================================================

test("buildBusinessContext does not mutate courseData", () => {
  const courseData = {
    courses: [makeCourse({ course_id: "immut" })],
    sessions: [
      makeSession({ course_session_id: "immut-s2", course_id: "immut", course_start_date: "2026-11-01", course_end_date: "2026-11-03" }),
      makeSession({ course_session_id: "immut-s1", course_id: "immut", course_start_date: "2026-10-01", course_end_date: "2026-10-03" }),
    ],
  };
  const before = JSON.parse(JSON.stringify(courseData));
  bc.buildBusinessContext(courseData, "2026-09-01");
  assert.deepStrictEqual(courseData, before);
});

test("buildBusinessContext does not mutate the real dataset", () => {
  const before = JSON.parse(JSON.stringify(realCourseData));
  bc.buildBusinessContext(realCourseData, "2026-09-01");
  assert.deepStrictEqual(realCourseData, before);
});

// =============================================================================
// Summary block checks
// =============================================================================

test("summary arrays are deterministically sorted and all four urgency-window keys are present", () => {
  const result = bc.buildBusinessContext(realCourseData, "2026-09-01");
  const summary = result.business_context.summary;

  const isSorted = (arr) => arr.every((v, i) => i === 0 || arr[i - 1] <= v);
  assert.ok(isSorted(summary.courses_with_no_upcoming_session));
  assert.ok(isSorted(summary.active_countries));
  assert.ok(isSorted(summary.active_cities));
  assert.ok(isSorted(summary.courses_by_urgency_window.next_30_days));
  assert.ok(isSorted(summary.courses_by_urgency_window["31_90_days"]));
  assert.ok(isSorted(summary.courses_by_urgency_window["91_180_days"]));
  assert.ok(isSorted(summary.courses_by_urgency_window.beyond_180_days));

  assert.ok(Object.prototype.hasOwnProperty.call(summary.courses_by_urgency_window, "next_30_days"));
  assert.ok(Object.prototype.hasOwnProperty.call(summary.courses_by_urgency_window, "31_90_days"));
  assert.ok(Object.prototype.hasOwnProperty.call(summary.courses_by_urgency_window, "91_180_days"));
  assert.ok(Object.prototype.hasOwnProperty.call(summary.courses_by_urgency_window, "beyond_180_days"));
});

test("no course appears in more than one urgency-window bucket, and every course with an upcoming session appears in exactly one", () => {
  const result = bc.buildBusinessContext(realCourseData, "2026-09-01");
  const summary = result.business_context.summary;
  const allBucketed = [
    ...summary.courses_by_urgency_window.next_30_days,
    ...summary.courses_by_urgency_window["31_90_days"],
    ...summary.courses_by_urgency_window["91_180_days"],
    ...summary.courses_by_urgency_window.beyond_180_days,
  ];
  assert.equal(new Set(allBucketed).size, allBucketed.length, "a course appears in more than one urgency window");

  const coursesWithUpcoming = result.business_context.courses.filter((c) => c.has_upcoming_session).map((c) => c.course_id);
  assert.deepStrictEqual([...allBucketed].sort(), [...coursesWithUpcoming].sort());
});

test("courses_with_no_upcoming_session and courses appearing in an urgency window are mutually exclusive and jointly exhaustive", () => {
  const result = bc.buildBusinessContext(realCourseData, "2026-09-01");
  const summary = result.business_context.summary;
  const noUpcoming = new Set(summary.courses_with_no_upcoming_session);
  const allCourseIds = result.business_context.courses.map((c) => c.course_id);
  for (const id of allCourseIds) {
    const hasUpcoming = result.business_context.courses.find((c) => c.course_id === id).has_upcoming_session;
    assert.equal(noUpcoming.has(id), !hasUpcoming);
  }
});
