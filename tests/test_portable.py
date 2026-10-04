from pathlib import Path

T = Path(__file__).resolve().parent


def test_sem_path_absoluto_windows():
    bad = [p.name for p in T.glob('test_*.py') if p.name != Path(__file__).name and ('C:\\' in p.read_text(encoding='utf-8') or 'C:/' in p.read_text(encoding='utf-8'))]
    assert not bad, f'paths absolutos quebram o CI Linux: {bad}'
