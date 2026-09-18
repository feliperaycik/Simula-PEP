/* Substitui o campo livre de período por uma seleção acadêmica padronizada. */
(() => {
  const periods = Array.from({ length: 8 }, (_, index) => `${index + 1}º semestre`);
  function normalize(value) {
    const numeric = String(value || '').match(/[1-8]/)?.[0];
    return numeric ? `${numeric}º semestre` : '';
  }
  function replaceSemesterInput(form) {
    const input = form?.querySelector('input[name="semestre"]');
    if (!input || input.dataset.periodReady === '1') return;
    const select = document.createElement('select');
    select.name = 'semestre'; select.dataset.periodReady = '1';
    const selected = normalize(input.value);
    select.innerHTML = `<option value="">Selecione o semestre</option>${periods.map(period => `<option value="${period}" ${period === selected ? 'selected' : ''}>${period}</option>`).join('')}`;
    input.replaceWith(select);
    const profile = form.querySelector('[name="perfil"]');
    const updateRequirement = () => {
      const isStudent = String(profile?.value || '').toLocaleLowerCase('pt-BR') === 'aluno';
      select.required = isStudent;
      select.disabled = !isStudent;
      select.closest('label')?.toggleAttribute('hidden', !isStudent);
      select.closest('label')?.querySelector('.semester-help')?.toggleAttribute('hidden', !isStudent);
    };
    profile?.addEventListener('change', updateRequirement);
    updateRequirement();
  }
  new MutationObserver(() => replaceSemesterInput(document.querySelector('#userForm'))).observe(document.body, { childList: true, subtree: true });
  replaceSemesterInput(document.querySelector('#userForm'));
})();
