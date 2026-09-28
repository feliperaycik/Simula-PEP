/* Entrada da página independente; a mesma gestão é reutilizada em Configurações. */
(async()=>{
  const firebase=await window.PEPFirebaseReady;
  if(!firebase.enabled){document.querySelector('#app').innerHTML='<main class="content"><h1>Gestão de usuários</h1><p>O Firebase não pôde ser iniciado.</p></main>';return;}
  const {profile}=await firebase.sessionReady;
  if(!firebase.isStaff(profile)){location.replace('configuracoes.html');return;}
  shell('<section id="standaloneUserManagement"></section>',firebase.isAdmin(profile)?'Gestão de usuários':'Alunos da unidade');
  await window.mountUserManagement(document.querySelector('#standaloneUserManagement'));
})().catch(error=>{console.error(error);window.toast?.('Não foi possível carregar a gestão de usuários.','error')});
