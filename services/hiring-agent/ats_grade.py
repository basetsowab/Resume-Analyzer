"""Grade a resume against the standard one-page ATS resume template.

Rule-based (no LLM), so it is fast, deterministic and works without an API key.
Accepts PDF, DOCX or plain text and returns a 0-100 score, a letter grade,
per-check results and bullet-level feedback.
"""

import io
import re
import zipfile
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import fitz  # PyMuPDF

# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

BULLET_CHARS = "•●▪■◦‣∙·-–—*o"
_BULLET_RE = re.compile(r"^\s*([•●▪■◦‣∙·*]|[-–—](?=\s)|o(?=\s))\s*")


@dataclass
class Line:
    text: str
    is_bullet: bool


@dataclass
class ParsedResume:
    lines: List[Line]
    page_count: Optional[int] = None

    @property
    def text(self) -> str:
        return "\n".join(l.text for l in self.lines)


def _split_lines(raw: str, forced_bullets: Optional[set] = None) -> List[Line]:
    out = []
    for i, line in enumerate(raw.splitlines()):
        stripped = line.strip()
        if not stripped:
            continue
        m = _BULLET_RE.match(stripped)
        is_bullet = bool(m) or (forced_bullets is not None and i in forced_bullets)
        text = stripped[m.end():].strip() if m else stripped
        if text:
            out.append(Line(text=text, is_bullet=is_bullet))
    return out


def parse_pdf(data: bytes) -> ParsedResume:
    doc = fitz.open(stream=data, filetype="pdf")
    raw = "\n".join(page.get_text("text") for page in doc)
    lines = _split_lines(raw)
    # PDFs often put the bullet glyph on its own line; merge it with the next line.
    merged: List[Line] = []
    pending_bullet = False
    for l in lines:
        if l.text in BULLET_CHARS:
            pending_bullet = True
            continue
        merged.append(Line(l.text, l.is_bullet or pending_bullet))
        pending_bullet = False
    return ParsedResume(lines=merged, page_count=doc.page_count)


def parse_docx(data: bytes) -> ParsedResume:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    lines: List[Line] = []
    for p in re.findall(r"<w:p[ >].*?</w:p>", xml, flags=re.S):
        # Keep tab stops as spaces so "Organization<tab>City, State" stays readable.
        p_text = re.sub(r"<w:tab/>", "<w:t>\t</w:t>", p)
        text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p_text))
        text = (
            text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            .replace("&quot;", '"').replace("&apos;", "'").strip()
        )
        if not text:
            continue
        is_bullet = "<w:numPr>" in p or bool(_BULLET_RE.match(text))
        m = _BULLET_RE.match(text)
        if m:
            text = text[m.end():].strip()
        lines.append(Line(text=text, is_bullet=is_bullet))
    pages = None
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            app = z.read("docProps/app.xml").decode("utf-8")
        m = re.search(r"<Pages>(\d+)</Pages>", app)
        pages = int(m.group(1)) if m else None
    except KeyError:
        pass
    return ParsedResume(lines=lines, page_count=pages)


def parse_text(text: str) -> ParsedResume:
    return ParsedResume(lines=_split_lines(text))


# ---------------------------------------------------------------------------
# Rubric data
# ---------------------------------------------------------------------------

ACTION_VERBS = set(
    """
    accelerated accomplished achieved acquired adapted addressed administered advanced advised advocated
    allocated analyzed annotated anticipated applied appraised approved arranged articulated assembled
    assessed assigned assisted attained audited augmented authored automated balanced benchmarked boosted
    briefed budgeted built calculated campaigned captured catalogued chaired championed charted clarified
    classified coached coded collaborated collected combined commissioned communicated compared compiled
    completed composed computed conceived conceptualized conducted configured consolidated constructed
    consulted contributed controlled converted convinced coordinated corrected counseled crafted created
    cultivated curated customized cut debugged decreased defined delegated delivered demonstrated deployed
    designed detected determined developed devised diagnosed directed discovered dispatched documented
    doubled drafted drove earned edited educated eliminated enabled encouraged engineered enhanced enlisted
    ensured established estimated evaluated examined exceeded executed expanded expedited experimented
    explained explored extracted fabricated facilitated finalized forecasted formalized formulated fostered
    founded founded generated grew guided handled headed helped hired hosted identified illustrated
    implemented improved increased influenced informed initiated innovated inspected installed instituted
    instructed integrated interpreted interviewed introduced invented investigated launched lectured led
    leveraged liaised maintained managed mapped marketed mastered maximized measured mediated mentored
    merged migrated minimized mobilized modeled moderated modernized monitored motivated navigated
    negotiated optimized orchestrated organized originated outlined overhauled oversaw participated
    partnered performed persuaded piloted pioneered planned predicted prepared presented prioritized
    processed produced programmed projected promoted proposed prototyped provided published purchased
    qualified quantified raised ran ranked rebuilt recommended reconciled recorded recruited redesigned
    reduced refactored refined reorganized repaired reported represented researched resolved restructured
    revamped reviewed revised scaled scheduled screened secured selected served shaped simplified
    solved spearheaded specified sponsored standardized steered streamlined strengthened structured
    studied submitted summarized supervised supported surpassed surveyed synthesized systematized taught
    tested tracked trained transformed translated tripled troubleshot tutored uncovered unified updated
    upgraded utilized validated verified visualized volunteered won wrote
    """.split()
)

PRONOUNS = re.compile(r"\b(i|me|my|mine|myself|we|our|us)\b", re.I)
NUMBER = re.compile(r"(\d|%|\$|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bten\b|\bdozens?\b|\bhundreds?\b|\bthousands?\b)", re.I)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
CITY_STATE = re.compile(r"\b[A-Z][a-zA-Z.\s]+,\s*([A-Z]{2}|[A-Z][a-z]+)\b")
MONTHS = r"(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?"
DATE_RANGE = re.compile(
    rf"\b{MONTHS}\s+\d{{4}}\s*[–—-]\s*({MONTHS}\s+\d{{4}}|present|current)\b", re.I
)
LOOSE_DATE = re.compile(r"\b(\d{1,2}/\d{2,4}|\d{4})\s*[–—-]\s*(\d{1,2}/\d{2,4}|\d{4}|present|current)\b", re.I)
PLACEHOLDERS = re.compile(
    r"(firstname lastname|\[note|month year|position title|youremail@|organization\s*city, state|high school name|university name)",
    re.I,
)

SECTIONS: Dict[str, re.Pattern] = {
    "education": re.compile(r"^(education|academic background)\b", re.I),
    "experience": re.compile(r"^((professional |work |relevant |research )?experience|employment)\b", re.I),
    "leadership": re.compile(r"^(leadership|activities|leadership\s*(&|and)\s*activities|extracurricular|campus involvement)", re.I),
    "skills": re.compile(r"^(skills|skills\s*(&|and)\s*interests|technical skills|additional information)", re.I),
}


# ---------------------------------------------------------------------------
# Grading
# ---------------------------------------------------------------------------

@dataclass
class Check:
    key: str
    group: str
    label: str
    points: float
    max: float
    detail: str
    fix: Optional[str] = None

    def as_dict(self):
        return {
            "key": self.key,
            "group": self.group,
            "label": self.label,
            "points": round(self.points, 1),
            "max": self.max,
            "passed": self.points >= self.max * 0.999,
            "detail": self.detail,
            "fix": self.fix,
        }


def letter_grade(score: float) -> str:
    for cutoff, letter in [
        (93, "A"), (90, "A-"), (87, "B+"), (83, "B"), (80, "B-"),
        (77, "C+"), (73, "C"), (70, "C-"), (67, "D+"), (60, "D"),
    ]:
        if score >= cutoff:
            return letter
    return "F"


def _section_positions(lines: List[Line]) -> Dict[str, int]:
    found: Dict[str, int] = {}
    for i, l in enumerate(lines):
        if l.is_bullet or len(l.text) > 40:
            continue
        for key, pat in SECTIONS.items():
            if key not in found and pat.match(l.text.strip()):
                found[key] = i
    return found


def _bullet_issues(text: str) -> List[str]:
    issues = []
    words = re.findall(r"[A-Za-z']+", text)
    first = words[0].lower() if words else ""
    if first not in ACTION_VERBS:
        issues.append("does not start with an action verb")
    if not NUMBER.search(text):
        issues.append("no numbers or measurable result")
    if PRONOUNS.search(text):
        issues.append("uses a personal pronoun")
    if len(words) > 30:
        issues.append("too long (keep to 1-2 lines)")
    elif len(words) < 5:
        issues.append("too short to show impact")
    return issues


def grade(resume: ParsedResume) -> Dict:
    lines = resume.lines
    text = resume.text
    header = "\n".join(l.text for l in lines[:4])
    checks: List[Check] = []

    # --- Contact header (10) ---
    has_email = bool(EMAIL.search(header))
    has_phone = bool(PHONE.search(header))
    has_location = bool(CITY_STATE.search(header)) or bool(re.search(r"\b\d{5}\b", header))
    checks.append(Check("email", "Contact header", "Email address in header", 4 if has_email else 0, 4,
                        "Found" if has_email else "No email in the first lines",
                        None if has_email else "Put your email on the line under your name."))
    checks.append(Check("phone", "Contact header", "Phone number in header", 3 if has_phone else 0, 3,
                        "Found" if has_phone else "No phone number in the first lines",
                        None if has_phone else "Add a phone number to the contact line."))
    checks.append(Check("location", "Contact header", "Address or City, State", 3 if has_location else 0, 3,
                        "Found" if has_location else "No address or City, State in the header",
                        None if has_location else "Add 'City, State Zip' to the contact line, separated by •."))

    # --- Sections (20) ---
    pos = _section_positions(lines)
    for key, label, pts, fix in [
        ("education", "Education section", 7, "Add an 'Education' heading with school, degree and graduation date."),
        ("experience", "Experience section", 7, "Add an 'Experience' heading with your positions."),
        ("leadership", "Leadership & Activities section", 3, "Add 'Leadership & Activities' for clubs, teams and volunteering."),
        ("skills", "Skills & Interests section", 3, "Add 'Skills & Interests' with Technical, Language and Interests lines."),
    ]:
        ok = key in pos
        checks.append(Check(f"section_{key}", "Sections", label, pts if ok else 0, pts,
                            "Found" if ok else "Heading not found", None if ok else fix))

    # --- Order (5) ---
    if "education" in pos and "experience" in pos:
        ok = pos["education"] < pos["experience"]
        checks.append(Check("order", "Sections", "Education listed before Experience", 5 if ok else 0, 5,
                            "Education comes first" if ok else "Experience comes before Education",
                            None if ok else "The template puts Education first while you are a student or recent graduate."))
    else:
        checks.append(Check("order", "Sections", "Education listed before Experience", 0, 5,
                            "Could not check without both sections", "Add both Education and Experience headings."))

    # --- Bullets (40) ---
    bullets = [l.text for l in lines if l.is_bullet]
    bullet_feedback = []
    if bullets:
        n = len(bullets)
        verb_ok = sum(1 for b in bullets if (re.findall(r"[A-Za-z']+", b) or [""])[0].lower() in ACTION_VERBS)
        num_ok = sum(1 for b in bullets if NUMBER.search(b))
        pron_bad = sum(1 for b in bullets if PRONOUNS.search(b))
        len_ok = sum(1 for b in bullets if 5 <= len(re.findall(r"[A-Za-z']+", b)) <= 30)
        sentence_bad = sum(1 for b in bullets if b.rstrip().endswith(".") and len(re.findall(r"[.!?]\s", b)) >= 1)

        checks.append(Check("action_verbs", "Bullet points", "Bullets start with action verbs", 15 * verb_ok / n, 15,
                            f"{verb_ok} of {n} bullets start with an action verb",
                            None if verb_ok == n else "Start every bullet with a strong past-tense verb (Led, Built, Analyzed...)."))
        # The template asks to "quantify where possible": full marks at 60%+ of bullets.
        quant_ratio = min(1.0, (num_ok / n) / 0.6)
        checks.append(Check("quantified", "Bullet points", "Results are quantified", 12 * quant_ratio, 12,
                            f"{num_ok} of {n} bullets include a number",
                            None if quant_ratio >= 1 else "Add numbers: people, dollars, percentages, time saved, users reached."))
        checks.append(Check("pronouns", "Bullet points", "No personal pronouns", 8 * (1 - pron_bad / n), 8,
                            "None found" if not pron_bad else f"{pron_bad} bullets use I/me/my/we/our",
                            None if not pron_bad else "Remove I, my, we and our; write phrases, not sentences."))
        checks.append(Check("length", "Bullet points", "Bullets are 1-2 lines", 3 * len_ok / n, 3,
                            f"{len_ok} of {n} bullets are a good length",
                            None if len_ok == n else "Keep each bullet between about 5 and 30 words."))
        checks.append(Check("phrases", "Bullet points", "Phrases, not full sentences", 2 * (1 - sentence_bad / n), 2,
                            "Bullets read as phrases" if not sentence_bad else f"{sentence_bad} bullets are multi-sentence",
                            None if not sentence_bad else "Cut bullets to a single phrase without multiple sentences."))
        for b in bullets:
            issues = _bullet_issues(b)
            if issues:
                bullet_feedback.append({"text": b, "issues": issues})
    else:
        checks.append(Check("bullets", "Bullet points", "Experience described in bullet points", 0, 40,
                            "No bullet points detected",
                            "Describe each position with 2-4 bullets that begin with action verbs and include results."))

    # --- Dates & formatting (15) ---
    ranges = DATE_RANGE.findall(text)
    loose = LOOSE_DATE.findall(DATE_RANGE.sub(" ", text))
    total_dates = len(ranges) + len(loose)
    if total_dates:
        ratio = len(ranges) / total_dates
        checks.append(Check("dates", "Dates & formatting", "Dates written as 'Month Year – Month Year'", 7 * ratio, 7,
                            f"{len(ranges)} of {total_dates} date ranges use the Month Year format",
                            None if ratio == 1 else "Write dates like 'June 2024 – August 2024' consistently."))
    else:
        checks.append(Check("dates", "Dates & formatting", "Dates written as 'Month Year – Month Year'", 0, 7,
                            "No date ranges found", "Add dates to each position, like 'June 2024 – August 2024'."))

    locs = len(CITY_STATE.findall("\n".join(l.text for l in lines[4:] if not l.is_bullet)))
    loc_ok = min(1.0, locs / 2)
    checks.append(Check("org_locations", "Dates & formatting", "Organizations list City, State", 4 * loc_ok, 4,
                        f"{locs} City, State locations found",
                        None if loc_ok == 1 else "Put 'City, State' on the right side of each school and organization line."))

    placeholders = sorted({m.group(0) for m in PLACEHOLDERS.finditer(text)})
    checks.append(Check("placeholders", "Dates & formatting", "No leftover template text", 0 if placeholders else 4, 4,
                        "None found" if not placeholders else "Found: " + ", ".join(placeholders),
                        None if not placeholders else "Replace every placeholder and delete the [Note] text from the template."))

    # --- Length (10) ---
    words = len(re.findall(r"[A-Za-z']+", text))
    if resume.page_count is not None and resume.page_count > 1:
        len_pts, len_detail = 2, f"{resume.page_count} pages"
        len_fix = "Keep it to one page; trim older or less relevant items."
    elif 300 <= words <= 750:
        len_pts, len_detail, len_fix = 10, f"{words} words, fits on one page", None
    elif words < 300:
        len_pts = 10 * max(0.0, words / 300)
        len_detail, len_fix = f"{words} words, looks thin", "Add more detail about results, activities and skills."
    else:
        len_pts = max(2.0, 10 - (words - 750) / 50)
        len_detail, len_fix = f"{words} words, likely over one page", "Trim to one page (about 400-700 words)."
    checks.append(Check("length_page", "Length", "One page", len_pts, 10, len_detail, len_fix))

    score = round(sum(c.points for c in checks), 1)
    max_score = sum(c.max for c in checks)
    score = round(100 * score / max_score, 1) if max_score else 0

    groups: Dict[str, Dict[str, float]] = {}
    for c in checks:
        g = groups.setdefault(c.group, {"points": 0.0, "max": 0.0})
        g["points"] += c.points
        g["max"] += c.max

    top_fixes = [c.fix for c in sorted(checks, key=lambda c: c.points - c.max) if c.fix][:5]

    return {
        "score": score,
        "grade": letter_grade(score),
        "groups": [
            {"name": k, "points": round(v["points"], 1), "max": v["max"]} for k, v in groups.items()
        ],
        "checks": [c.as_dict() for c in checks],
        "top_fixes": top_fixes,
        "bullets": {"total": len(bullets), "needs_work": bullet_feedback[:12]},
        "stats": {"words": words, "pages": resume.page_count, "bullets": len(bullets)},
    }
