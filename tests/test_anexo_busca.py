# Fase 4 TDD (RED): teste que falha antes do fix.
import json
from pathlib import Path

R = Path(__file__).resolve().parent.parent


def test_toolbar_nbs_dentro_do_painel():
    t = (R / 'index.html').read_text(encoding='utf-8')
    sec = t.find('id="painel-nbs"')
    q = t.find('id="q"')
    assert sec != -1 and q != -1 and sec < q, 'toolbar NBS fora do painel-nbs (sintoma do print)'


def test_termo_desinfe_existe_nas_bases():
    nbs = json.loads((R / 'nbs-data.js').read_text(encoding='utf-8').split('=', 1)[1].rstrip().rstrip(';'))
    ax = json.loads((R / 'anexo-data.js').read_text(encoding='utf-8').split('=', 1)[1].rstrip().rstrip(';'))
    n = sum(1 for r in nbs if 'desinf' in r['desc'].lower())
    a = sum(1 for r in ax if any('desinf' in str(c or '').lower() for c in r))
    print('NBS com desinf:', n, '| Anexo com desinf:', a)
    assert n + a > 0, "'desinfe' deveria retornar ao menos 1 registro"
