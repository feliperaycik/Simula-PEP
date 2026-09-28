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
  // Apenas estas coleções possuem um caminho remoto e regras de acesso no Firestore.
  // Notificações, chamados e preferências continuam sendo dados locais da sessão.
  const storeNames = ['pacientes','atendimentos','triagens','sinais_vitais','evolucoes','anotacoes_enfermagem','solicitacoes_exames','procedimentos','diagnosticos','planos','prescricoes','prescricoes_cuidados','receitas','avaliacoes','auditoria'];
  const ready = window.PEPFirebaseReady || new Promise(resolve => { window.__resolvePEPFirebase = resolve; });
  window.PEPFirebaseReady = ready;

  const api = { enabled: false, ready, profile: null, user: null, sessionReady: null, hydrationReady: Promise.resolve() };
  api.canSyncStore=store=>storeNames.includes(store);
  window.PEPFirebase = api;
  let app, auth, db, sdk = {}, sessionResolve, profileUnsubscribe, profileWatchUid;
  api.sessionReady = new Promise(resolve => { sessionResolve = resolve; });
  if (window.PEPPreviewLocalOnly === true || localStorage.getItem('pep_preview_local') === '1') {
    api.previewLocalOnly = true;
    api.sessionReady = Promise.resolve({ user: null, profile: null });
    window.__resolvePEPFirebase?.(api);
    return;
  }

  const roleOf = profile => String(profile?.perfil || profile?.role || '').toLocaleLowerCase('pt-BR');
  const unitKeyOf = unit => encodeURIComponent(String(unit || 'Unidade acadêmica').trim() || 'Unidade acadêmica');
  const classKeyOf = classroom => encodeURIComponent(String(classroom || 'Turma acadêmica').trim() || 'Turma acadêmica');
  api.isStaff = profile => ['docente','administrador'].includes(roleOf(profile || api.profile));
  api.isAdmin = profile => roleOf(profile || api.profile) === 'administrador';
  const localUser = (user, profile) => {
    localStorage.setItem('pep_logged', 'true');
    localStorage.setItem('pep_current_email', user.email || profile.email || '');
    localStorage.setItem('pep_current_user', profile.nome || user.displayName || user.email?.split('@')[0] || 'Usuário');
    localStorage.setItem('pep_current_role', profile.perfil || profile.role || 'Aluno');
    const selectedUnit = roleOf(profile)==='administrador' ? localStorage.getItem('pep_admin_unit') : '';
    const unit = selectedUnit || profile.unidade || profile.unidadeEnsino || 'Unidade acadêmica';
    localStorage.setItem('pep_current_unit', unit);
    localStorage.setItem('pep_current_unit_key', unitKeyOf(unit));
    localStorage.setItem('pep_current_turma', profile.turma || 'Turma acadêmica');
    localStorage.setItem('pep_current_turma_key', profile.turmaChave || classKeyOf(profile.turma));
    localStorage.setItem('pep_current_profile_semester', profile.semestre || '');
  };
  const clearLocalUser = () => ['pep_logged','pep_current_email','pep_current_user','pep_current_role','pep_current_unit','pep_current_unit_key','pep_current_turma','pep_current_turma_key','pep_current_profile_semester','pep_selected_semester','pep_admin_unit'].forEach(key => localStorage.removeItem(key));
  const currentPageIsPrivate = () => Boolean(document.body?.dataset?.page);
  const notifySession = detail => window.dispatchEvent(new CustomEvent('pep-firebase-session', { detail }));

  async function getProfile(uid) {
    const snapshot = await sdk.getDoc(sdk.doc(db, 'users', uid));
    return snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null;
  }
  async function hydrateStores() {
    if (!api.profile) return;
    const unitKey=localStorage.getItem('pep_current_unit_key') || unitKeyOf(api.profile?.unidade);
    const classKey=localStorage.getItem('pep_current_turma_key') || classKeyOf(api.profile?.turma);
    const hydrationKey=`pep_firebase_hydrated_${api.user.uid}_${unitKey}_${api.isAdmin()?'all':classKey}`;
    const classes=api.isAdmin() ? await api.listClasses(localStorage.getItem('pep_current_unit')) : [{chave:classKey}];
    // Alguns pacientes anteriores ao cadastro de turmas foram gravados na
    // turma-padrão sem acento. O administrador ainda precisa vê-los.
    const classKeys=[...new Set([...classes.map(item=>item.chave||item.id),classKey,...(api.isAdmin()?[classKeyOf('turma academica')]:[])].filter(Boolean))];
    let downloaded = false;
    for (const store of sessionStorage.getItem(hydrationKey)?['pacientes']:storeNames) {
      const values=[];
      for(const currentClass of classKeys){
        const ref=sdk.collection(db,'workspaces','academic','units',unitKey,'classes',currentClass,'stores',store,'items');
        const remote=store==='avaliacoes'&&!api.isStaff()
          ? await sdk.getDocs(sdk.query(ref,sdk.where('payload.alunoUid','==',api.user.uid)))
          : await sdk.getDocs(ref);
        values.push(...remote.docs.map(item=>item.data().payload).filter(Boolean));
      }
      let local = JSON.parse(localStorage.getItem(`pep_${store}`) || '[]');
      // Recupera somente cadastros legados criados pelo próprio usuário antes
      // de o contexto acadêmico ser gravado no paciente. Não inferimos o
      // contexto de registros de terceiros.
      if(store==='pacientes'){
        const currentUnit=localStorage.getItem('pep_current_unit')||api.profile?.unidade||'Unidade acadêmica';
        const currentClass=localStorage.getItem('pep_current_turma')||api.profile?.turma||'Turma acadêmica';
        const ownedLegacy=local.map(item=>{
          const missingWorkspace=!String(item?.unidade||'').trim()&&!String(item?.turma||'').trim();
          return missingWorkspace&&String(item?.registradoPor?.email||'').toLowerCase()===String(api.user?.email||'').toLowerCase()
            ? {...item,unidade:currentUnit,turma:currentClass}:item;
        });
        if(JSON.stringify(local)!==JSON.stringify(ownedLegacy)){
          local=ownedLegacy;localStorage.setItem(`pep_${store}`,JSON.stringify(local));
        }
      }
      const sameWorkspace=item=>unitKeyOf(item.unidade)===unitKey&&classKeys.includes(classKeyOf(item.turma))&&(store!=='avaliacoes'||api.isStaff()||String(item.alunoUid)===String(api.user.uid));
      if (values.length) {
        const otherContexts=local.filter(item=>!sameWorkspace(item));
        const pendingIds=store==='pacientes'?new Set(JSON.parse(localStorage.getItem('pep_pending_patient_ids')||'[]')):new Set();
        const pendingLocal=local.filter(item=>sameWorkspace(item)&&pendingIds.has(String(item.id)));
        const pendingMap=new Map(pendingLocal.map(item=>[String(item.id),item]));
        const merged=[...otherContexts,...values.map(item=>pendingMap.get(String(item.id))||item),...pendingLocal.filter(item=>!values.some(remote=>String(remote.id)===String(item.id)))];
        if(JSON.stringify(local)!==JSON.stringify(merged)){localStorage.setItem(`pep_${store}`, JSON.stringify(merged));downloaded=true;}
        if(pendingLocal.length){try{await api.syncStore('pacientes',pendingLocal);pendingLocal.forEach(item=>pendingIds.delete(String(item.id)));localStorage.setItem('pep_pending_patient_ids',JSON.stringify([...pendingIds]))}catch(error){console.warn('Pacientes locais ainda aguardam sincronização.',error)}}
      } else if (local.length && (api.isStaff()||store==='pacientes')) {
        const currentValues=local.filter(sameWorkspace);
        await api.syncStore(store, currentValues);
      }
    }
    sessionStorage.setItem(hydrationKey,'1');
    if (downloaded && currentPageIsPrivate()) window.dispatchEvent(new Event('pep-stores-hydrated'));
  }
  async function synchronizeSession(user) {
    api.user = user || null;
    if (!user) {
      profileUnsubscribe?.(); profileUnsubscribe=null; profileWatchUid='';
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
    if(profileWatchUid!==user.uid){
      profileUnsubscribe?.();profileWatchUid=user.uid;
      profileUnsubscribe=sdk.onSnapshot(sdk.doc(db,'users',user.uid),snapshot=>{
        if(!snapshot.exists()||!api.profile)return;
        const updated={uid:snapshot.id,...snapshot.data()};
        const changed=['perfil','status','unidade','turma','semestre','nome'].some(key=>updated[key]!==api.profile[key]);
        if(!changed)return;
        if(updated.status==='Inativo'){sdk.signOut(auth);return;}
        api.profile=updated;localUser(user,updated);notifySession({user,profile:updated});
        if(currentPageIsPrivate())location.reload();
      },error=>console.warn('Não foi possível acompanhar alterações do perfil.',error));
    }
    api.hydrationReady=hydrateStores().catch(error => console.warn('Não foi possível sincronizar os dados locais com o Firebase.', error));
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
    const query = api.isAdmin() ? source : sdk.query(source, sdk.where('unidadeChave', '==', unitKeyOf(api.profile?.unidade)));
    const snapshot = await sdk.getDocs(query);
    return snapshot.docs.map(item => ({ uid: item.id, ...item.data() })).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));
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
    const ref=sdk.doc(db,'units',unitKeyOf(normalized));
    if((await sdk.getDoc(ref)).exists())throw new Error('Esta unidade já está cadastrada.');
    await sdk.setDoc(ref, { nome:normalized, chave:unitKeyOf(normalized), updatedAt:sdk.serverTimestamp() });
  };
  api.listClasses = async unit => {
    await api.sessionReady;
    const snapshot = await sdk.getDocs(sdk.query(sdk.collection(db, 'units', unitKeyOf(unit), 'classes'), sdk.orderBy('nome')));
    return snapshot.docs.map(item => ({ id:item.id, ...item.data() }));
  };
  api.createClass = async (unit, classroom, semester) => {
    await requireAdmin();
    const unidade = String(unit || '').trim(), turma = String(classroom || '').trim(), periodo=String(semester||'').trim();
    if (!unidade || !turma || !window.PEPAcademicContext?.semesters.includes(periodo)) throw new Error('Preencha unidade, turma e semestre.');
    const ref=sdk.doc(db,'units',unitKeyOf(unidade),'classes',classKeyOf(turma));
    if((await sdk.getDoc(ref)).exists())throw new Error('Esta turma já está cadastrada na unidade.');
    await sdk.setDoc(ref,{nome:turma,chave:classKeyOf(turma),unidade,unidadeChave:unitKeyOf(unidade),semestre:periodo,updatedAt:sdk.serverTimestamp()});
  };
  const classHasRecords=async(unit,classroom)=>{
    for(const store of storeNames){
      const ref=sdk.collection(db,'workspaces','academic','units',unitKeyOf(unit),'classes',classKeyOf(classroom),'stores',store,'items');
      if(!(await sdk.getDocs(sdk.query(ref,sdk.limit(1)))).empty)return true;
    }
    return false;
  };
  api.updateClass=async(unit,oldName,newName,semester)=>{
    await requireAdmin();
    const name=String(newName||'').trim();
    if(!name||!window.PEPAcademicContext?.semesters.includes(semester))throw new Error('Preencha turma e semestre.');
    const oldRef=sdk.doc(db,'units',unitKeyOf(unit),'classes',classKeyOf(oldName));
    if(!(await sdk.getDoc(oldRef)).exists())throw new Error('Turma não encontrada.');
    if(classKeyOf(oldName)!==classKeyOf(name)){
      const users=await api.listUsers();
      if(users.some(user=>user.unidadeChave===unitKeyOf(unit)&&user.turmaChave===classKeyOf(oldName))||await classHasRecords(unit,oldName))throw new Error('Esta turma já possui usuários ou registros. Altere apenas o semestre ou crie outra turma.');
      const newRef=sdk.doc(db,'units',unitKeyOf(unit),'classes',classKeyOf(name));
      if((await sdk.getDoc(newRef)).exists())throw new Error('Já existe uma turma com esse nome.');
      const batch=sdk.writeBatch(db);batch.set(newRef,{nome:name,chave:classKeyOf(name),unidade:unit,unidadeChave:unitKeyOf(unit),semestre:semester,updatedAt:sdk.serverTimestamp()});batch.delete(oldRef);await batch.commit();
    }else await sdk.updateDoc(oldRef,{semestre:semester,updatedAt:sdk.serverTimestamp()});
  };
  api.deleteClass=async(unit,name)=>{
    await requireAdmin();
    const users=await api.listUsers();
    if(users.some(user=>user.unidadeChave===unitKeyOf(unit)&&user.turmaChave===classKeyOf(name))||await classHasRecords(unit,name))throw new Error('Esta turma possui usuários ou registros e não pode ser excluída.');
    await sdk.deleteDoc(sdk.doc(db,'units',unitKeyOf(unit),'classes',classKeyOf(name)));
  };
  api.deleteUnit=async unit=>{
    await requireAdmin();
    if((await api.listClasses(unit)).length||(await api.listUsers()).some(user=>user.unidadeChave===unitKeyOf(unit)))throw new Error('Esta unidade possui turmas ou usuários. Remova os vínculos antes de excluí-la.');
    await sdk.deleteDoc(sdk.doc(db,'units',unitKeyOf(unit)));
  };
  api.watchUsers = async callback => {
    await requireStaff();
    const source = sdk.collection(db, 'users');
    const query = api.isAdmin() ? source : sdk.query(source, sdk.where('unidadeChave', '==', unitKeyOf(api.profile?.unidade)));
    return sdk.onSnapshot(query, snapshot => callback(snapshot.docs.map(item => ({ uid: item.id, ...item.data() })).sort((a,b)=>String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'))));
  };
  const academicUserData = data => {
    const perfil = String(data.perfil || 'Aluno').trim() || 'Aluno';
    const unidade = String(data.unidade || '').trim();
    const turma = String(data.turma || '').trim();
    const semestre = ['Aluno','Docente'].includes(perfil) ? String(data.semestre || '').trim() : '';
    if (!unidade) throw new Error('Selecione a unidade de ensino.');
    if (['Aluno','Docente'].includes(perfil) && !turma) throw new Error('Selecione a turma do usuário.');
    if (['Aluno','Docente'].includes(perfil) && !window.PEPAcademicContext?.semesters.includes(semestre)) throw new Error('Selecione um semestre válido para o aluno ou docente.');
    return { perfil, unidade, turma:turma || 'Turma acadêmica', semestre };
  };
  api.createUser = async data => {
    await requireStaff();
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '');
    const academic = academicUserData(data);
    if(!api.isAdmin()){
      if(academic.perfil!=='Aluno'||unitKeyOf(academic.unidade)!==unitKeyOf(api.profile?.unidade))throw new Error('Docentes só podem cadastrar alunos da própria unidade.');
      const classes=await api.listClasses(academic.unidade);
      if(!classes.some(item=>item.chave===classKeyOf(academic.turma)||item.nome===academic.turma))throw new Error('Selecione uma turma cadastrada na sua unidade.');
    }
    if (!email || password.length < 6 || !data.nome) throw new Error('Nome, e-mail e uma senha de pelo menos 6 caracteres são obrigatórios.');
    const secondary = sdk.initializeApp(firebaseConfig, `provisionamento-${Date.now()}`);
    const secondaryAuth = sdk.getAuth(secondary);
    let credential;
    try {
      credential = await sdk.createUserWithEmailAndPassword(secondaryAuth, email, password);
      await sdk.setDoc(sdk.doc(db, 'users', credential.user.uid), { nome: data.nome.trim(), email, perfil: academic.perfil, status: data.status || 'Ativo', curso: data.curso || 'Enfermagem', semestre: academic.semestre, unidade: academic.unidade, unidadeChave: unitKeyOf(academic.unidade), turma:academic.turma, turmaChave:classKeyOf(academic.turma), createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
    }
    catch(error){if(credential?.user)await sdk.deleteUser(credential.user).catch(()=>undefined);throw error;}
    finally { await sdk.signOut(secondaryAuth).catch(() => undefined); await sdk.deleteApp(secondary); }
  };
  api.updateUser = async (uid, data) => {
    await requireAdmin();
    const academic = academicUserData(data);
    if(uid===api.user?.uid&&(academic.perfil!=='Administrador'||data.status!=='Ativo'))throw new Error('Não é possível remover o próprio acesso de administrador.');
    await sdk.updateDoc(sdk.doc(db, 'users', uid), { nome: data.nome.trim(), perfil: academic.perfil, status: data.status, curso: data.curso || '', semestre: academic.semestre, unidade: academic.unidade, unidadeChave: unitKeyOf(academic.unidade), turma:academic.turma, turmaChave:classKeyOf(academic.turma), updatedAt: sdk.serverTimestamp() });
  };
  api.setUserStatus = async (uid, status) => {
    await requireAdmin();
    if(!['Ativo','Inativo'].includes(status))throw new Error('Status inválido.');
    if(uid===api.user?.uid&&status==='Inativo')throw new Error('Não é possível desativar o próprio acesso de administrador.');
    await sdk.updateDoc(sdk.doc(db,'users',uid),{status,updatedAt:sdk.serverTimestamp()});
  };
  api.saveSupportTicket = async data => {
    await api.sessionReady;
    if (!api.user) throw new Error('Entre no sistema para enviar um chamado.');
    await sdk.addDoc(sdk.collection(db, 'supportTickets'), { ownerUid: api.user.uid, nome: data.nome.trim(), email: data.email.trim().toLowerCase(), assunto: data.assunto.trim(), mensagem: data.mensagem.trim(), destinatario: 'simulapep@gmail.com', status: 'Novo', createdAt: sdk.serverTimestamp() });
  };
  api.saveAppointment = async (data, previous = null) => {
    if(!api.enabled)return false;
    await api.sessionReady;
    if(!api.profile)throw new Error('Sessão expirada. Entre novamente.');
    if(!api.isStaff()&&String(data.aluno||'').trim()!==String(api.profile.nome||'').trim())throw new Error('O agendamento deve usar o nome do aluno autenticado.');
    window.PEPAppointmentSlot?.validate(data,[],data.id);
    const unit=String(data.unidade||localStorage.getItem('pep_current_unit')||'').trim();
    const classroom=String(data.turma||localStorage.getItem('pep_current_turma')||'').trim();
    if(!unit||!classroom)throw new Error('Selecione a unidade e a turma do agendamento.');
    const unitKey=unitKeyOf(unit),classKey=classKeyOf(classroom);
    if(!api.isAdmin()&&unitKey!==unitKeyOf(api.profile?.unidade))throw new Error('Esta unidade não pertence ao seu acesso.');
    if(!api.isAdmin()&&classKey!==classKeyOf(api.profile?.turma))throw new Error('Esta turma não pertence ao seu acesso.');
    // Alunos não podem consultar atendimentos de outras turmas. A reserva
    // atômica em slots já impede colisões de horário em toda a unidade.
    const classNames=api.isStaff()?await api.listClasses(unit):[];
    const classKeys=[...new Set([...classNames.map(item=>item.chave||item.id),classKey,previous?.turma?classKeyOf(previous.turma):''].filter(Boolean))];
    if(data.status!=='Cancelado'){
      for(const key of classKeys){
        const ref=sdk.collection(db,'workspaces','academic','units',unitKey,'classes',key,'stores','atendimentos','items');
        const snapshot=await sdk.getDocs(ref);
        if(snapshot.docs.some(doc=>{const item=doc.data().payload;return item&&String(item.id)!==String(data.id)&&item.status!=='Cancelado'&&item.data===data.data&&item.hora===data.hora;}))throw new Error('Este horário já está ocupado.');
      }
    }
    const appointmentRef=sdk.doc(db,'workspaces','academic','units',unitKey,'classes',classKey,'stores','atendimentos','items',String(data.id));
    const slotRef=(date,time)=>sdk.doc(db,'workspaces','academic','units',unitKey,'slots',`${date}_${time.replace(':','')}`);
    const targetSlot=data.status==='Cancelado'?null:slotRef(data.data,data.hora);
    const oldSlot=previous&&previous.status!=='Cancelado'?slotRef(previous.data,previous.hora):null;
    const previousRef=previous?.turma&&classKeyOf(previous.turma)!==classKey
      ?sdk.doc(db,'workspaces','academic','units',unitKey,'classes',classKeyOf(previous.turma),'stores','atendimentos','items',String(data.id)):null;
    await sdk.runTransaction(db,async transaction=>{
      const target=targetSlot?await transaction.get(targetSlot):null;
      const old=oldSlot&&(!targetSlot||oldSlot.path!==targetSlot.path)?await transaction.get(oldSlot):null;
      if(target?.exists()&&String(target.data().appointmentId)!==String(data.id))throw new Error('Este horário já está ocupado.');
      if(old?.exists()&&String(old.data().appointmentId)===String(data.id))transaction.delete(oldSlot);
      if(targetSlot)transaction.set(targetSlot,{appointmentId:String(data.id),turmaChave:classKey,data:data.data,hora:data.hora,updatedAt:sdk.serverTimestamp()});
      transaction.set(appointmentRef,{payload:data,updatedAt:sdk.serverTimestamp()},{merge:true});
      if(previousRef)transaction.delete(previousRef);
    });
    return true;
  };
  api.syncStore = async (store, values, removedIds = []) => {
    if (!api.enabled || !storeNames.includes(store)) return;
    if (!api.profile) throw new Error('Sessão expirada. Entre novamente para salvar os dados.');
    const unitKey=localStorage.getItem('pep_current_unit_key') || unitKeyOf(api.profile?.unidade);
    const classKey=item=>api.isAdmin()&&item?.turma?classKeyOf(item.turma):(localStorage.getItem('pep_current_turma_key')||classKeyOf(api.profile?.turma));
    const ref=item=>sdk.collection(db,'workspaces','academic','units',unitKey,'classes',classKey(item),'stores',store,'items');
    const incoming = new Map((values || []).filter(item => item?.id != null).map(item => [String(item.id), item]));
    const operations=[];
    // Nunca excluir a coleção inteira a partir de uma cópia local: outro usuário
    // pode ter salvo um registro que ainda não foi hidratado neste navegador.
    incoming.forEach((payload, id) => operations.push(['set',sdk.doc(ref(payload), id),payload]));
    removedIds.forEach(entry=>{const item=typeof entry==='object'?entry:{id:entry};operations.push(['delete',sdk.doc(ref(item),String(item.id))]);});
    for(let index=0;index<operations.length;index+=400){
      const batch=sdk.writeBatch(db);
      operations.slice(index,index+400).forEach(([kind,target,payload])=>kind==='set'?batch.set(target,{payload,updatedAt:sdk.serverTimestamp()},{merge:true}):batch.delete(target));
      await batch.commit();
    }
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
