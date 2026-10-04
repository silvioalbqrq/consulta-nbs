from pathlib import Path

R = Path(r'C:\Users\Acer Aspire 5\AppData\Local\Temp\opencode\consulta-nbs-repo')


def test_ci_instala_pytest_antes_de_usar():
    yml = (R / '.github' / 'workflows' / 'check.yml').read_text(encoding='utf-8')
    assert 'pip install' in yml and 'pytest' in yml, 'CI usa pytest sem instalar (falha no runner limpo)'
    assert yml.index('pip install') < yml.index('pytest'), 'instalacao deve vir antes do uso'


def test_ci_roda_suite_pytest_completa():
    yml = (R / '.github' / 'workflows' / 'check.yml').read_text(encoding='utf-8')
    assert 'pytest tests/' in yml, 'CI deve rodar toda a pasta tests/'
