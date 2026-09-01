"use strict";

// Pure derivation of weekly business_context from the canonical, exported
// course/session dataset (data/lpa-course-data.json). Reads only courseData
// and an explicit referenceDate - no system clock, no filesystem, no
// network, no mutation of the input, no invented commercial/revenue/
// booking/capacity signals.

const URGENCY_WINDOWS = [
  { key: "next_30_days", min: 0, max: 30 },
  { key: "31_90_days", min: 31, max: 90 },
  { key: "91_180_days", min: 91, max: 180 },
  { key: "beyond_180_days", min: 181, max: Infinity },
];

const MS_PER_DAY = 86400000;

function parseIsoDateUTC(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function daysBetween(fromIsoDate, toIsoDate) {
  return Math.round((parseIsoDateUTC(toIsoDate) - parseIsoDateUTC(fromIsoDate)) / MS_PER_DAY);
}

function urgencyWindowFor(daysUntilStart) {
  for (const window of URGENCY_WINDOWS) {
    if (daysUntilStart >= window.min && daysUntilStart <= window.max) return window.key;
  }
  return URGENCY_WINDOWS[URGENCY_WINDOWS.length - 1].key;
}

// upcoming: course_start_date >= referenceDate (includes exactly referenceDate)
// in_progress: course_start_date < referenceDate AND course_end_date >= referenceDate
// past: course_end_date < referenceDate
function classifySession(session, referenceDate) {
  if (session.course_start_date >= referenceDate) return "upcoming";
  if (session.course_end_date >= referenceDate) return "in_progress";
  return "past";
}

function compareSessionsByStartThenId(a, b) {
  if (a.course_start_date < b.course_start_date) return -1;
  if (a.course_start_date > b.course_start_date) return 1;
  if (a.course_session_id < b.course_session_id) return -1;
  if (a.course_session_id > b.course_session_id) return 1;
  return 0;
}

function uniqueSorted(values) {
  return [...new Set(values.filter((v) => v !== undefined && v !== null))].sort();
}

function buildNextSession(session, referenceDate) {
  const daysUntilStart = daysBetween(referenceDate, session.course_start_date);
  return {
    course_session_id: session.course_session_id,
    course_start_date: session.course_start_date,
    course_end_date: session.course_end_date,
    course_location: session.course_location,
    course_country: session.course_country,
    delivery_format: session.delivery_format,
    days_until_start: daysUntilStart,
    urgency_window: urgencyWindowFor(daysUntilStart),
  };
}

function buildSessionSummary(session) {
  return {
    course_session_id: session.course_session_id,
    course_start_date: session.course_start_date,
    course_end_date: session.course_end_date,
    course_location: session.course_location,
    course_country: session.course_country,
    delivery_format: session.delivery_format,
  };
}

function buildCourseContext(course, sessionsForCourse, referenceDate) {
  const upcoming = [];
  const inProgress = [];
  const past = [];

  for (const session of sessionsForCourse) {
    const bucket = classifySession(session, referenceDate);
    if (bucket === "upcoming") upcoming.push(session);
    else if (bucket === "in_progress") inProgress.push(session);
    else past.push(session);
  }

  upcoming.sort(compareSessionsByStartThenId);

  const nextSession = upcoming.length > 0 ? buildNextSession(upcoming[0], referenceDate) : null;
  const upcomingSessions = upcoming.map(buildSessionSummary);
  const upcomingCountries = uniqueSorted(upcoming.map((s) => s.course_country));
  const upcomingDeliveryFormats = uniqueSorted(upcoming.map((s) => s.delivery_format));

  return {
    course_id: course.course_id,
    course_name: course.course_name,
    course_category: course.course_category,
    calendar_category: course.calendar_category,
    status: course.status,
    offers_in_house: course.offers_in_house === true,
    offers_on_request: course.offers_on_request === true,
    has_upcoming_session: upcoming.length > 0,
    upcoming_session_count: upcoming.length,
    has_in_progress_session: inProgress.length > 0,
    in_progress_session_count: inProgress.length,
    past_session_count: past.length,
    next_session: nextSession,
    upcoming_sessions: upcomingSessions,
    upcoming_countries: upcomingCountries,
    upcoming_delivery_formats: upcomingDeliveryFormats,
  };
}

function buildBusinessContext(courseData, referenceDate) {
  const courses = courseData.courses || [];
  const sessions = courseData.sessions || [];

  const sessionsByCourseId = new Map();
  for (const session of sessions) {
    if (!sessionsByCourseId.has(session.course_id)) sessionsByCourseId.set(session.course_id, []);
    sessionsByCourseId.get(session.course_id).push(session);
  }

  const courseIdsWithNoUpcoming = [];
  const byUrgencyWindow = {
    next_30_days: [],
    "31_90_days": [],
    "91_180_days": [],
    beyond_180_days: [],
  };
  const allUpcomingCountries = [];
  const allUpcomingCities = [];

  const outCourses = courses.map((course) => {
    const sessionsForCourse = sessionsByCourseId.get(course.course_id) || [];
    const ctx = buildCourseContext(course, sessionsForCourse, referenceDate);

    if (!ctx.has_upcoming_session) {
      courseIdsWithNoUpcoming.push(course.course_id);
    } else {
      byUrgencyWindow[ctx.next_session.urgency_window].push(course.course_id);
    }

    for (const country of ctx.upcoming_countries) allUpcomingCountries.push(country);
    for (const session of ctx.upcoming_sessions) allUpcomingCities.push(session.course_location);

    return ctx;
  });

  const summary = {
    courses_with_no_upcoming_session: uniqueSorted(courseIdsWithNoUpcoming),
    courses_by_urgency_window: {
      next_30_days: uniqueSorted(byUrgencyWindow.next_30_days),
      "31_90_days": uniqueSorted(byUrgencyWindow["31_90_days"]),
      "91_180_days": uniqueSorted(byUrgencyWindow["91_180_days"]),
      beyond_180_days: uniqueSorted(byUrgencyWindow.beyond_180_days),
    },
    active_countries: uniqueSorted(allUpcomingCountries),
    active_cities: uniqueSorted(allUpcomingCities),
  };

  return {
    business_context: {
      reference_date: referenceDate,
      courses: outCourses,
      summary,
    },
  };
}

module.exports = {
  buildBusinessContext,
  urgencyWindowFor,
  daysBetween,
  classifySession,
};
