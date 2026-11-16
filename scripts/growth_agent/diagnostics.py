"""Descriptive-diagnostic cross-tabs: traffic vs conversion by course.

Null / "(not set)" course_id rows are excluded from both diagnostics per
the approved decision - they never enter course-level analysis, only
data_quality_flags (built in pipeline.py).
"""

from .schema import DiagnosticEntry, Evidence

MIN_PAGE_VIEWS_FOR_TRAFFIC_WITHOUT_CONVERSION = 10
MIN_COMMERCIAL_EVENTS_FOR_CONVERSION_WITHOUT_TRAFFIC = 1
MAX_PAGE_VIEWS_FOR_CONVERSION_WITHOUT_TRAFFIC = 5


def _commercial_totals_by_course(events_by_course):
    totals = {}
    for row in events_by_course:
        if row.course_id is None:
            continue
        if row.period != "current":
            continue
        bucket = totals.setdefault(row.course_id, {"event_count": 0, "course_name": row.course_name})
        bucket["event_count"] += row.event_count
    return totals


def detect_traffic_without_conversion(page_views_by_course, events_by_course):
    commercial_totals = _commercial_totals_by_course(events_by_course)
    entries = []
    for row in page_views_by_course:
        if row.course_id is None:
            continue
        if row.period != "current":
            continue
        if row.event_count < MIN_PAGE_VIEWS_FOR_TRAFFIC_WITHOUT_CONVERSION:
            continue
        commercial = commercial_totals.get(row.course_id, {"event_count": 0, "course_name": row.course_name})
        if commercial["event_count"] > 0:
            continue
        entries.append(DiagnosticEntry(
            course_id=row.course_id,
            course_name=row.course_name,
            evidence=[
                Evidence(metric="course_page_view.event_count", value=row.event_count, period="current", source="GA4"),
                Evidence(metric="commercial_event_count", value=0, period="current", source="GA4"),
            ],
            description="Course page received meaningful traffic with no recorded commercial events in the current period.",
        ))
    return entries


def detect_conversion_without_much_traffic(page_views_by_course, events_by_course):
    commercial_totals = _commercial_totals_by_course(events_by_course)
    page_views_by_id = {}
    for row in page_views_by_course:
        if row.course_id is None or row.period != "current":
            continue
        page_views_by_id[row.course_id] = row.event_count

    entries = []
    for course_id, commercial in commercial_totals.items():
        if commercial["event_count"] < MIN_COMMERCIAL_EVENTS_FOR_CONVERSION_WITHOUT_TRAFFIC:
            continue
        page_views = page_views_by_id.get(course_id, 0)
        if page_views > MAX_PAGE_VIEWS_FOR_CONVERSION_WITHOUT_TRAFFIC:
            continue
        entries.append(DiagnosticEntry(
            course_id=course_id,
            course_name=commercial["course_name"],
            evidence=[
                Evidence(metric="commercial_event_count", value=commercial["event_count"], period="current", source="GA4"),
                Evidence(metric="course_page_view.event_count", value=page_views, period="current", source="GA4"),
            ],
            description="Course generated commercial events with very little recorded page-view traffic in the current period.",
        ))
    return entries
