import pytest
from backend.engine import check_answer, parse_fraction, validate_scene, validate_quotes

@pytest.mark.parametrize('given', ['1/2','2/4','3/6','50/100'])
def test_equivalent_values_are_accepted(given):
    assert check_answer('q1', given)

@pytest.mark.parametrize('given', ['1/0','-1/2','1+1','__import__("os")','1/2/3',''])
def test_invalid_answers_are_not_evaluated(given):
    with pytest.raises(ValueError):
        parse_fraction(given)

def test_wrong_fraction_is_not_equivalent():
    assert not check_answer('q1','2/3')

@pytest.mark.parametrize('fraction',[{'n':2,'d':0},{'n':4,'d':3},{'n':1,'d':13},{'n':True,'d':2}])
def test_invalid_diagrams_are_rejected(fraction):
    with pytest.raises(ValueError):
        validate_scene({'a':fraction,'b':None,'representation':'bars'})

def test_unsupported_question_fails_explicitly():
    with pytest.raises(ValueError):
        check_answer('unknown','1/2')

def test_invented_evidence_is_rejected():
    rows=[{'criterion':x,'status':'supported','quote':'invented','feedback':'Try again'} for x in ['The same whole','Equal parts','The same amount']]
    with pytest.raises(ValueError):
        validate_quotes(rows,'I explained something else.')
