"""Pure helpers for the contact settings (no Django imports, so they are easy to test).

Phone numbers are stored in international form: +8801712345678.
"""
import re
from datetime import datetime, time

# Order the admin and the website list the days in (the Bangladeshi week starts on Saturday). 0 = Monday.
WEEK_ORDER = [5, 6, 0, 1, 2, 3, 4]
DAY_NAMES = {0: 'Mon', 1: 'Tue', 2: 'Wed', 3: 'Thu', 4: 'Fri', 5: 'Sat', 6: 'Sun'}

_BD_MOBILE = re.compile(r'1[3-9]\d{8}')       # national part of a Bangladesh mobile number
_BD_LANDLINE = re.compile(r'[2-9]\d{6,9}')    # Dhaka (2xxxxxxxx) and other area codes


def normalize_phone(raw, mobile_only=False):
    """Return the number as +<country code><number>, or raise ValueError with a message for the admin.

    Accepts 01712345678, 8801712345678, +880 1712-345678, 00880..., and other international numbers (+44 ...).
    mobile_only: WhatsApp needs a mobile number, so Bangladesh landlines are refused.
    """
    s = re.sub(r'[\s\-().]', '', raw or '')
    if not s:
        return ''
    if s.startswith('00'):
        s = '+' + s[2:]
    plus = s.startswith('+')
    digits = s[1:] if plus else s
    if not digits.isdigit():
        raise ValueError('Use digits only, for example +8801712345678.')
    if not plus:
        if digits.startswith('880'):
            pass
        elif digits.startswith('0'):
            digits = '880' + digits[1:]       # local Bangladesh number, e.g. 01712345678
        else:
            raise ValueError('Start with 0 (for example 01712345678) or with the country code (+880...).')
    if digits.startswith('880'):
        national = digits[3:]
        if _BD_MOBILE.fullmatch(national):
            pass
        elif not mobile_only and _BD_LANDLINE.fullmatch(national):
            pass
        else:
            raise ValueError('This is not a valid Bangladesh mobile number. Example: 01712345678.' if mobile_only
                             else 'This is not a valid Bangladesh phone number. Example: 01712345678.')
    elif not 8 <= len(digits) <= 15:
        raise ValueError('An international number has 8 to 15 digits, including the country code.')
    return '+' + digits


def clean_days(days):
    """Unique valid weekday numbers, or raise ValueError."""
    out = []
    for d in days or []:
        if not isinstance(d, int) or isinstance(d, bool) or not 0 <= d <= 6:
            raise ValueError('Days must be numbers from 0 (Monday) to 6 (Sunday).')
        if d not in out:
            out.append(d)
    return out


def _t12(t):
    return t.strftime('%I:%M %p').lstrip('0')


def days_label(days):
    """[5,6,0,1,2,3] -> 'Sat–Thu'; [0,2] -> 'Mon, Wed'; all seven -> 'Every day'."""
    have = [d for d in WEEK_ORDER if d in set(days or [])]
    if not have:
        return ''
    if len(have) == 7:
        return 'Every day'
    runs, cur = [], [have[0]]
    for d in have[1:]:
        if WEEK_ORDER.index(d) == WEEK_ORDER.index(cur[-1]) + 1:
            cur.append(d)
        else:
            runs.append(cur)
            cur = [d]
    runs.append(cur)
    return ', '.join(DAY_NAMES[r[0]] if len(r) == 1 else (DAY_NAMES[r[0]] + ', ' + DAY_NAMES[r[1]] if len(r) == 2 else f'{DAY_NAMES[r[0]]}–{DAY_NAMES[r[-1]]}') for r in runs)


def hours_label(days, opening, closing, note=''):
    """Text shown to customers. A hand-written note wins; otherwise built from the schedule."""
    if note and note.strip():
        return note.strip()
    if opening is None or closing is None:
        return ''
    d = days_label(days)
    return f'{d}, {_t12(opening)} – {_t12(closing)}' if d else f'{_t12(opening)} – {_t12(closing)}'


def is_open(now_local, days, opening, closing, paused=False):
    """True / False, or None when no schedule is set (we cannot say). now_local must be in the store's timezone."""
    if paused:
        return False
    if opening is None or closing is None:
        return None
    t = now_local.time().replace(tzinfo=None)
    today = now_local.weekday()
    if opening <= closing:
        return today in (days or []) and opening <= t < closing
    # overnight shift, e.g. 18:00 - 02:00: after midnight it belongs to yesterday's opening day
    if t >= opening:
        return today in (days or [])
    if t < closing:
        return (today - 1) % 7 in (days or [])
    return False