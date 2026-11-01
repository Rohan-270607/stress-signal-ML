"""Step 6: independent, rule-based crisis-language detector ("safety net").

DESIGN RULES
  * Deliberately simple and readable: a list of regexes. No ML, no scores, no imports from the model code,
    so a bug or drift in the stress model can never switch this layer off.
  * It returns a flag plus a FIXED, human-written message. Nothing here is AI-generated.
  * Bias toward over-flagging: a false alarm costs a student a moment; a miss could cost far more.
  * It does NOT understand context or negation ("I would never kill myself" is still flagged), and it is
    NOT a classifier or a risk assessment. See README "Safety layer limitations".

Edit CRISIS_PATTERNS to add phrases. Edit CRISIS_MESSAGE to localise helplines.
Helpline numbers last checked 2026-11-01 on the official sites: 988lifeline.org (US, call/text 988), samaritans.org
(UK/ROI, 116 123, free, 24/7), telemanas.mohfw.gov.in (India, 14416 or 1-800-891-4416, toll-free), findahelpline.com
(directory). Re-check periodically; numbers and services change.
"""
import re
from dataclasses import dataclass, field

CRISIS_MESSAGE = (
    "It sounds like you may be going through something very painful. You don't have to face it alone. "
    "If you are in immediate danger, please contact your local emergency number. "
    "You can also reach a free, confidential crisis line: in the US call or text 988; in the UK call Samaritans on "
    "116 123; in India call Tele-MANAS on 14416; elsewhere, find a local line at https://findahelpline.com. "
    "Talking to a trusted friend, family member, or your campus counselling service can help too."
)

# (category, pattern). Applied to lower-cased text with apostrophes normalised. \b = word boundary.
_RAW_PATTERNS = [
    ("suicide_words", r"\bsuicid(?:e|al)\b"),
    # only "myself": bare "kill me" is mostly idiom ("this exam is killing me") - a known, documented miss
    ("kill_self", r"\bkill(?:ing)?\s+my\s?self\b"),
    ("kill_self_slang", r"\bkms\b"),
    ("end_life", r"\bend(?:ing)?\s+(?:my\s+(?:own\s+)?life|it\s+all|everything)\b"),
    ("take_life", r"\btak(?:e|ing)\s+my\s+own\s+life\b"),
    ("want_to_die", r"\b(?:want(?:ed|s)?|wish(?:ed)?|plan(?:ning|ned)?|need)\s+(?:to\s+)?(?:die|be\s+dead)\b"),
    ("wish_dead", r"\bwish\s+i\s+(?:was|were)\s+dead\b"),
    ("better_off_dead", r"\b(?:better\s+off\s+dead|better\s+off\s+without\s+me|world\s+(?:is|would\s+be)\s+better\s+without\s+me)\b"),
    ("no_reason_live", r"\b(?:no\s+reason\s+to\s+(?:live|go\s+on|be\s+alive)|not\s+worth\s+living|life\s+(?:is|isn't|is\s+not)\s+(?:not\s+)?worth\s+living)\b"),
    ("dont_want_live", r"\b(?:don't|do\s+not|dont)\s+want\s+to\s+(?:be\s+alive|live|wake\s+up|exist)\b"),
    ("cant_go_on", r"\bcan't\s+(?:go\s+on|do\s+this\s+anymore|take\s+it\s+anymore)\b"),
    ("self_harm", r"\b(?:self[\s-]?harm(?:ing)?|(?:hurt|harm|cut|cutting|hurting|harming)\s+my\s?self)\b"),
    ("overdose", r"\b(?:overdose|od)\s+on\s+(?:purpose|pills)\b|\btake\s+all\s+(?:my|the)\s+pills\b"),
]
CRISIS_PATTERNS = [(c, re.compile(p)) for c, p in _RAW_PATTERNS]

_APOS = re.compile(r"[‘’�`´]")  # curly / broken apostrophes -> '


@dataclass
class CrisisResult:
    flag: bool
    message: str = None          # the fixed CRISIS_MESSAGE when flagged, else None
    categories: list = field(default_factory=list)  # which rules fired (for tests/debugging; never log user text)


def check_crisis(text: str) -> CrisisResult:
    t = re.sub(r"\s+", " ", _APOS.sub("'", text.lower()))
    hits = [c for c, rx in CRISIS_PATTERNS if rx.search(t)]
    return CrisisResult(flag=bool(hits), message=CRISIS_MESSAGE if hits else None, categories=hits)
