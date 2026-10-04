"""tools/check.py — validacao stdlib-only do site (usado no CI e local)."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
fails = []


def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL"), "-", name, detail)
    if not cond:
        fails.append(name)


def load_json_array(path, marker):
    t = Path(path).read_text(encoding="utf-8")
    m = re.search(re.escape(marker) + r" = (\[.*?\]);", t, re.S)
    if not m:
        return None
    return json.loads(m.group(1))


idx = (ROOT / "index.html").read_text(encoding="utf-8")
check("meta charset UTF-8", '<meta charset="UTF-8">' in idx)
check("lang pt-BR", 'lang="pt-BR"' in idx)
check("sem placeholders", "__TOTAL__" not in idx and "__DATA__" not in idx)
check("engine compartilhado", 'src="nbs.js"' in idx and (ROOT / "nbs.js").exists())
check("escapeHtml no highlight", "escapeHtml" in (ROOT / "nbs.js").read_text(encoding="utf-8"))
check("debounce ~150ms", re.search(r"150", (ROOT / "nbs.js").read_text(encoding="utf-8")) is not None)
check("abas NBS/Anexo", 'role="tablist"' in idx and "painel-anexo" in idx)

nbs = load_json_array(ROOT / "nbs-data.js", "window.NBS_DATA")
check("NBS 1237 registros", isinstance(nbs, list) and len(nbs) == 1237, str(len(nbs) if nbs else 0))
ax = load_json_array(ROOT / "anexo-data.js", "window.ANEXO_DATA")
check("Anexo VIII 1739 linhas", isinstance(ax, list) and len(ax) == 1739, str(len(ax) if ax else 0))
if isinstance(ax, list):
    check("Anexo linhas com 10 campos", all(len(r) == 10 for r in ax))
    check("Anexo tem NBS e so-cClass", any(r[2] for r in ax) and any(not r[2] for r in ax))

print("bytes index.html:", (ROOT / "index.html").stat().st_size)
if fails:
    print("FALHAS:", fails)
    sys.exit(1)
print("check OK")
