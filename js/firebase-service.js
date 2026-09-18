/* Integração Firebase: autenticação, perfis, suporte e espelhamento dos dados acadêmicos. */
(() => {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyAUELTzu_jLfIFGbCZ4CEtDwHnb4slnjXo',
    authDomain: 'simula-pep.firebaseapp.com',
    projectId: 'simula-pep',
    storageBucket: 'simula-pep.firebasestorage.app',
    messagingSenderId: '272624538209',
    appId: '1:272624538209:web:615b718793ec8fe7555020',
    measurementId: 'G-C7ZEEBDFMJ'
  };
  const adminEmail = 'simulapep@gmail.com';
  const storeNames = ['pacientes','atendimentos','triagens','sinais_vitais','evolucoes','anotacoes_enfermagem','solicitacoes_exames','procedimentos','diagnosticos','planos','prescricoes','prescricoes_cuidados','receitas','avaliacoes','auditoria','notificacoes','chamados'];
  const ready = window.PEPFirebaseReady || new Promise(resolve => { window.__resolvePEPFirebase = resolve; });
  window.PEPFirebaseReady = ready;

  const api = { enabled: false, ready, profile: null, user: null, sessionReady: null };
  window.PEPFirebase = api;
  let app, auth, db, sdk = {}, sessionResolve;
  api.sessionReady = new Promise(resolve => { sessionResolve = resolve; });
  if (window.PEPPreviewLocalOnly === true || localStorage.getItem('pep_preview_local') === '1') {
    api.previewLocalOnly = true;
    api.sessionReady = Promise.resolve({ user: null, profile: null });
    window.__resolvePEPFirebase?.(api);
    return;
  }

  const roleOf = profile => String(profile?.perfil || profile?.role || '').toLocaleLowerCase('pt-BR');
  const unitKeyOf = unit => encodeURIComponent(String(unit || 'Unidade acadêmica').trim() || 'Unidade acadêmica');
  api.isStaff = profile => ['docente','administrador'].includes(roleOf(profile || api.profile));
  api.isAdmin = profile => roleOf(profile || api.profile) === 'administrador';
  const localUser = (user, profile) => {
    localStorage.setItem('pep_logged', 'true');
    localStorage.setItem('pep_current_email', user.email || profile.email || '');
    localStorage.setItem('pep_current_user', profile.nome || user.displayName || user.email?.split('@')[0] || 'Usuário');
    localStorage.setItem('pep_current_role', profile.perfil || profile.role || 'Aluno');
    localStorage.setItem('pep_current_unit', profile.unidade || profile.unidadeEnsino || 'Unidade acadêmica');
    localStorage.setItem('pep_current_unit_key', profile.unidadeChave || unitKeyOf(profile.unidade || profile.unidadeEnsino));
    localStorage.setItem('pep_current_profile_semester', profile.semestre || '');
  };
  const clearLocalUser = () => ['pep_logged','pep_current_email','pep_current_user','pep_current_role','pep_current_unit','pep_current_unit_key','pep_current_profile_semester','pep_selected_semester'].forEach(key => localStorage.removeItem(key));
  const currentPageIsPrivate = () => Boolean(document.body?.dataset?.page);
  const notifySession = detail => window.dispatchEvent(new CustomEvent('pep-firebase-session', { detail }));

  async function getProfile(uid) {
    const snapshot = await sdk.getDoc(sdk.doc(db, 'users', uid));
    return snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null;
  }
  async function hydrateStores() {
    if (!api.profile || sessionStorage.getItem(`pep_firebase_hydrated_${api.user.uid}`)) return;
    let downloaded = false;
    for (const store of storeNames) {
      const ref = sdk.collection(db, 'workspaces', 'academic', 'units', localStorage.getItem('pep_current_unit_key') || unitKeyOf(api.profile?.unidade), 'stores', store, 'items');
      const remote = await sdk.getDocs(ref);
      const values = remote.docs.map(item => item.data().payload).filter(Boolean);
      const local = JSON.parse(localStorage.getItem(`pep_${store}`) || '[]');
      if (values.length) {
        localStorage.setItem(`pep_${store}`, JSON.stringify(values));
        downloaded = true;
      } else if (local.length) {
        await api.syncStore(store, local);
      }
    }
    sessionStorage.setItem(`pep_firebase_hydrated_${api.user.uid}`, '1');
    if (downloaded && currentPageIsPrivate()) location.reload();
  }
  async function synchronizeSession(user) {
    api.user = user || null;
    if (!user) {
      api.profile = null; clearLocalUser(); sessionResolve?.({ user: null, profile: null }); notifySession({ user: null, profile: null });
      if (currentPageIsPrivate()) location.replace('index.html');
      return;
    }
    const profile = await getProfile(user.uid);
    if (!profile || profile.status === 'Inativo') {
      await sdk.signOut(auth); clearLocalUser(); sessionResolve?.({ user: null, profile: null }); notifySession({ user: null, profile: null, denied: true });
      return;
    }
    api.profile = profile; localUser(user, profile); renderSettings(); sessionResolve?.({ user, profile }); notifySession({ user, profile });
    hydrateStores().catch(error => console.warn('Não foi possível sincronizar os dados locais com o Firebase.', error));
  }
  async function requireStaff() {
    await api.sessionReady;
    if (!api.isStaff()) throw new Error('Apenas docentes e administradores podem acessar as configurações de usuários.');
  }
  async function requireAdmin() {
    await api.sessionReady;
    if (!api.isAdmin()) throw new Error('Apenas administradores podem gerenciar usuários e unidades.');
  }
  function renderSettings() {
    if (document.body?.dataset?.page !== 'configuracoes' || !api.profile) return;
    const form = document.querySelector('#configForm');
    if (!form) return;
    const profile = api.profile;
    form.outerHTML = `<form class="form-card firebase-account-form" id="firebaseAccountForm"><h2>Meu acesso</h2><p class="muted">Seu perfil é ${profile.perfil}. Alunos podem consultar apenas o próprio acesso e alterar e-mail ou senha.</p><div class="form-grid"><label class="field">Nome<input value="${String(profile.nome||'').replace(/"/g,'&quot;')}" readonly></label><label class="field">Perfil<input value="${String(profile.perfil||'Aluno').replace(/"/g,'&quot;')}" readonly></label><label class="field">E-mail<input name="email" type="email" value="${String(profile.email||api.user.email||'').replace(/"/g,'&quot;')}" required></label><label class="field">Senha atual<input name="currentPassword" type="password" autocomplete="current-password" required></label><label class="field">Nova senha<input name="newPassword" type="password" autocomplete="new-password" minlength="6" placeholder="Deixe vazio para não alterar"></label><label class="field">Confirmar nova senha<input name="confirmPassword" type="password" autocomplete="new-password" placeholder="Repita a nova senha"></label></div><div class="error" id="firebaseAccountError" aria-live="polite"></div><div class="actions"><button>Salvar acesso</button><button type="button" class="secondary" id="firebaseTheme">Alternar modo claro/escuro</button></div></form>`;
    const accountForm = document.querySelector('#firebaseAccountForm');
    accountForm.onsubmit = async event => {
      event.preventDefault(); const data = Object.fromEntries(new FormData(accountForm)), error = document.querySelector('#firebaseAccountError'); error.textContent = '';
      if (data.newPassword && data.newPassword !== data.confirmPassword) { error.textContent = 'A confirmação da nova senha não coincide.'; return; }
      try { await api.updateOwnAccount(data); window.toast?.('Acesso atualizado com sucesso.'); }
      catch (exception) { error.textContent = exception.message || 'Não foi possível atualizar o acesso.'; }
    };
    document.querySelector('#firebaseTheme').onclick = window.toggleTheme;
  }

  api.signIn = async (email, password) => {
    const credential = await sdk.signInWithEmailAndPassword(auth, email, password);
    await synchronizeSession(credential.user);
    if (!api.profile) throw new Error('Seu acesso ainda não foi liberado por um administrador.');
    await sdk.updateDoc(sdk.doc(db, 'users', credential.user.uid), { lastLoginAt: sdk.serverTimestamp() });
    return credential.user;
  };
  api.signOut = () => sdk.signOut(auth);
  api.sendReset = email => sdk.sendPasswordResetEmail(auth, email);
  api.sendVerification = () => auth.currentUser ? sdk.sendEmailVerification(auth.currentUser) : Promise.reject(new Error('Faça login para validar o e-mail.'));
  api.updateOwnAccount = async ({ email, currentPassword, newPassword }) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Sessão expirada. Entre novamente.');
    if (!currentPassword) throw new Error('Informe sua senha atual para confirmar a alteração.');
    await sdk.reauthenticateWithCredential(user, sdk.EmailAuthProvider.credential(user.email, currentPassword));
    const nextEmail = String(email || user.email).trim().toLowerCase();
    if (nextEmail && nextEmail !== user.email) await sdk.updateEmail(user, nextEmail);
    if (newPassword) {
      if (newPassword.length < 6) throw new Error('A nova senha deve ter ao menos 6 caracteres.');
      await sdk.updatePassword(user, newPassword);
    }
    await sdk.updateDoc(sdk.doc(db, 'users', user.uid), { email: auth.currentUser.email, updatedAt: sdk.serverTimestamp() });
    await synchronizeSession(auth.currentUser);
  };
  api.listUsers = async () => {
    await requireStaff();
    const source = sdk.collection(db, 'users');
    const query = api.isAdmin() ? sdk.query(source, sdk.orderBy('nome')) : sdk.query(source, sdk.where('unidadeChave', '==', localStorage.getItem('pep_current_unit_key') || unitKeyOf(api.profile?.unidade)), sdk.orderBy('nome'));
    const snapshot = await sdk.getDocs(query);
    return snapshot.docs.map(item => ({ uid: item.id, ...item.data() }));
  };
  api.listUnits = async () => {
    await api.sessionReady;
    const snapshot = await sdk.getDocs(sdk.query(sdk.collection(db, 'units'), sdk.orderBy('nome')));
    return snapshot.docs.map(item => ({ id:item.id, ...item.data() }));
  };
  api.createUnit = async name => {
    await requireAdmin();
    const normalized = String(name || '').trim();
    if (!normalized) throw new Error('Informe o nome da unidade de ensino.');
    await sdk.setDoc(sdk.doc(db, 'units', unitKeyOf(normalized)), { nome:normalized, chave:unitKeyOf(normalized), updatedAt:sdk.serverTimestamp() }, { merge:true });
  };
  api.watchUsers = async callback => {
    await requireStaff();
    const source = sdk.collection(db, 'users');
    const query = api.isAdmin() ? sdk.query(source, sdk.orderBy('nome')) : sdk.query(source, sdk.where('unidadeChave', '==', localStorage.getItem('pep_current_unit_key') || unitKeyOf(api.profile?.unidade)), sdk.orderBy('nome'));
    return sdk.onSnapshot(query, snapshot => callback(snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))));
  };
  const academicUserData = data => {
    const perfil = String(data.perfil || 'Aluno').trim() || 'Aluno';
    const unidade = String(data.unidade || '').trim();
    const semestre = perfil === 'Aluno' ? String(data.semestre || '').trim() : '';
    if (!unidade) throw new Error('Selecione a unidade de ensino.');
    if (perfil === 'Aluno' && !semestre) throw new Error('Selecione o semestre do aluno.');
    return { perfil, unidade, semestre };
  };
  api.createUser = async data => {
    await requireAdmin();
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    const academic = academicUserData(data);
    if (!email || password.length < 6 || !data.nome) throw new Error('Nome, e-mail e uma senha de pelo menos 6 caracteres são obrigatórios.');
    const secondary = sdk.initializeApp(firebaseConfig, `provisionamento-${Date.now()}`);
    const secondaryAuth = sdk.getAuth(secondary);
    let credential;
    try { credential = await sdk.createUserWithEmailAndPassword(secondaryAuth, email, password); }
    finally { await sdk.signOut(secondaryAuth).catch(() => undefined); await sdk.deleteApp(secondary); }
    await sdk.setDoc(sdk.doc(db, 'users', credential.user.uid), { nome: data.nome.trim(), email, perfil: academic.perfil, status: data.status || 'Ativo', curso: data.curso || 'Enfermagem', semestre: academic.semestre, unidade: academic.unidade, unidadeChave: unitKeyOf(academic.unidade), createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
  };
  api.updateUser = async (uid, data) => {
    await requireAdmin();
    const academic = academicUserData(data);
    await sdk.updateDoc(sdk.doc(db, 'users', uid), { nome: data.nome.trim(), perfil: academic.perfil, status: data.status, curso: data.curso || '', semestre: academic.semestre, unidade: academic.unidade, unidadeChave: unitKeyOf(academic.unidade), updatedAt: sdk.serverTimestamp() });
  };
  api.saveSupportTicket = async data => {
    await api.sessionReady;
    if (!api.user) throw new Error('Entre no sistema para enviar um chamado.');
    await sdk.addDoc(sdk.collection(db, 'supportTickets'), { ownerUid: api.user.uid, nome: data.nome.trim(), email: data.email.trim().toLowerCase(), assunto: data.assunto.trim(), mensagem: data.mensagem.trim(), destinatario: 'simulapep@gmail.com', status: 'Novo', createdAt: sdk.serverTimestamp() });
  };
  api.syncStore = async (store, values) => {
    if (!api.enabled || !api.profile || !storeNames.includes(store)) return;
    const ref = sdk.collection(db, 'workspaces', 'academic', 'units', localStorage.getItem('pep_current_unit_key') || unitKeyOf(api.profile?.unidade), 'stores', store, 'items');
    const existing = await sdk.getDocs(ref);
    const incoming = new Map((values || []).filter(item => item?.id != null).map(item => [String(item.id), item]));
    const batch = sdk.writeBatch(db);
    existing.docs.forEach(item => { if (!incoming.has(item.id)) batch.delete(item.ref); });
    incoming.forEach((payload, id) => batch.set(sdk.doc(ref, id), { payload, updatedAt: sdk.serverTimestamp() }));
    await batch.commit();
  };

  (async () => {
    try {
      const [appSdk, authSdk, firestoreSdk] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
      ]);
      sdk = { ...appSdk, ...authSdk, ...firestoreSdk };
      app = sdk.initializeApp(firebaseConfig); auth = sdk.getAuth(app); db = sdk.getFirestore(app); api.enabled = true;
      sdk.onAuthStateChanged(auth, user => synchronizeSession(user).catch(error => { console.error(error); clearLocalUser(); notifySession({ user: null, profile: null, error }); }));
    } catch (error) {
      console.error('Falha ao iniciar o Firebase.', error); api.startError = error; sessionResolve?.({ user: null, profile: null, error });
    } finally {
      window.__resolvePEPFirebase?.(api);
    }
  })();
})();
