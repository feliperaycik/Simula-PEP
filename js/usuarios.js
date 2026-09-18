/* Gestão de perfis protegida pelo Firebase e pelas regras do Firestore. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatLastLogin = value => {
    const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null);
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : 'Nunca acessou';
  };
  let firebase, users = [], unsubscribe;
  const roleOptions = profile => ['Aluno','Docente','Administrador'].map(role => `<option ${profile.perfil===role?'selected':''}>${role}</option>`).join('');
  function render() {
    const term = (document.querySelector('#userSearch')?.value || '').toLowerCase();
    const data = users.filter(user => [user.nome,user.email,user.perfil,user.status].some(value => String(value||'').toLowerCase().includes(term)));
    document.querySelector('#usersTotal').textContent = data.length;
    document.querySelector('#usersTable').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Curso</th><th>Unidade</th><th>Semestre</th><th>Status</th><th>Último login</th><th>Ações</th></tr></thead><tbody>${data.map(user => `<tr><td>${esc(user.nome)}</td><td>${esc(user.email)}</td><td>${esc(user.perfil)}</td><td>${esc(user.curso||'—')}</td><td>${esc(user.unidade||'Unidade acadêmica')}</td><td>${esc(user.semestre||'Não informado')}</td><td><span class="status">${esc(user.status||'Ativo')}</span></td><td>${esc(formatLastLogin(user.lastLoginAt))}</td><td><button class="secondary" onclick="openUser('${user.uid}')"><span aria-hidden="true">✎</span> Editar</button></td></tr>`).join('') || '<tr><td colspan="9">Nenhum usuário encontrado.</td></tr>'}</tbody></table></div>`;
  }
  window.openUser = uid => {
    const existing = users.find(user => user.uid === uid) || { perfil: 'Aluno', status: 'Ativo', curso: 'Enfermagem' };
    const creating = !uid;
    modal(`<h2>${creating?'Novo usuário':'Editar usuário'}</h2><form id="userForm" class="form-card"><div class="form-grid"><label class="field">Nome completo*<input name="nome" value="${esc(existing.nome||'')}" required></label><label class="field">E-mail*<input name="email" type="email" value="${esc(existing.email||'')}" ${creating?'':'readonly'} required></label>${creating?'<label class="field">Senha inicial*<input name="password" type="password" required minlength="6"></label>':''}<label class="field">Perfil<select name="perfil">${roleOptions(existing)}</select></label><label class="field">Curso<input name="curso" value="${esc(existing.curso||'Enfermagem')}"></label><label class="field">Unidade de ensino*<select name="unidade" required>${[...new Set([...(load('unidades').map(unit=>unit.nome)),existing.unidade||'Unidade acadêmica'])].map(unit=>`<option value="${esc(unit)}" ${unit===(existing.unidade||'Unidade acadêmica')?'selected':''}>${esc(unit)}</option>`).join('')}</select></label><label class="field">Semestre<input name="semestre" value="${esc(existing.semestre||'')}"><small class="semester-help">Definido pelo docente ou administrador.</small></label><label class="field">Status<select name="status">${['Ativo','Inativo'].map(status=>`<option ${existing.status===status?'selected':''}>${status}</option>`).join('')}</select></label></div><p class="muted">Por segurança, e-mail e senha de usuários existentes são alterados pelo próprio usuário em Configurações.</p><div class="error" id="userError" aria-live="polite"></div><div class="actions"><button>${creating?'Criar usuário':'Salvar alterações'}</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button></div></form>`);
    document.querySelector('#userForm').onsubmit = async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)), error = document.querySelector('#userError'); error.textContent=''; try { if (creating) await firebase.createUser(data); else await firebase.updateUser(uid, data); closeModal(); window.toast?.(creating?'Usuário criado com sucesso.':'Usuário atualizado com sucesso.'); } catch (exception) { error.textContent = exception.message || 'Não foi possível salvar o usuário.'; } };
  };
  (async() => {
    firebase = await window.PEPFirebaseReady;
    if (!firebase.enabled) { document.querySelector('#app').innerHTML = '<main class="content"><h1>Gestão de usuários</h1><p>O Firebase não pôde ser iniciado.</p></main>'; return; }
    const { profile } = await firebase.sessionReady;
    if (!firebase.isAdmin(profile)) { location.replace('configuracoes.html'); return; }
    shell('<div class="toolbar"><input id="userSearch" placeholder="Pesquisar por nome, e-mail ou perfil"><button onclick="openUser()">＋ Novo usuário</button></div><div class="card"><b id="usersTotal"></b><span class="muted"> usuários cadastrados.</span></div><div id="usersTable" style="margin-top:14px"></div>','Gestão de usuários');
    document.querySelector('#userSearch').oninput = render;
    unsubscribe = await firebase.watchUsers(nextUsers => { users = nextUsers; render(); });
    window.addEventListener('pagehide', () => unsubscribe?.(), { once: true });
  })();
})();
