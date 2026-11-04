"""Exact fraction checks and bounded, transparent sample policies."""
import re
from fractions import Fraction

QUESTIONS = {
    'q1': '2/4', 'q2': '1/2', 'q3': '1', 'q4': '3/4', 'q5': '3/4', 'q6': '5',
}

def parse_fraction(value: str) -> Fraction:
    match = re.fullmatch(r'\s*(\d{1,3})(?:\s*/\s*(\d{1,3}))?\s*', value)
    if not match or int(match[2] or 1) == 0:
        raise ValueError('Use a whole number or a fraction, such as 1/2.')
    return Fraction(int(match[1]), int(match[2] or 1))

def check_answer(question_id: str, response: str) -> bool:
    if question_id not in QUESTIONS:
        raise ValueError('This practice question is not supported.')
    return parse_fraction(response) == parse_fraction(QUESTIONS[question_id])

def validate_scene(scene: dict) -> dict:
    if scene.get('representation') not in ('bars', 'line'):
        raise ValueError('Choose a supported representation.')
    for key in ('a', 'b'):
        f = scene.get(key)
        if f is None and key == 'b':
            continue
        if not isinstance(f, dict) or not all(type(f.get(x)) is int for x in ('n', 'd')):
            raise ValueError('Fractions must contain integer values.')
        if not 1 <= f['d'] <= 12 or not 0 <= f['n'] <= f['d']:
            raise ValueError('Choose between 1 and 12 equal parts, with a valid selection.')
    return scene

def supported_rubric(text: str) -> list[dict]:
    """A sample baseline, explicitly distinct from an AI assessment."""
    rows = [
        ('The same whole', r'same\s+(?:sized?\s+)?(?:whole|pizza|cake|bar)', 'Compare amounts from the same-sized whole.'),
        ('Equal parts', r'equal(?:ly)?\s+(?:parts|pieces|sized|divided)', 'The parts within each whole must be equal.'),
        ('The same amount', r'same\s+(?:amount|quantity)|equivalent', 'Equivalent fractions name the same quantity.'),
    ]
    result = []
    for criterion, pattern, feedback in rows:
        found = re.search(pattern, text, re.I)
        result.append(dict(criterion=criterion, status='supported' if found else 'not_mentioned', quote=found[0] if found else '', feedback=feedback))
    return result

RUBRICS = {
    'equivalence': {'The same whole', 'Equal parts', 'The same amount'},
    'parts': {'Equal parts', 'The denominator', 'The numerator'},
    'addition': {'Equal-sized pieces', 'Add the numerators', 'Keep the denominator'},
}

def validate_quotes(rows: list[dict], text: str, concept: str = 'equivalence') -> list[dict]:
    allowed = RUBRICS[concept]
    if len(rows) != 3 or {r['criterion'] for r in rows} != allowed:
        raise ValueError('The feedback did not match the reviewed concept rubric.')
    for row in rows:
        if row['quote'] and row['quote'] not in text:
            raise ValueError('Feedback contained a quotation that was not in your explanation.')
        if row['status'] in ('supported', 'contradicted') and not row['quote']:
            raise ValueError('The assessment did not include evidence for its judgment.')
    return rows
