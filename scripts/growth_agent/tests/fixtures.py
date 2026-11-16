"""Shared fixture-builder helpers for growth_agent tests.

Each helper has sensible defaults so a test only needs to override the
field(s) it actually cares about.
"""

from growth_agent.schema import (
    ReportMetadata,
    Totals,
    CommercialEventRow,
    CommercialEventByCourseRow,
    CommercialEventByIntentRow,
    CoursePageViewRow,
    GscQueryRow,
    IntelligenceModuleInput,
)


def make_report_metadata(
    current_start="2026-07-27",
    current_end="2026-08-23",
    previous_start="2026-06-29",
    previous_end="2026-07-26",
):
    return ReportMetadata(
        current_period_start=current_start,
        current_period_end=current_end,
        previous_period_start=previous_start,
        previous_period_end=previous_end,
        property_id="303311854",
        gsc_property="londonpetroacademy.co.uk",
    )


def make_totals(users=100, sessions=120, engaged_sessions=80):
    return Totals(users=users, sessions=sessions, engaged_sessions=engaged_sessions)


def make_commercial_event_row(
    event_name="booking_submitted", period="current", event_count=1, key_events=1, sessions=1, users=1
):
    return CommercialEventRow(
        event_name=event_name, period=period, event_count=event_count,
        key_events=key_events, sessions=sessions, users=users,
    )


def make_course_row(
    event_name="booking_submitted", course_id="demo-course", course_name="Demo Course",
    course_category="demo_category", event_count=1, sessions=1, users=1, key_events=1, period="current",
):
    return CommercialEventByCourseRow(
        event_name=event_name, course_id=course_id, course_name=course_name,
        course_category=course_category, event_count=event_count, sessions=sessions,
        users=users, key_events=key_events, period=period,
    )


def make_intent_row(
    event_name="enquiry_submitted", lead_intent="corporate_training",
    event_count=1, key_events=1, sessions=1, users=1, period="current",
):
    return CommercialEventByIntentRow(
        event_name=event_name, lead_intent=lead_intent, event_count=event_count,
        key_events=key_events, sessions=sessions, users=users, period=period,
    )


def make_page_view_row(
    course_id="demo-course", course_name="Demo Course", event_count=10, sessions=8, users=6, period="current"
):
    return CoursePageViewRow(
        course_id=course_id, course_name=course_name, event_count=event_count,
        sessions=sessions, users=users, period=period,
    )


def make_gsc_row(
    query="demo query", page="/course-demo.html", impressions=400, clicks=1,
    ctr=0.0025, average_position=6.0, period="current",
):
    return GscQueryRow(
        query=query, page=page, impressions=impressions, clicks=clicks,
        ctr=ctr, average_position=average_position, period=period,
    )


def make_minimal_input(
    commercial_events=None,
    commercial_events_by_course=None,
    commercial_events_by_intent=None,
    course_page_views_by_course=None,
    gsc_queries=None,
    report_metadata=None,
):
    return IntelligenceModuleInput(
        report_metadata=report_metadata or make_report_metadata(),
        totals_current=make_totals(),
        totals_previous=make_totals(users=0, sessions=0, engaged_sessions=0),
        commercial_events=commercial_events or [],
        commercial_events_by_course=commercial_events_by_course or [],
        commercial_events_by_intent=commercial_events_by_intent or [],
        course_page_views_by_course=course_page_views_by_course or [],
        gsc_queries=gsc_queries or [],
    )
