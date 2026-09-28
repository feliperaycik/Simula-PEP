/* Acompanhamento acadêmico dos alunos por docentes e administração. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const periods = window.PEPAcademicContext?.semesters || Array.from({ length: 8 }, (_, index) => `${index + 1}º semestre`);
  const competencies = ['Sinais Vitais', 'Anotação de Enfermagem', 'Raciocínio Clínico', 'Desempenho Geral'];
  const ratings = [['A', 'ATENDIDO'], ['PA', 'PARCIALMENTE ATENDIDO'], ['NA', 'NÃO ATENDIDO']];
  const activitySources = [['triagens', 'Triagem', 'triagens'], ['sinais_vitais', 'Sinais vitais', 'sinais-vitais'], ['evolucoes', 'Evolução', 'evolucoes'], ['anotacoes_enfermagem', 'Anotação de enfermagem', 'anotacoes-enfermagem'], ['solicitacoes_exames', 'Exames', 'solicitacoes-procedimentos'], ['procedimentos', 'Procedimento', 'solicitacoes-procedimentos'], ['diagnosticos', 'Diagnóstico', 'diagnostico-plano'], ['planos', 'Plano de cuidados', 'diagnostico-plano'], ['prescricoes', 'Prescrição', 'prescricoes'], ['receitas', 'Receituário', 'receituario']];
  let users = [], selectedUser = null;
  const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
  const same = (left, right) => normalized(left) === normalized(right);
  const semesterOf=value=>{const match=normalized(value).match(/^([1-8])\s*(?:º|o|°)?\s*(?:semestre)?$/);return match?`${match[1]}º semestre`:'';};
  const localDate = () => new Date().toISOString().slice(0, 10);
  const ratingLabel = item => {
    if (item?.avaliacao) return `${item.avaliacao} — ${ratings.find(([value]) => value === item.avaliacao)?.[1] || item.avaliacao}`;
    const legacy = Number(item?.nota);
    return Number.isFinite(legacy) ? (legacy >= 8 ? 'A — ATENDIDO' : legacy >= 5 ? 'PA — PARCIALMENTE ATENDIDO' : 'NA — NÃO ATENDIDO') : 'Avaliação não informada';
  };
  const ratingOptions = () => `<div class="evaluation-rating" role="radiogroup" aria-label="Avaliação">${ratings.map(([value, label]) => `<label class="evaluation-rating-option"><input type="radio" name="avaliacao" value="${value}" required><span><b>${value}</b><small>${label}</small></span></label>`).join('')}</div>`;
  const isStudentActivity = (entry, student) => same(entry?.registradoPor?.email, student.email) || same(entry?.registradoPor?.nome, student.nome) || same(entry?.aluno, student.nome) || same(entry?.profissional, student.nome);
  const activities = student => {
    const semester = window.PEPAcademicContext?.get?.().semester || '';
    return activitySources.flatMap(([key, label, tab]) => load(key).filter(entry => isStudentActivity(entry, student) && (!semester || semesterOf(entry.semestre) === semester)).map(entry => ({ ...entry, key, label, tab }))).sort((a, b) => String(b.registradoEm || `${b.data || ''}T${b.hora || ''}`).localeCompare(String(a.registradoEm || `${a.data || ''}T${a.hora || ''}`)));
  };
  const activitySummary = activity => activity.queixa || activity.evolucao || activity.anotacao || activity.procedimento || activity.diagnostico || activity.medicamento || activity.exames || activity.objetivo || 'Registro realizado no portal.';
  function availableStudents() {
    const academic = window.PEPAcademicContext?.get?.() || {};
    const semester = academic.semester || document.querySelector('#semesterFilter')?.value || '';
    const sameUnit = user => same(user.unidade || 'Unidade acadêmica', academic.unit || 'Unidade acadêmica');
    const sameClass = user => same(user.turma || 'Turma acadêmica', academic.classroom || 'Turma acadêmica');
    return users.filter(user => String(user.perfil || '').toLocaleLowerCase('pt-BR') === 'aluno' && String(user.status || 'Ativo') === 'Ativo' && sameUnit(user) && (academic.role === 'administrador' || sameClass(user)) && (!semester || semesterOf(user.semestre) === semester));
  }
  function renderStudentOptions() {
    const select = document.querySelector('#studentFilter');
    if (!select) return;
    const chosen = selectedUser?.uid || select.value;
    const students = availableStudents();
    select.innerHTML = `<option value="">Selecione o aluno</option>${students.map(student => `<option value="${esc(student.uid || student.email)}" ${String(student.uid || student.email) === String(chosen) ? 'selected' : ''}>${esc(student.nome)} · ${esc(student.semestre || 'Semestre não informado')}</option>`).join('')}`;
    selectedUser = students.find(student => String(student.uid || student.email) === String(select.value)) || null;
    renderWorkspace();
  }
  function renderWorkspace() {
    const target = document.querySelector('#assessmentWorkspace');
    if (!target) return;
    if (!selectedUser) { target.innerHTML = '<div class="empty-state"><b>Selecione um aluno ativo.</b><span>Selecione primeiro o semestre e depois o aluno para acompanhar as atividades.</span></div>'; return; }
    const studentActivities = activities(selectedUser);
    const assessments = load('avaliacoes').filter(item => String(item.alunoUid || item.alunoEmail) === String(selectedUser.uid || selectedUser.email)).slice().reverse();
    target.innerHTML = `<div class="professional-banner"><div class="professional-icon" aria-hidden="true">${pepIcon('assessment')}</div><div><strong>${esc(selectedUser.nome)}</strong><small>${esc(selectedUser.email)} · ${esc(selectedUser.semestre || 'Semestre não informado')}</small></div><div class="assessment-summary"><span>Avaliações registradas<b>${assessments.length}</b></span><span>Última avaliação<b>${assessments[0] ? esc(assessments[0].avaliacao || '—') : '—'}</b></span></div></div><div class="clinical-pair"><section class="card"><h2>Atividades no portal</h2><p class="muted">${studentActivities.length} registro(s) encontrado(s).</p><div class="timeline">${studentActivities.map(activity => `<article class="event"><div class="event-time">${activity.data ? fmt(activity.data) : 'Sem data'} ${activity.hora ? `às ${esc(activity.hora)}` : ''}</div><b>${esc(activity.label)}</b><p>${esc(activitySummary(activity))}</p>${activity.pacienteId ? `<a class="btn outline" href="prontuario.html?id=${encodeURIComponent(activity.pacienteId)}&tab=${activity.tab}">Ver no prontuário</a>` : ''}</article>`).join('') || '<p class="muted">Ainda não há registros desse aluno no portal.</p>'}</div></section><section class="form-card assessment-form-card"><h2>Registrar avaliação</h2><form id="assessmentForm" class="evaluation-form"><label class="field">Competência avaliada<select name="competencia" required><option value="">Selecione a competência</option>${competencies.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select></label><fieldset class="evaluation-fieldset"><legend>Avaliação</legend>${ratingOptions()}</fieldset><label class="field">Devolutiva ao aluno<textarea name="comentario" required placeholder="Descreva os pontos fortes e as orientações para evolução."></textarea></label><div class="actions"><button>Salvar avaliação</button></div></form><h3>Histórico de avaliações</h3>${assessments.map(item => `<article class="clinical-record"><b>${esc(item.competencia)} · ${esc(ratingLabel(item))}</b><p>${esc(item.comentario)}</p><small class="muted">${item.data ? fmt(item.data) : 'Sem data'} · ${esc(item.avaliador || 'Docente')}</small></article>`).join('') || '<p class="muted">Nenhuma avaliação registrada para este aluno.</p>'}</section></div>`;
    document.querySelector('#assessmentForm').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      const list = load('avaliacoes');
      list.push({ id: DB.id(), ...data, alunoUid: selectedUser.uid || '', alunoEmail: selectedUser.email || '', alunoNome: selectedUser.nome, semestre: selectedUser.semestre || '', unidade:(window.PEPAcademicContext?.get?.().unit || ''), turma:selectedUser.turma || '', avaliador: currentIdentity().name, data: localDate(), registradoEm: new Date().toISOString() });
      try { const synced=await save('avaliacoes', list);toast(synced?'Avaliação registrada com sucesso.':'Avaliação salva neste navegador; sincronização pendente.',synced?'success':'warn');renderWorkspace(); }
      catch(error){toast('Não foi possível salvar a avaliação.','error')}
    };
  }
  async function start() {
    const firebase = await window.PEPFirebaseReady;
    const { profile } = await firebase.sessionReady;
    const role = String(profile?.perfil || localStorage.getItem('pep_current_role') || '').toLocaleLowerCase('pt-BR');
    if (role === 'aluno') { const ownUid=profile?.uid||firebase.user?.uid||'',ownEmail=String(profile?.email||firebase.user?.email||localStorage.getItem('pep_current_email')||'').trim().toLocaleLowerCase('pt-BR');const own=load('avaliacoes').filter(item=>String(item.alunoUid||'')===String(ownUid)||String(item.alunoEmail||'').trim().toLocaleLowerCase('pt-BR')===ownEmail).slice().reverse(); shell(`<section class="card"><h2>Meu resultado de avaliação</h2>${own.map(item=>`<article class="clinical-record"><b>${esc(item.competencia)} · ${esc(ratingLabel(item))}</b><p>${esc(item.comentario)}</p><small class="muted">${item.data?fmt(item.data):'Sem data'} · ${esc(item.avaliador||'Docente')}</small></article>`).join('')||'<p class="muted">Nenhuma avaliação disponível.</p>'}</section>`, 'Minha avaliação'); return; }
    if (!['docente', 'administrador'].includes(role)) { shell('<div class="empty-state"><b>Acesso restrito.</b><span>A área de avaliação é exclusiva para docentes e administradores.</span></div>', 'Avaliação'); return; }
    try { users = firebase.enabled ? await firebase.listUsers() : load('usuarios'); } catch { users = load('usuarios'); }
    const activeSemester = window.PEPAcademicContext?.get?.().semester || '';
    shell(`<form class="form-card"><div class="form-grid"><label class="field">Semestre selecionado<select id="semesterFilter" ${role === 'docente' ? 'disabled' : ''}><option value="">Selecione o semestre</option>${periods.map(period => `<option value="${period}" ${period === activeSemester ? 'selected' : ''}>${period}</option>`).join('')}</select></label><label class="field">Aluno ativo<select id="studentFilter"><option value="">Selecione o aluno</option></select></label></div><p class="muted">O semestre do docente é definido pelo administrador.</p></form><section id="assessmentWorkspace" style="margin-top:14px"></section>`, 'Avaliação de alunos');
    document.querySelector('#semesterFilter').onchange = event => { localStorage.setItem('pep_selected_semester', event.target.value); renderStudentOptions(); };
    document.querySelector('#studentFilter').onchange = event => { selectedUser = availableStudents().find(student => String(student.uid || student.email) === String(event.target.value)) || null; renderWorkspace(); };
    renderStudentOptions();
  }
  start().catch(error => { console.error(error); shell('<div class="empty-state"><b>Não foi possível abrir as avaliações.</b><span>Tente novamente em alguns instantes.</span></div>', 'Avaliação'); });
})();
