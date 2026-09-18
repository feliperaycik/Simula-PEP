/* Contexto acadêmico do docente: unidade fixa e semestre selecionável. */
(() => {
  const context = window.PEPAcademicContext;
  if (!context) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const isTeacher = () => String(localStorage.getItem('pep_current_role') || '').toLocaleLowerCase('pt-BR') === 'docente';
  const currentUnit = () => localStorage.getItem('pep_current_unit') || 'Unidade acadêmica';
  const selectedSemester = () => localStorage.getItem('pep_selected_semester') || '';
  const setProfileContext = profile => {
    if (!profile) return;
    const unit = String(profile.unidade || profile.unidadeEnsino || 'Unidade acadêmica').trim() || 'Unidade acadêmica';
    localStorage.setItem('pep_current_unit', unit);
  };
  const options = selected => context.semesters.map(semester => `<option value="${esc(semester)}" ${semester === selected ? 'selected' : ''}>${esc(semester)}</option>`).join('');
  const changeSemester = value => {
    if (!context.semesters.includes(value)) return;
    localStorage.setItem('pep_selected_semester', value);
    location.reload();
  };
  function mountControl() {
    document.querySelectorAll('.semester-context-control').forEach(element => element.remove());
    if (!isTeacher()) return;
    const actions = document.querySelector('.topbar .top-actions');
    if (!actions) return;
    const selected = selectedSemester();
    const control = document.createElement('label');
    control.className = 'semester-context-control';
    control.innerHTML = `<span>Semestre</span><select aria-label="Semestre acadêmico"><option value="" ${selected ? '' : 'selected'}>Selecione</option>${options(selected)}</select>`;
    control.querySelector('select').onchange = event => changeSemester(event.target.value);
    actions.prepend(control);
  }
  function promptSelection() {
    if (!isTeacher() || selectedSemester() || !document.querySelector('#modal')) return;
    const unit = currentUnit();
    modal(`<section class="semester-selection" aria-labelledby="semesterSelectionTitle"><span class="semester-selection-kicker">Acesso acadêmico</span><h2 id="semesterSelectionTitle">Selecione o semestre</h2><p>Escolha o semestre que deseja consultar antes de visualizar as informações acadêmicas.</p><dl><div><dt>Unidade</dt><dd>${esc(unit)}</dd></div></dl><form id="semesterSelectionForm"><label class="field" for="semesterSelection">Semestre<select id="semesterSelection" name="semester" required autofocus><option value="">Selecione o semestre</option>${options('')}</select></label><p class="muted">Os dados exibidos serão apenas deste semestre, dentro da sua unidade.</p><div class="actions"><button>Continuar</button></div></form></section>`, true);
    const form = document.querySelector('#semesterSelectionForm');
    form.onsubmit = event => {
      event.preventDefault();
      const value = new FormData(form).get('semester');
      if (!context.semesters.includes(value)) { form.querySelector('select').reportValidity(); return; }
      localStorage.setItem('pep_selected_semester', value);
      location.reload();
    };
  }
  function update() { mountControl(); window.setTimeout(promptSelection, 0); }
  window.addEventListener('pep-firebase-session', event => { setProfileContext(event.detail?.profile); update(); });
  window.PEPFirebaseReady?.then(api => api.sessionReady?.then(({ profile }) => { setProfileContext(profile); update(); }));
  update();
})();
