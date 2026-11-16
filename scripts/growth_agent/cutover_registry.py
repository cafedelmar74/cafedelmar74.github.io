"""Cutover overlap detection.

Given an event name, a dimension, and a comparison period, determines
whether that period overlaps a known measurement cutover for that
event/dimension combination (see config.CUTOVER_REGISTRY).
"""

from datetime import date
from typing import Optional

from . import config
from .schema import CutoverMatch


def _parse_date(value):
    if value is None:
        return None
    year, month, day = value.split("-")
    return date(int(year), int(month), int(day))


def _entry_applies(entry, event_name, dimension):
    events = entry["affected_scope"]["events"]
    dimensions = entry["affected_scope"]["dimensions"]
    if events != "all" and event_name not in events:
        return False
    if dimension not in dimensions:
        return False
    return True


def _period_overlaps_entry(entry, period_start, period_end):
    certainty = entry["date_certainty"]

    if certainty == "unknown":
        date_range = entry.get("date_range")
        if date_range is None:
            return True
        earliest = _parse_date(date_range[0])
        latest = _parse_date(date_range[1])
        return period_start <= latest and period_end >= earliest

    if certainty == "exact":
        cutover_date = _parse_date(entry.get("cutover_date"))
        if cutover_date is None:
            return True
        return period_start < cutover_date

    if certainty == "approximate":
        date_range = entry.get("date_range")
        if date_range is None:
            return True
        latest = _parse_date(date_range[1])
        return period_start < latest

    return True


def is_cutover_affected(event_name, dimension, period_start, period_end):
    for entry in config.CUTOVER_REGISTRY:
        if not _entry_applies(entry, event_name, dimension):
            continue
        if _period_overlaps_entry(entry, period_start, period_end):
            return CutoverMatch(affected=True, cutover_id=entry["cutover_id"])
    return CutoverMatch(affected=False, cutover_id=None)
