/* Painel acadêmico de avaliação disponível em todas as páginas para docentes. */
(() => {
  const semesters = window.PEPAcademicContext?.semesters || Array.from({ length: 8 }, (_, index) => `${index + 1}º semestre`);
  const competencies = ['Sinais Vitais', 'Anotação de Enfermagem', 'Raciocínio Clínico', 'Desempenho Geral'];
  const ratings = [['A', 'ATENDIDO'], ['PA', 'PARCIALMENTE ATENDIDO'], ['NA', 'NÃO ATENDIDO']];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const same = (left, right) => String(left || '').trim().toLocaleLowerCase('pt-BR') === String(right || '').trim().toLocaleLowerCase('pt-BR');
  const localDate = () => new Date().toISOString().slice(0, 10);
  const preferenceKey = suffix => `pep_evaluation_panel_${suffix}`;
  const isPinned = () => localStorage.getItem(preferenceKey('pinned')) === '1';
  const ratingLabel = entry => {
    if (entry?.avaliacao) return `${entry.avaliacao} — ${ratings.find(([value]) => value === entry.avaliacao)?.[1] || entry.avaliacao}`;
    const legacy = Number(entry?.nota);
    if (Number.isFinite(legacy)) return legacy >= 8 ? 'A — ATENDIDO' : legacy >= 5 ? 'PA — PARCIALMENTE ATENDIDO' : 'NA — NÃO ATENDIDO';
    return 'Avaliação não informada';
  };
  let users = [];
  let state = { semester:'', studentId:'' };

  const currentUnit = () => window.PEPAcademicContext?.get?.().unit || localStorage.getItem('pep_current_unit') || 'Unidade acadêmica';
  const availableStudents = () => users.filter(student => String(student.perfil || '').toLocaleLowerCase('pt-BR') === 'aluno' && String(student.status || 'Ativo') === 'Ativo' && same(student.unidade || 'Unidade acadêmica', currentUnit()) && (!state.semester || student.semestre === state.semester));
  const selectedStudent = () => availableStudents().find(student => String(student.uid || student.email) === String(state.studentId)) || null;
  const assessmentsFor = student => student ? load('avaliacoes').filter(item => String(item.alunoUid || item.alunoEmail) === String(student.uid || student.email) && (!state.semester || item.semestre === state.semester)).slice().reverse() : [];
  const pinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 4 6 6-3 1-3 3 1 3-1 1-4-4-4 4-1-1 4-4-4-4 1-1 3 1 3-3 1-3z"/></svg>';
  const ratingOptions = () => `<div class="evaluation-rating" role="radiogroup" aria-label="Avaliação">${ratings.map(([value, label]) => `<label class="evaluation-rating-option"><input type="radio" name="avaliacao" value="${value}" required><span><b>${value}</b><small>${label}</small></span></label>`).join('')}</div>`;

  function setOpen(open) {
    const drawer = document.querySelector('#evaluationDrawer');
    const trigger = document.querySelector('#evaluationFloatingTrigger');
    if (!drawer || !trigger) return;
    drawer.classList.toggle('show', open);
    trigger.setAttribute('aria-expanded', String(open));
    if (open) localStorage.setItem(preferenceKey('open'), '1');
    else localStorage.removeItem(preferenceKey('open'));
    if (open) drawer.querySelector('#evaluationSemester')?.focus();
  }
  function updatePinControl() {
    const button = document.querySelector('#pinEvaluationDrawer');
    const drawer = document.querySelector('#evaluationDrawer');
    if (!button || !drawer) return;
    const pinned = isPinned();
    button.classList.toggle('is-pinned', pinned);
    button.setAttribute('aria-pressed', String(pinned));
    button.setAttribute('title', pinned ? 'Desafixar painel' : 'Fixar painel aberto');
    button.setAttribute('aria-label', pinned ? 'Desafixar painel de avaliação' : 'Fixar painel de avaliação');
    drawer.classList.toggle('is-pinned', pinned);
  }
  function togglePin() {
    const next = !isPinned();
    localStorage.setItem(preferenceKey('pinned'), next ? '1' : '0');
    updatePinControl();
    if (next) { setOpen(true); toast('Painel de avaliação fixado.'); }
    else toast('Painel de avaliação desafixado.');
  }
  function closeDrawer() {
    if (isPinned()) { localStorage.setItem(preferenceKey('pinned'), '0'); updatePinControl(); }
    setOpen(false);
  }
  function toggle() {
    const drawer = document.querySelector('#evaluationDrawer');
    if (!drawer) return;
    if (drawer.classList.contains('show')) {
      if (isPinned()) { toast('Desafixe o painel para fechá-lo.'); return; }
      setOpen(false); return;
    }
    setOpen(true);
  }
  function selectSemester(value) {
    state.semester = semesters.includes(value) ? value : '';
    state.studentId = '';
    localStorage.setItem('pep_selected_semester', state.semester);
    const headerSemester = document.querySelector('.semester-context-control select');
    if (headerSemester) headerSemester.value = state.semester;
    render();
  }
  function render() {
    const drawer = document.querySelector('#evaluationDrawer');
    if (!drawer) return;
    const students = availableStudents();
    const student = selectedStudent();
    const assessments = assessmentsFor(student);
    drawer.innerHTML = `<div class="evaluation-drawer-head"><div><span class="evaluation-kicker">Acompanhamento acadêmico</span><h2>${pepIcon('assessment')} Avaliação</h2></div><div class="evaluation-panel-actions"><button type="button" class="evaluation-pin" id="pinEvaluationDrawer">${pinIcon}</button><button type="button" class="close" aria-label="Fechar avaliação" id="closeEvaluationDrawer">×</button></div></div><p class="evaluation-intro">Registre o desempenho do aluno sem sair da página atual.</p><div class="evaluation-context"><span>Unidade</span><b>${esc(currentUnit())}</b></div><div class="evaluation-fields"><label class="field">Semestre<select id="evaluationSemester"><option value="">Selecione o semestre</option>${semesters.map(semester => `<option value="${esc(semester)}" ${semester === state.semester ? 'selected' : ''}>${esc(semester)}</option>`).join('')}</select></label><label class="field">Aluno<select id="evaluationStudent" ${state.semester ? '' : 'disabled'}><option value="">Selecione o aluno</option>${students.map(option => `<option value="${esc(option.uid || option.email)}" ${String(option.uid || option.email) === String(state.studentId) ? 'selected' : ''}>${esc(option.nome)}</option>`).join('')}</select></label></div>${!state.semester ? '<div class="evaluation-empty"><b>Escolha um semestre.</b><span>Os alunos da sua unidade serão exibidos aqui.</span></div>' : !student ? `<div class="evaluation-empty"><b>${students.length ? 'Escolha um aluno.' : 'Nenhum aluno encontrado.'}</b><span>${students.length ? 'Selecione o aluno para registrar a avaliação.' : 'Verifique os alunos ativos deste semestre e unidade.'}</span></div>` : `<div class="evaluation-student"><div><b>${esc(student.nome)}</b><small>${esc(student.semestre)} · ${esc(student.email)}</small></div><span>${assessments.length}<small>avaliações</small></span></div><form id="evaluationQuickForm" class="evaluation-form"><label class="field">Competência avaliada<select name="competencia" required><option value="">Selecione a competência</option>${competencies.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select></label><fieldset class="evaluation-fieldset"><legend>Avaliação</legend>${ratingOptions()}</fieldset><label class="field">Devolutiva ao aluno<textarea name="comentario" required placeholder="Registre orientações e pontos de evolução."></textarea></label><button type="submit">Salvar avaliação</button></form><div class="evaluation-history"><h3>Histórico</h3>${assessments.map(item => `<article><b>${esc(item.competencia)} · ${esc(ratingLabel(item))}</b><p>${esc(item.comentario)}</p><small>${esc(item.data)} · ${esc(item.avaliador || 'Docente')}</small></article>`).join('') || '<p class="muted">Nenhuma avaliação registrada neste semestre.</p>'}</div>`}`;
    drawer.querySelector('#closeEvaluationDrawer').onclick = closeDrawer;
    drawer.querySelector('#pinEvaluationDrawer').onclick = togglePin;
    drawer.querySelector('#evaluationSemester').onchange = event => selectSemester(event.target.value);
    drawer.querySelector('#evaluationStudent').onchange = event => { state.studentId = event.target.value; render(); };
    drawer.querySelector('#evaluationQuickForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity() || !student) return;
      const data = Object.fromEntries(new FormData(form));
      const entries = load('avaliacoes');
      entries.push({ id:DB.id(), ...data, alunoUid:student.uid || '', alunoEmail:student.email || '', alunoNome:student.nome, semestre:state.semester, unidade:currentUnit(), avaliador:currentIdentity().name, data:localDate(), registradoEm:new Date().toISOString() });
      save('avaliacoes', entries);
      toast('Avaliação registrada com sucesso.');
      render();
    });
    updatePinControl();
  }
  async function start() {
    if (window.__pepEvaluationPanelStarting || document.querySelector('#evaluationFloatingTrigger')) return;
    window.__pepEvaluationPanelStarting = true;
    const firebase = await window.PEPFirebaseReady;
    const { profile } = await firebase.sessionReady;
    const role = String(profile?.perfil || localStorage.getItem('pep_current_role') || '').toLocaleLowerCase('pt-BR');
    if (!['docente', 'administrador'].includes(role)) return;
    try { users = firebase.enabled ? await firebase.listUsers() : load('usuarios'); }
    catch (error) { console.warn('Não foi possível atualizar a lista de alunos.', error); users = load('usuarios'); }
    state.semester = window.PEPAcademicContext?.get?.().semester || '';
    const trigger = document.createElement('button');
    trigger.type = 'button'; trigger.id = 'evaluationFloatingTrigger'; trigger.className = 'evaluation-floating-trigger'; trigger.setAttribute('aria-label', 'Abrir avaliação'); trigger.setAttribute('title', 'Avaliação'); trigger.setAttribute('aria-controls', 'evaluationDrawer'); trigger.setAttribute('aria-expanded', 'false'); trigger.innerHTML = `<span class="evaluation-trigger-icon">${pepIcon('assessment')}</span><span class="sr-only">Avaliação</span>`;
    const drawer = document.createElement('aside');
    drawer.id = 'evaluationDrawer'; drawer.className = 'evaluation-drawer'; drawer.setAttribute('aria-label', 'Painel de avaliação de alunos');
    document.body.append(drawer, trigger);
    trigger.onclick = toggle;
    render();
    if (isPinned() || localStorage.getItem(preferenceKey('open')) === '1' || new URLSearchParams(location.search).get('avaliacoes') === '1') setOpen(true);
  }
  start().catch(error => console.warn('Não foi possível abrir o painel de avaliação.', error));
})();
