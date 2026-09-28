/* O semestre do docente é definido no cadastro pelo administrador. */
(() => {
  const context = window.PEPAcademicContext;
  if (!context) return;
  const isTeacher = () => String(localStorage.getItem('pep_current_role') || '').toLocaleLowerCase('pt-BR') === 'docente';
  const applyProfile = profile => {
    if (!profile || !isTeacher()) return;
    const semester = context.semesters.includes(profile.semestre) ? profile.semestre : '';
    localStorage.setItem('pep_current_unit', String(profile.unidade || profile.unidadeEnsino || 'Unidade acadêmica').trim());
    localStorage.setItem('pep_current_profile_semester', semester);
    localStorage.setItem('pep_selected_semester', semester);
    document.querySelectorAll('.semester-context-control').forEach(element => element.remove());
    const actions = document.querySelector('.topbar .top-actions');
    if (!actions) return;
    const control = document.createElement('span');
    control.className = 'semester-context-control';
    control.textContent = `Semestre: ${semester || 'não definido pelo administrador'}`;
    actions.prepend(control);
  };
  window.addEventListener('pep-firebase-session', event => applyProfile(event.detail?.profile));
  window.PEPFirebaseReady?.then(api => api.sessionReady?.then(({ profile }) => applyProfile(profile)));
})();
