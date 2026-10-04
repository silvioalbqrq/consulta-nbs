"""Validacoes estaticas do site Consulta NBS 2.0 ( Fase RED -> devem falhar antes da implementacao )."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
ENGINE = ROOT / "nbs.js"
CHECK = ROOT / "tools" / "check.py"
WORKFLOW = ROOT / ".github" / "workflows" / "check.yml"


def read(p):
    return p.read_text(encoding="utf-8")


def test_escape_html_no_highlight():
    t = read(INDEX)
    assert "escapeHtml" in t, "highlight insere termo sem escape HTML (self-XSS)"
    assert re.search(r"escapeHtml\s*\(", t), "escapeHtml deve ser aplicado no highlight"


def test_debounce_na_busca():
    t = read(ENGINE)
    assert re.search(r"setTimeout|debounce", t), "busca sem debounce (~150ms)"
    assert "150" in t, "debounce deve ser ~150ms"


def test_engine_compartilhado():
    assert ENGINE.exists(), "nbs.js ausente"
    t = read(INDEX)
    assert 'src="nbs.js"' in t, "index.html deve carregar o engine compartilhado"


def test_engine_puro_testavel_em_node():
    t = read(ENGINE)
    assert "module.exports" in t, "nbs.js deve expor funcoes puras para node"
    for fn in ("escapeHtml", "filterRecords", "paginate"):
        assert fn in t, f"funcao pura {fn} ausente no engine"


def test_aba_anexo_viii():
    t = read(INDEX)
    assert "painel-anexo" in t, "painel do Anexo VIII ausente"
    assert "tablist" in t, "abas NBS / Anexo VIII ausentes"
    assert "anexo-data.js" in t, "carga do anexo-data.js ausente"
    assert 'src="anexo-data.js"' not in t, "anexo deve ser lazy-load, sem script estatico"
    a = read(ROOT / "anexo-data.js")
    m = re.search(r"window\.ANEXO_DATA = (\[.*?\]);", a, re.S)
    assert m, "ANEXO_DATA nao encontrado"
    assert len(json.loads(m.group(1))) == 1739, "Anexo VIII deve ter 1739 linhas"
    n = read(ROOT / "nbs-data.js")
    m2 = re.search(r"window\.NBS_DATA = (\[.*?\]);", n, re.S)
    assert m2 and len(json.loads(m2.group(1))) == 1237, "NBS deve ter 1237 registros"


def test_check_e_workflow():
    assert CHECK.exists(), "tools/check.py ausente"
    assert WORKFLOW.exists(), ".github/workflows/check.yml ausente"


def test_engine_moderno_sem_var():
    import re as _re
    t = read(ENGINE)
    assert _re.search(r"\bvar\b", t) is None, "nbs.js ainda usa var"
    assert _re.search(r"(?<![=!])==(?!=)", t) is None, "nbs.js deve usar ==="
    assert _re.search(r"!=(?!=)", t) is None, "nbs.js deve usar !=="


def test_modo_somente_inicio():
    t = read(INDEX)
    assert 'id="prefixo"' in t and 'id="prefixo2"' in t, "checkbox Somente inicio ausente"
    assert "prefixCheckId" in t, "engine nao ligado ao checkbox"
    assert "highlightBest" in t, "destaque dirigido ausente"
