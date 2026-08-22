#!/usr/bin/env python3
"""Permanent validator for the LPA central course/session architecture."""

import glob
import os
import re
import sys
from datetime import date


def resolve_repo_root():
    args = sys.argv[1:]
    if "--repo-root" in args:
        idx = args.index("--repo-root")
        if idx + 1 < len(args):
            return os.path.abspath(args[idx + 1])
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


REPO_ROOT = resolve_repo_root()

REDIRECT_STUB_PAGES = {"course-battery-economics-business-models.html"}
CALENDAR_INJECTION_EXCEPTIONS = {"world-fiscal-systems-unconventional"}

ALLOWED_COURSE_STATUS = {"active"}
ALLOWED_SESSION_STATUS = {"scheduled"}
ALLOWED_DELIVERY_FORMAT = {"in_person", "virtual"}
ALLOWED_REQUEST_TYPE = {"in_house", "on_request"}
FORBIDDEN_DELIVERY_FORMAT_VALUES = {"in_house", "on_request", "tbc_on_request"}

REQUIRED_COURSE_FIELDS = ["course_id", "course_name", "course_category",
                          "calendar_category", "page_path", "status"]
REQUIRED_SESSION_FIELDS = ["course_session_id", "course_id", "course_start_date",
                           "course_end_date", "delivery_format", "session_status"]

REMOVED_LEGACY_SYMBOLS = ["LPA_enrichBookingSession", "LPA_parseSessionLocation",
                          "LPA_COUNTRY_NORMALIZE", "LPA_SINGLE_LOCATION_COUNTRY"]

MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun",
              "jul", "aug", "sep", "oct", "nov", "dec"]


class Results:
    def __init__(self):
        self.entries = []

    def ok(self, category, message):
        self.entries.append((category, "PASS", message))

    def warn(self, category, message):
        self.entries.append((category, "WARN", message))

    def fail(self, category, message):
        self.entries.append((category, "FAIL", message))


def where(file=None, course_id=None):
    parts = []
    if file:
        parts.append("file: " + file)
    if course_id:
        parts.append("course_id: " + course_id)
    if not parts:
        return ""
    return "[" + "] [".join(parts) + "] "


def read(relpath):
    full = os.path.join(REPO_ROOT, relpath)
    with open(full, "r", encoding="utf-8") as f:
        return f.read()


def parse_array_block(content, array_name):
    pattern = r"(?:var\s+)?" + re.escape(array_name) + r"\s*=\s*\[(.*?)\n\];"
    m = re.search(pattern, content, re.S)
    if m:
        return m.group(1)
    return ""


def parse_objects(block):
    return re.findall(r"\{[^{}]*\}", block, re.S)


def field(obj, name):
    m = re.search(re.escape(name) + r":\s*'((?:[^'\\]|\\.)*)'", obj)
    if m:
        return m.group(1)
    return None


def has_field(obj, name):
    if re.search(re.escape(name) + r":\s*'", obj):
        return True
    if re.search(re.escape(name) + r":\s*(true|false)\b", obj):
        return True
    return False


def bool_field(obj, name):
    return re.search(re.escape(name) + r":\s*true\b", obj) is not None


def validate_course_session_data(r):
    cat = "Course Data Integrity"
    cdata = read("course-data.js")
    cblock = parse_array_block(cdata, "LPA_COURSES")
    sblock = parse_array_block(cdata, "LPA_SESSIONS")
    courses = parse_objects(cblock)
    sessions = parse_objects(sblock)
    cids = [field(o, "course_id") for o in courses]
    sids = [field(o, "course_session_id") for o in sessions]

    dupe_c = {x for x in cids if cids.count(x) > 1}
    if dupe_c:
        for d in sorted(dupe_c):
            r.fail(cat, f"{where(file='course-data.js', course_id=d)}duplicate course_id")
    else:
        r.ok(cat, f"{len(cids)} unique course IDs")

    n_missing = 0
    for o in courses:
        cid = field(o, "course_id") or "?"
        for fn in REQUIRED_COURSE_FIELDS:
            if not has_field(o, fn):
                r.fail(cat, f"{where(file='course-data.js', course_id=cid)}missing field {fn}")
                n_missing += 1
    if n_missing == 0:
        r.ok(cat, f"all {len(courses)} courses have required fields")

    n_status = 0
    for o in courses:
        cid = field(o, "course_id") or "?"
        st = field(o, "status")
        if st not in ALLOWED_COURSE_STATUS:
            r.fail(cat, f"{where(file='course-data.js', course_id=cid)}bad status {st}")
            n_status += 1
    if n_status == 0:
        r.ok(cat, "all course status values allowed")

    n_path = 0
    for o in courses:
        cid = field(o, "course_id") or "?"
        p = field(o, "page_path")
        if p and not os.path.isfile(os.path.join(REPO_ROOT, p.lstrip("/"))):
            r.fail(cat, f"{where(file='course-data.js', course_id=cid)}page_path {p} missing")
            n_path += 1
    if n_path == 0:
        r.ok(cat, f"all {len(courses)} page_path values resolve")

    dupe_s = {x for x in sids if sids.count(x) > 1}
    if dupe_s:
        for d in sorted(dupe_s):
            r.fail(cat, f"{where(file='course-data.js')}duplicate session_id {d}")
    else:
        r.ok(cat, f"{len(sids)} unique session IDs")

    cid_set = set(cids)
    n_orphan = 0
    for o in sessions:
        sid = field(o, "course_session_id") or "?"
        cid = field(o, "course_id")
        if cid not in cid_set:
            r.fail(cat, f"{where(file='course-data.js')}session {sid} orphan course_id {cid}")
            n_orphan += 1
    if n_orphan == 0:
        r.ok(cat, "0 orphan sessions")

    n_sfield = 0
    for o in sessions:
        sid = field(o, "course_session_id") or "?"
        for fn in REQUIRED_SESSION_FIELDS:
            if not has_field(o, fn):
                r.fail(cat, f"{where(file='course-data.js')}session {sid} missing field {fn}")
                n_sfield += 1
    if n_sfield == 0:
        r.ok(cat, f"all {len(sessions)} sessions have required fields")

    n_fmt = 0
    for o in sessions:
        sid = field(o, "course_session_id") or "?"
        fmt = field(o, "delivery_format")
        if fmt not in ALLOWED_DELIVERY_FORMAT:
            r.fail(cat, f"{where(file='course-data.js')}session {sid} bad delivery_format {fmt}")
            n_fmt += 1
    if n_fmt == 0:
        r.ok(cat, "all delivery_format values allowed")

    n_sstatus = 0
    for o in sessions:
        sid = field(o, "course_session_id") or "?"
        st = field(o, "session_status")
        if st not in ALLOWED_SESSION_STATUS:
            r.fail(cat, f"{where(file='course-data.js')}session {sid} bad session_status {st}")
            n_sstatus += 1
    if n_sstatus == 0:
        r.ok(cat, "all session_status values allowed")

    n_date = 0
    for o in sessions:
        sid = field(o, "course_session_id") or "?"
        sr = field(o, "course_start_date")
        er = field(o, "course_end_date")
        sdt = edt = None
        try:
            sdt = date.fromisoformat(sr)
        except (TypeError, ValueError):
            r.fail(cat, f"{where(file='course-data.js')}session {sid} bad start_date {sr}")
            n_date += 1
        try:
            edt = date.fromisoformat(er)
        except (TypeError, ValueError):
            r.fail(cat, f"{where(file='course-data.js')}session {sid} bad end_date {er}")
            n_date += 1
        if sdt and edt and edt < sdt:
            r.fail(cat, f"{where(file='course-data.js')}session {sid} end before start")
            n_date += 1
    if n_date == 0:
        r.ok(cat, "all session dates valid and ordered")

    n_tz = 0
    for o in sessions:
        sid = field(o, "course_session_id") or "?"
        if field(o, "delivery_format") == "virtual" and not has_field(o, "virtual_timezone"):
            r.warn(cat, f"{where(file='course-data.js')}virtual session {sid} missing virtual_timezone")
            n_tz += 1
    if n_tz == 0:
        r.ok(cat, "all virtual sessions have virtual_timezone")

    return courses, sessions, cblock, sblock


def validate_course_pages(r, courses, sessions):
    cat = "Course Page Architecture"
    all_html = sorted(os.path.basename(p) for p in glob.glob(os.path.join(REPO_ROOT, "course-*.html")))
    real_pages = sorted(set(all_html) - REDIRECT_STUB_PAGES)

    for stub in REDIRECT_STUB_PAGES:
        if stub in all_html:
            r.warn(cat, f"{where(file=stub)}excluded as known redirect stub")

    cpaths = {}
    path_owners = {}
    for o in courses:
        cid = field(o, "course_id")
        p = field(o, "page_path")
        if not p:
            continue
        key = p.lstrip("/")
        path_owners.setdefault(key, []).append(cid)
        cpaths[key] = cid

    dup_paths = 0
    for key, owners in path_owners.items():
        if len(owners) > 1:
            r.fail(cat, f"page_path {key} claimed by {owners}")
            dup_paths += 1
    if dup_paths == 0:
        r.ok(cat, "every page_path claimed by exactly one course")

    no_record = sorted(set(real_pages) - set(cpaths))
    no_page = sorted(set(cpaths) - set(real_pages))
    for p in no_record:
        r.fail(cat, f"{where(file=p)}page has no LPA_COURSES record")
    for p in no_page:
        r.fail(cat, f"{where(file=p, course_id=cpaths.get(p))}page_path has no real page")
    if not no_record and not no_page:
        r.ok(cat, f"{len(real_pages)}/{len(real_pages)} pages covered bidirectionally")

    sessions_by_cid = {}
    for o in sessions:
        cid = field(o, "course_id")
        sessions_by_cid[cid] = sessions_by_cid.get(cid, 0) + 1

    course_by_id = {}
    for o in courses:
        course_by_id[field(o, "course_id")] = o

    no_cc = []
    bad_order = []
    no_ga4 = []
    bad_opts = []
    arch_bad = []

    for page in real_pages:
        content = read(page)
        cid = cpaths.get(page, "?")

        if "var LPA_CURRENT_COURSE" not in content:
            no_cc.append(page)
            r.fail(cat, f"{where(file=page, course_id=cid)}no LPA_CURRENT_COURSE declared")
            continue

        cd_idx = content.find('src="course-data.js"')
        cfg_idx = content.find('src="config.js"')
        if cd_idx == -1 or cfg_idx == -1 or cd_idx > cfg_idx:
            bad_order.append(page)
            r.fail(cat, f"{where(file=page, course_id=cid)}script order wrong")

        if "LPA_track('booking_submitted', Object.assign(" not in content:
            no_ga4.append(page)
            r.fail(cat, f"{where(file=page, course_id=cid)}booking_submitted not using Object.assign")

        sel_m = re.search(r'<select class="bkfi" id="bkSes">(.*?)</select>', content, re.S)
        if sel_m:
            n_opts = len(re.findall(r"<option", sel_m.group(1)))
            if n_opts != 1:
                bad_opts.append(page)
                r.fail(cat, f"{where(file=page, course_id=cid)}#bkSes has {n_opts} static options")
        else:
            r.warn(cat, f"{where(file=page, course_id=cid)}no #bkSes block found")

        has_sessions = sessions_by_cid.get(cid, 0) > 0
        course_obj = course_by_id.get(cid, "")
        is_nonsession = bool_field(course_obj, "offers_on_request") or bool_field(course_obj, "offers_in_house")
        has_session_refs = "LPA_sessionById" in content and "LPA_sessionSnapshot" in content

        if has_sessions:
            if not has_session_refs:
                arch_bad.append(page)
                r.fail(cat, f"{where(file=page, course_id=cid)}missing central session functions")
        elif is_nonsession:
            has_request_type = "request_type" in content
            if not has_request_type and not has_session_refs:
                arch_bad.append(page)
                r.fail(cat, f"{where(file=page, course_id=cid)}missing non-session architecture evidence")
            else:
                r.ok(cat, f"{where(file=page, course_id=cid)}zero-session non-dated architecture confirmed")
        else:
            arch_bad.append(page)
            r.fail(cat, f"{where(file=page, course_id=cid)}zero sessions with no offers_on_request/offers_in_house")

    if not no_cc:
        r.ok(cat, f"all {len(real_pages)} pages declare LPA_CURRENT_COURSE")
    if not bad_order:
        r.ok(cat, "course-data.js loads before config.js everywhere")
    if not no_ga4:
        r.ok(cat, "all pages use central Object.assign booking_submitted")
    if not bad_opts:
        r.ok(cat, "no static booking options beyond placeholder")
    if not arch_bad:
        r.ok(cat, "all pages show correct architecture evidence for their session shape")

    return real_pages, cpaths


def extract_injected_ids(content):
    ids = set(re.findall(r"LPA_legacyCalendarRowsForCourse\('([a-z0-9-]+)'", content))
    ids |= set(re.findall(r"LPA_legacyCalendarRowsForCourse\(\s*\n\s*'([a-z0-9-]+)'", content))
    return ids


def validate_calendars(r, courses, sessions):
    cat = "Calendar Integrity"
    cal26 = read("calendar-2026.html")
    cal27 = read("calendar-2027.html")

    all_cids = {field(o, "course_id") for o in courses}
    page_by_cid = {field(o, "course_id"): field(o, "page_path") for o in courses}
    inj26 = extract_injected_ids(cal26)
    inj27 = extract_injected_ids(cal27)

    for fname, inj in (("calendar-2026.html", inj26), ("calendar-2027.html", inj27)):
        missing = all_cids - inj
        undoc = missing - CALENDAR_INJECTION_EXCEPTIONS
        doc = missing & CALENDAR_INJECTION_EXCEPTIONS
        for cid in sorted(doc):
            r.warn(cat, f"{where(file=fname, course_id=cid)}no injection call, documented exception")
        for cid in sorted(undoc):
            r.fail(cat, f"{where(file=fname, course_id=cid)}has LPA_COURSES record but no injection call")
        if not undoc:
            r.ok(cat, f"{fname}: injection coverage matches LPA_COURSES")

    row_re = re.compile(
        r"\{month:'[a-z]+',cat:'[a-z]+',fmt:'[a-z]+',title:'[^']*',"
        r"dates:'[^']*',loc:'[^']*',url:'[^']*',tag:'[^']*'\}"
    )
    for fname, c in (("calendar-2026.html", cal26), ("calendar-2027.html", cal27)):
        rows = row_re.findall(c)
        seen = {}
        dupes = []
        for row in rows:
            seen[row] = seen.get(row, 0) + 1
            if seen[row] == 2:
                dupes.append(row[:100])
        if dupes:
            for d in dupes:
                r.fail(cat, f"{where(file=fname)}duplicate row: {d}")
        else:
            r.ok(cat, f"{fname}: no duplicate rows ({len(rows)} total)")

    n_stale = 0
    n_nopagepath = 0
    for o in sessions:
        cid = field(o, "course_id")
        start = field(o, "course_start_date")
        if not start or len(start) < 10:
            continue
        year = start[0:4]
        month_idx = int(start[5:7]) - 1
        day = int(start[8:10])
        mabbr = MONTH_ABBR[month_idx]
        fname = f"calendar-{year}.html"
        if fname not in ("calendar-2026.html", "calendar-2027.html"):
            continue

        page_path = page_by_cid.get(cid)
        if not page_path:
            sid = field(o, "course_session_id")
            r.fail(cat, f"{where(file='course-data.js', course_id=cid)}session {sid} has no page_path mapping")
            n_nopagepath += 1
            continue
        page_file = page_path.lstrip("/")

        c = cal26 if fname == "calendar-2026.html" else cal27
        pat = re.compile(
            r"\{month:'" + mabbr + r"',cat:'[a-z]+',fmt:'[a-z]+',title:'[^']*',"
            r"dates:'([^']*)',loc:'[^']*',url:'" + re.escape(page_file) + r"',tag:'[^']*'\}"
        )
        for m in pat.finditer(c):
            num_m = re.search(r"\d+", m.group(1))
            if num_m and int(num_m.group(0)) == day:
                sid = field(o, "course_session_id")
                r.fail(cat, f"{where(file=fname, course_id=cid)}stale row duplicates session {sid} ({start})")
                n_stale += 1
    if n_stale == 0 and n_nopagepath == 0:
        r.ok(cat, "no stale rows duplicating real sessions")

    only26 = inj26 - inj27
    only27 = inj27 - inj26
    if only26 or only27:
        if only26:
            r.fail(cat, f"only in 2026: {sorted(only26)}")
        if only27:
            r.fail(cat, f"only in 2027: {sorted(only27)}")
    else:
        r.ok(cat, f"both files inject the same {len(inj26)} course_ids")


def validate_ga4_taxonomy(r, courses, real_pages):
    cat = "GA4 / Taxonomy"
    config = read("config.js")

    name_m = re.search(r"var LPA_COURSE_NAME = \{(.*?)\n\};", config, re.S)
    cat_m = re.search(r"var LPA_COURSE_CATEGORY = \{(.*?)\n\};", config, re.S)
    name_pairs = re.findall(r"'(/course-[a-z0-9-]+\.html)':\s*'((?:[^'\\]|\\.)*)'", name_m.group(1)) if name_m else []
    cat_pairs = re.findall(r"'(/course-[a-z0-9-]+\.html)':\s*'([^']*)'", cat_m.group(1)) if cat_m else []

    def check_dupes(pairs, map_name):
        counts = {}
        for p, _ in pairs:
            counts[p] = counts.get(p, 0) + 1
        n = 0
        for p, c in counts.items():
            if c > 1:
                r.fail(cat, f"{where(file='config.js')}{map_name} has {c} entries for {p}")
                n += 1
        return n

    n_dup_name = check_dupes(name_pairs, "LPA_COURSE_NAME")
    n_dup_cat = check_dupes(cat_pairs, "LPA_COURSE_CATEGORY")
    if n_dup_name == 0:
        r.ok(cat, "no duplicate pathname keys in LPA_COURSE_NAME")
    if n_dup_cat == 0:
        r.ok(cat, "no duplicate pathname keys in LPA_COURSE_CATEGORY")

    name_map = dict(name_pairs)
    cat_map = dict(cat_pairs)

    n_no_name = 0
    n_no_cat = 0
    for o in courses:
        cid = field(o, "course_id")
        p = field(o, "page_path")
        if p not in name_map:
            r.fail(cat, f"{where(file='config.js', course_id=cid)}page_path {p} missing from LPA_COURSE_NAME")
            n_no_name += 1
        if p not in cat_map:
            r.fail(cat, f"{where(file='config.js', course_id=cid)}page_path {p} missing from LPA_COURSE_CATEGORY")
            n_no_cat += 1
    if n_no_name == 0:
        r.ok(cat, "every page_path has an LPA_COURSE_NAME entry")
    if n_no_cat == 0:
        r.ok(cat, "every page_path has an LPA_COURSE_CATEGORY entry")

    n_mismatch = 0
    for o in courses:
        cid = field(o, "course_id")
        p = field(o, "page_path")
        cname = field(o, "course_name")
        map_name = name_map.get(p)
        if map_name is not None and map_name != cname:
            r.fail(cat, f"{where(file='config.js', course_id=cid)}{p} taxonomy='{map_name}' central='{cname}'")
            n_mismatch += 1
    if n_mismatch == 0:
        r.ok(cat, "LPA_COURSE_NAME matches LPA_COURSES.course_name exactly")

    documented = {f"/{p}" for p in real_pages} | {f"/{s}" for s in REDIRECT_STUB_PAGES}
    n_stray = 0
    for p in sorted(set(name_map) | set(cat_map)):
        if p not in documented:
            r.warn(cat, f"{where(file='config.js')}stray taxonomy pathname {p}")
            n_stray += 1
    if n_stray == 0:
        r.ok(cat, "no stray taxonomy pathnames")

    name_paths = set(name_map)
    cat_paths = set(cat_map)
    only_name = name_paths - cat_paths
    only_cat = cat_paths - name_paths
    if only_name or only_cat:
        if only_name:
            r.fail(cat, f"in LPA_COURSE_NAME but not LPA_COURSE_CATEGORY: {sorted(only_name)}")
        if only_cat:
            r.fail(cat, f"in LPA_COURSE_CATEGORY but not LPA_COURSE_NAME: {sorted(only_cat)}")
    else:
        r.ok(cat, "LPA_COURSE_NAME and LPA_COURSE_CATEGORY have identical pathname sets")

    return config


def validate_safety(r, config, real_pages, sessions_block):
    cat = "Architecture Safety"

    for symbol in REMOVED_LEGACY_SYMBOLS:
        exec_hits = 0
        comment_hits = 0
        for lineno, line in enumerate(config.splitlines(), 1):
            if symbol in line:
                if line.strip().startswith("//"):
                    comment_hits += 1
                    r.warn(cat, f"{where(file='config.js')}{symbol} in comment, line {lineno}")
                else:
                    exec_hits += 1
                    r.fail(cat, f"{where(file='config.js')}{symbol} in executable code, line {lineno}")
        if exec_hits == 0 and comment_hits == 0:
            r.ok(cat, f"{symbol} fully absent from config.js")

    n_fallback = 0
    m = re.search(r"eventName\s*===\s*'booking_submitted'", config)
    if m:
        window = config[m.start():m.start() + 500]
        if "LPA_CURRENT_COURSE" in window and "undefined" in window:
            r.fail(cat, f"{where(file='config.js')}legacy booking_submitted fallback pattern reintroduced")
            n_fallback += 1
    if n_fallback == 0:
        r.ok(cat, "no reintroduced legacy booking_submitted fallback pattern")

    delivery_format_re = re.compile(r"delivery_format\s*:\s*['\"]([a-z_]+)['\"]")
    n_forbidden_page = 0
    n_tbc_page = 0
    for page in real_pages:
        content_p = read(page)
        for val in delivery_format_re.findall(content_p):
            if val in FORBIDDEN_DELIVERY_FORMAT_VALUES:
                r.fail(cat, f"{where(file=page)}hardcoded delivery_format:'{val}'")
                n_forbidden_page += 1
                if val == "tbc_on_request":
                    n_tbc_page += 1
    if n_tbc_page == 0:
        r.ok(cat, "no course page contains delivery_format:'tbc_on_request'")
    if n_forbidden_page == 0:
        r.ok(cat, "no course page hardcodes a non-session delivery_format pseudo-value")

    request_type_re = re.compile(r"request_type\s*:\s*['\"]([a-z_]+)['\"]")
    n_bad_rt = 0
    for page in real_pages:
        content_p = read(page)
        for val in set(request_type_re.findall(content_p)):
            if val not in ALLOWED_REQUEST_TYPE:
                r.fail(cat, f"{where(file=page)}request_type '{val}' not allowed")
                n_bad_rt += 1
    if n_bad_rt == 0:
        r.ok(cat, f"all request_type values in {sorted(ALLOWED_REQUEST_TYPE)}")

    n_forbidden_session = 0
    for val in sorted(FORBIDDEN_DELIVERY_FORMAT_VALUES):
        pat = r"delivery_format\s*:\s*['\"]" + val + r"['\"]"
        if re.search(pat, sessions_block):
            r.fail(cat, f"{where(file='course-data.js')}LPA_SESSIONS has delivery_format:'{val}'")
            n_forbidden_session += 1
    if n_forbidden_session == 0:
        r.ok(cat, f"LPA_SESSIONS never uses {sorted(FORBIDDEN_DELIVERY_FORMAT_VALUES)}")


def main():
    r = Results()
    courses, sessions, courses_block, sessions_block = validate_course_session_data(r)
    real_pages, course_paths = validate_course_pages(r, courses, sessions)
    validate_calendars(r, courses, sessions)
    config = validate_ga4_taxonomy(r, courses, real_pages)
    validate_safety(r, config, real_pages, sessions_block)

    categories = ["Course Data Integrity", "Course Page Architecture",
                  "Calendar Integrity", "GA4 / Taxonomy", "Architecture Safety"]
    counts = {"PASS": 0, "WARN": 0, "FAIL": 0}

    for cat in categories:
        print("\n=== " + cat + " ===")
        for entry_cat, level, msg in r.entries:
            if entry_cat == cat:
                print(level + " " + msg)
                counts[level] += 1

    print("\n=== Summary ===")
    print("PASS: " + str(counts["PASS"]))
    print("WARN: " + str(counts["WARN"]))
    print("FAIL: " + str(counts["FAIL"]))

    exit_code = 1 if counts["FAIL"] > 0 else 0
    print("\nExit code: " + str(exit_code))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
