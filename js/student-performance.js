/* Histórico individual de avaliações: visível somente ao aluno autenticado. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const same = (left, right) => String(left || '').trim().toLocaleLowerCase('pt-BR') === String(right || '').trim().toLocaleLowerCase('pt-BR');
  const dateLabel = value => value ? fmt(value) : 'Sem data';
  async function start() {
    const firebase = await window.PEPFirebaseReady;
    const { profile } = await firebase.sessionReady;
    if (String(profile?.perfil || '').toLocaleLowerCase('pt-BR') !== 'aluno') return;
    const studentId = profile?.uid || firebase.user?.uid || '';
    const email = profile?.email || firebase.user?.email || localStorage.getItem('pep_current_email') || '';
    const assessments = load('avaliacoes').filter(item => String(item.alunoUid || '') === String(studentId) || same(item.alunoEmail, email)).slice().reverse();
    const ratingLabel = item => {
      if (item.avaliacao) return `${item.avaliacao} — ${{ A:'ATENDIDO', PA:'PARCIALMENTE ATENDIDO', NA:'NÃO ATENDIDO' }[item.avaliacao] || item.avaliacao}`;
      const legacy = Number(item.nota);
      return Number.isFinite(legacy) ? (legacy >= 8 ? 'A — ATENDIDO' : legacy >= 5 ? 'PA — PARCIALMENTE ATENDIDO' : 'NA — NÃO ATENDIDO') : 'Avaliação não informada';
    };
    const section = document.createElement('section');
    section.className = 'form-card student-performance';
    section.innerHTML = `<div class="student-performance-heading"><div><h2>Meu desempenho</h2><p class="muted">Histórico das avaliações registradas pelo docente.</p></div><div class="student-performance-average"><span>Avaliações registradas</span><b>${assessments.length}</b></div></div><div class="student-performance-list">${assessments.map(item => `<article class="clinical-record"><b>${esc(item.competencia)} · ${esc(ratingLabel(item))}</b><p>${esc(item.comentario)}</p><small class="muted">${dateLabel(item.data)} · ${esc(item.avaliador || 'Docente')}</small></article>`).join('') || '<p class="muted">Nenhuma avaliação registrada até o momento.</p>'}</div>`;
    document.querySelector('.content')?.append(section);
  }
  start().catch(error => console.warn('Não foi possível carregar o histórico de avaliações.', error));
})();
