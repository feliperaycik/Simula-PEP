/* Núcleo compartilhado: autenticação, persistência, navegação e layout. */
const appStyle=document.createElement('link');appStyle.rel='stylesheet';appStyle.href='css/app-modern.css?v=17-20260911';document.head.append(appStyle);const brandStyle=document.createElement('link');brandStyle.rel='stylesheet';brandStyle.href='css/brand.css?v=17-20260911';document.head.append(brandStyle);const headerBrandStyle=document.createElement('link');headerBrandStyle.rel='stylesheet';headerBrandStyle.href='css/header-brand.css?v=17-20260911';document.head.append(headerBrandStyle);const themeStyle=document.createElement('link');themeStyle.rel='stylesheet';themeStyle.href='css/theme.css?v=20260926a';document.head.append(themeStyle);window.PEPFirebaseReady=window.PEPFirebaseReady||new Promise(resolve=>{window.__resolvePEPFirebase=resolve});const firebaseService=document.createElement('script');firebaseService.src='js/firebase-service.js?v=20260926b';firebaseService.defer=true;document.head.append(firebaseService);const accessibilityScript=document.createElement('script');accessibilityScript.src='js/accessibility.js?v=20260926a';accessibilityScript.defer=true;document.head.append(accessibilityScript);
const utilitiesStyle=document.createElement('link');utilitiesStyle.rel='stylesheet';utilitiesStyle.href='css/portal-utilities.css?v=academic-tools-20260918';document.head.append(utilitiesStyle);const academicRefinementStyle=document.createElement('link');academicRefinementStyle.rel='stylesheet';academicRefinementStyle.href='css/academic-refinement.css?v=20260917';document.head.append(academicRefinementStyle);const utilitiesScript=document.createElement('script');utilitiesScript.src='js/portal-utilities.js?v=20260924-2';utilitiesScript.defer=true;document.head.append(utilitiesScript);const globalEvaluationScript=document.createElement('script');globalEvaluationScript.src='js/evaluation-panel.js?v=20260926a';globalEvaluationScript.defer=true;document.head.append(globalEvaluationScript);
const adminContextScript=document.createElement('script');adminContextScript.src='js/admin-context.js?v=20260922';adminContextScript.defer=true;document.head.append(adminContextScript);
const scopedStores=new Set(['pacientes','atendimentos','triagens','sinais_vitais','evolucoes','anotacoes_enfermagem','solicitacoes_exames','procedimentos','diagnosticos','planos','prescricoes','prescricoes_cuidados','receitas','avaliacoes','auditoria']);
const semesterStores=new Set(['atendimentos','avaliacoes']);
const semesterTaggedStores=new Set(['atendimentos','triagens','sinais_vitais','evolucoes','anotacoes_enfermagem','solicitacoes_exames','procedimentos','diagnosticos','planos','prescricoes','prescricoes_cuidados','receitas','avaliacoes']);
const normalizeAcademicValue=value=>String(value||'').trim().toLocaleLowerCase('pt-BR');
const academicContext=()=>({
  role:normalizeAcademicValue(localStorage.getItem('pep_current_role')),
  unit:String((normalizeAcademicValue(localStorage.getItem('pep_current_role'))==='administrador'?localStorage.getItem('pep_admin_unit'):null)||localStorage.getItem('pep_current_unit')||'Unidade acadêmica').trim()||'Unidade acadêmica',
  classroom:String(localStorage.getItem('pep_current_turma')||'Turma acadêmica').trim()||'Turma acadêmica',
  semester:String((normalizeAcademicValue(localStorage.getItem('pep_current_role'))==='administrador'?localStorage.getItem('pep_selected_semester'):localStorage.getItem('pep_current_profile_semester'))||'').trim()
});
const belongsToContext=(key,item,context=academicContext())=>{
  if(!scopedStores.has(key)||!item)return true;
  const sameUnit=normalizeAcademicValue(item.unidade||'Unidade acadêmica')===normalizeAcademicValue(context.unit);
  const sameClass=context.role==='administrador'||normalizeAcademicValue(item.turma||'Turma acadêmica')===normalizeAcademicValue(context.classroom);
  if(!sameUnit||!sameClass)return false;
  const roleUsesSemester=['docente','aluno','administrador'].includes(context.role);
  return !semesterStores.has(key)||!roleUsesSemester||!context.semester||String(item.semestre||'')===context.semester;
};
const mergeContextSave=(key,previous,next)=>{
  if(!scopedStores.has(key))return next;
  const context=academicContext(), kept=previous.filter(item=>!belongsToContext(key,item,context));
  const prepared=next.map(item=>{
    // Registros novos ainda não carregam metadados acadêmicos. Sem preenchê-los
    // antes da comparação, eles ficam fora do próprio contexto que os criou.
    const result={...item,
      unidade:String(item.unidade||'').trim()||context.unit,
      turma:String(item.turma||'').trim()||context.classroom};
    if(!belongsToContext(key,result,context))return item;
    if(semesterTaggedStores.has(key)&&context.semester)result.semestre=result.semestre||context.semester;
    return result;
  });
  return [...kept,...prepared];
};
window.PEPAcademicContext={get:academicContext,belongs:belongsToContext,mergeForSave:mergeContextSave,semesters:Array.from({length:8},(_,index)=>`${index+1}º semestre`)};
window.PEPAppointmentSlot={
  validate(item,existing=[],editingId=item?.id){
    const time=String(item?.hora||'');
    if(!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time))throw new Error('Selecione um horário em intervalos de 15 minutos.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(item?.data||'')))throw new Error('Selecione uma data válida.');
    if(item.status==='Cancelado')return;
    if(existing.some(other=>String(other.id)!==String(editingId)&&other.status!=='Cancelado'&&other.data===item.data&&other.hora===time&&normalizeAcademicValue(other.unidade||'Unidade acadêmica')===normalizeAcademicValue(item.unidade||'Unidade acadêmica')))throw new Error('Este horário já está ocupado.');
  }
};
const DB={get:k=>JSON.parse(localStorage.getItem('pep_'+k)||'[]').filter(item=>belongsToContext(k,item)),set:auditedSave,id:()=>Date.now()+Math.floor(Math.random()*999)};
const save=(k,v,options)=>DB.set(k,v,options),load=k=>DB.get(k);window.salvarDados=save;window.carregarDados=load;
function seed(){if(window.PEPPreviewLocalOnly!==true&&localStorage.getItem('pep_preview_local')!=='1')return;if(!localStorage.getItem('pep_seed')){save('pacientes',[{id:1,nome:'Maria Oliveira',cpf:'000.000.000-00',nascimento:'1995-04-12',sexo:'Feminino',sangue:'O+',alergias:'Nenhuma conhecida',telefone:'(11) 99999-0001',unidade:'Unidade acadêmica',turma:'Turma acadêmica'},{id:2,nome:'João Santos',cpf:'111.111.111-11',nascimento:'1988-09-20',sexo:'Masculino',sangue:'A+',alergias:'Dipirona',telefone:'(11) 99999-0002',unidade:'Unidade acadêmica',turma:'Turma acadêmica'}]);save('atendimentos',[{id:1,pacienteId:1,data:'2026-08-27',hora:'09:00',tipo:'Consulta de enfermagem',status:'Concluído',aluno:'Aluno(a) PEP',unidade:'Unidade acadêmica',turma:'Turma acadêmica',semestre:'1º semestre'}]);save('notificacoes',[{texto:'Ambiente acadêmico iniciado.',data:new Date().toLocaleString('pt-BR')}]);localStorage.setItem('pep_seed','1')}}seed();
if(localStorage.getItem('pep_logged')!=='true')location.href='index.html';
if(localStorage.getItem('pep_dark')==='1')document.body.classList.add('dark');
window.toggleTheme=()=>{document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');localStorage.setItem('pep_dark',dark?'1':'0');document.querySelectorAll('.theme-toggle').forEach(button=>{button.textContent=dark?'☀':'☾';button.title=dark?'Ativar modo claro':'Ativar modo escuro';button.setAttribute('aria-label',button.title)})};
function applyAccessibility(){const scale=Number(localStorage.getItem('pep_font_scale')||1);document.documentElement.style.setProperty('--a11y-scale',String(scale))};applyAccessibility();window.adjustFont=delta=>{const current=Number(localStorage.getItem('pep_font_scale')||1),next=Math.min(1.4,Math.max(.9,Math.round((current+delta)*10)/10));localStorage.setItem('pep_font_scale',String(next));applyAccessibility()};window.resetAccessibility=()=>{localStorage.removeItem('pep_font_scale');localStorage.removeItem('pep_reduce_motion');applyAccessibility()};window.toggleAccessibility=e=>{e.stopPropagation();document.querySelector('#accessibilityPanel')?.classList.toggle('show')};
function narrationEnabled(){return localStorage.getItem('pep_narration')==='1'}function narrate(text){if(!narrationEnabled()||!('speechSynthesis'in window)||!text)return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(String(text).replace(/\s+/g,' ').trim());utterance.lang='pt-BR';utterance.rate=.95;speechSynthesis.speak(utterance)}window.toggleNarration=()=>{const enabled=!narrationEnabled();localStorage.setItem('pep_narration',enabled?'1':'0');if(!enabled&&'speechSynthesis'in window)speechSynthesis.cancel();ensureNarrationControl();if(enabled)narrate('Narração ativada')};function ensureNarrationControl(){const panel=document.querySelector('#accessibilityPanel');if(!panel)return;let button=document.querySelector('#narrationToggle'),reset=document.querySelector('#resetAccessibility');if(!button){button=document.createElement('button');button.id='narrationToggle';button.type='button';button.onclick=toggleNarration;panel.insertBefore(button,reset)}else if(reset&&button.nextElementSibling!==reset)panel.insertBefore(button,reset);const label=(narrationEnabled()?'Desativar':'Ativar')+' narração';if(button.textContent!==label)button.textContent=label}const resetAccessibilityBase=window.resetAccessibility;window.resetAccessibility=()=>{resetAccessibilityBase();localStorage.removeItem('pep_narration');if('speechSynthesis'in window)speechSynthesis.cancel();ensureNarrationControl()};document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(narrationEnabled()){const title=document.querySelector('.page-head h1')?.textContent||document.title,subtitle=document.querySelector('.page-head .muted')?.textContent||'';narrate(title+'. '+subtitle)}},80));document.addEventListener('click',e=>{if(!narrationEnabled())return;const control=e.target.closest('button,a');if(control&&!control.closest('#accessibilityPanel'))narrate(control.getAttribute('aria-label')||control.textContent)});document.addEventListener('focusin',e=>{if(!narrationEnabled()||!e.target.matches('input,select,textarea'))return;const label=e.target.closest('label');narrate(label?.childNodes[0]?.textContent||e.target.name||e.target.placeholder)});
const page=document.body.dataset.page;const nav=[['dashboard.html','<img class="menu-icon menu-icon-light" src="assets/menu-dash.svg?v=afd7680c72b0" alt="" aria-hidden="true"><img class="menu-icon menu-icon-dark" src="assets/menu-dash-dark.svg?v=87cbea78e215" alt="" aria-hidden="true">','Agenda'],['atendimento.html','<img class="menu-icon menu-icon-light" src="assets/menu-atendimento.svg?v=6919c4b20fea" alt="" aria-hidden="true"><img class="menu-icon menu-icon-dark" src="assets/menu-atendimento-dark.svg?v=ca512808d787" alt="" aria-hidden="true">','Triagem'],['relatorios.html','<img class="menu-icon menu-icon-light" src="assets/menu-relatorio.svg?v=f82f2d005610" alt="" aria-hidden="true"><img class="menu-icon menu-icon-dark" src="assets/menu-relatorio-dark.svg?v=7e9488fecb37" alt="" aria-hidden="true">','Relatórios']],recordTabs=[['resumo','Ficha'],['triagens','Reg. TRI'],['sinais-vitais','Sinais vitais'],['evolucoes','Evolução'],['anotacoes-enfermagem','Anotação de Enfermagem'],['solicitacoes-procedimentos','Exames/Procedimentos'],['diagnostico-plano','Diagnostico/Plano de cuidado'],['prescricoes','Prescrição'],['receituario','Receituário'],['ficha-completa','Ficha completa']];
function currentIdentity(){const email=localStorage.getItem('pep_current_email')||'aluno@pep.com',name=localStorage.getItem('pep_current_user')||email.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,l=>l.toUpperCase()),parts=name.trim().split(/\s+/).filter(Boolean),initials=(parts.length>1?parts[0][0]+parts[parts.length-1][0]:email.split('@')[0].slice(0,2)).toUpperCase();return{name,email,initials}}
function unreadNotifications(){return Math.max(load('notificacoes').length-Number(localStorage.getItem('pep_notifications_seen')||0),0)}
function navActive(target){const wanted=new URL(target,location.href),current=new URL(location.href),samePage=current.pathname.endsWith(wanted.pathname.split('/').pop());if(!samePage)return false;const wantedNovo=wanted.searchParams.get('novo'),currentNovo=current.searchParams.get('novo');const wantedTab=wanted.searchParams.get('tab'),currentTab=current.searchParams.get('tab');if(wantedNovo!==null)return currentNovo===wantedNovo;if(currentNovo!==null)return false;if(wantedTab!==null)return currentTab===wantedTab;if(currentTab!==null)return false;return true}
window.toggleRecords=button=>{const submenu=document.querySelector('#recordSubmenu');if(!submenu)return;if(!location.pathname.endsWith('prontuario.html'))submenu.innerHTML='<a href="pacientes.html?prontuario=1">Selecionar paciente para abrir o prontuário</a>';const open=!submenu.classList.contains('show');submenu.classList.toggle('show',open);button.classList.toggle('open',open);button.setAttribute('aria-expanded',String(open));};
window.togglePatients=()=>{location.href='pacientes.html'};
function sidebarCalendarMarkup(){const today=new Date(),savedDay=localStorage.getItem('pep_agenda_date'),savedMonth=localStorage.getItem('pep_agenda_month')||savedDay,view=new Date(savedMonth?`${savedMonth.slice(0,7)}-01T12:00:00`:today),selected=new Date(savedDay?`${savedDay}T12:00:00`:today),year=view.getFullYear(),month=view.getMonth(),first=new Date(year,month,1).getDay(),last=new Date(year,month+1,0).getDate(),name=view.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),iso=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;return `<section class="sidebar-calendar" aria-label="Calendário da agenda"><div class="sidebar-calendar-title">Calendário</div><div class="sidebar-calendar-header"><button type="button" onclick="sidebarCalendarMonth(-1)" aria-label="Mês anterior">‹</button><div class="sidebar-calendar-month">${name}</div><button type="button" onclick="sidebarCalendarMonth(1)" aria-label="Próximo mês">›</button></div><div class="sidebar-calendar-week">${['D','S','T','Q','Q','S','S'].map(day=>`<span>${day}</span>`).join('')}</div><div class="sidebar-calendar-days">${Array.from({length:first},()=>'<span></span>').join('')}${Array.from({length:last},(_,index)=>{const day=index+1,date=new Date(year,month,day),value=iso(date),selectedDay=value===iso(selected),todayDay=value===iso(today);return `<button type="button" class="${selectedDay?'selected ':''}${todayDay?'today':''}" onclick="sidebarAgendaDate('${value}')" aria-label="Abrir agenda em ${date.toLocaleDateString('pt-BR')}">${day}</button>`}).join('')}</div></section>`}window.sidebarAgendaDate=value=>{localStorage.setItem('pep_agenda_date',value);localStorage.setItem('pep_agenda_month',`${value.slice(0,7)}-01`);location.href='dashboard.html'};window.sidebarCalendarMonth=delta=>{const saved=localStorage.getItem('pep_agenda_month')||localStorage.getItem('pep_agenda_date'),base=new Date(saved?`${saved.slice(0,7)}-01T12:00:00`:new Date());base.setMonth(base.getMonth()+delta);localStorage.setItem('pep_agenda_month',`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`);location.reload()};
function navigationMarkup(){const current=new URL(location.href),recordPage=current.pathname.endsWith('prontuario.html'),patientPage=current.pathname.endsWith('pacientes.html')||current.pathname.endsWith('perfil-paciente.html'),newPatient=current.searchParams.has('novo'),activeTab=current.searchParams.get('tab')||'resumo',role=String(localStorage.getItem('pep_current_role')||'').toLocaleLowerCase('pt-BR'),regular=nav.map(n=>`<a class="${navActive(n[0])?'active':''}" href="${n[0]}"><span aria-hidden="true">${n[1]}</span>${n[2]}</a>`),patients=`<a class="${patientPage?'active':''}" href="pacientes.html"><img class="menu-icon menu-icon-light" src="assets/menu-paciente.svg?v=84aeb996f8a0" alt="" aria-hidden="true"><img class="menu-icon menu-icon-dark" src="assets/menu-paciente-dark.svg?v=c54f917665df" alt="" aria-hidden="true"><span>Pacientes</span></a>`,record=`<button class="nav-parent ${recordPage?'active open':''}" onclick="toggleRecords(this)" aria-expanded="${recordPage}"><img class="menu-icon menu-icon-light" src="assets/menu-prontuario.svg?v=67e5eee86e69" alt="" aria-hidden="true"><img class="menu-icon menu-icon-dark" src="assets/menu-prontuario-dark.svg?v=1c3897053589" alt="" aria-hidden="true"><span>Prontuário</span><i class="record-chevron" aria-hidden="true">›</i></button><div class="nav-submenu ${recordPage?'show':''}" id="recordSubmenu">${recordTabs.map(([tab,label])=>`<a class="${recordPage&&activeTab===tab?'active':''}" href="prontuario.html?${current.searchParams.get('id') ? 'id=' + encodeURIComponent(current.searchParams.get('id')) + '&' : ''}tab=${tab}">${label}</a>`).join('')}</div>`;regular.splice(1,0,patients);regular.splice(3,0,record);if(['docente','administrador','aluno'].includes(role))regular.push(`<a class="${current.pathname.endsWith('avaliacoes.html')?'active':''}" href="avaliacoes.html">${pepIcon('assessment')}<span>${role==='aluno'?'Minha avaliação':'Avaliações'}</span></a>`);return regular.join('')}
function academicUtilityMarkup(){return `<footer class="portal-utility-bar" id="portalUtilityBar"><span class="utility-academic-notice">⚠ AMBIENTE ACADÊMICO — DADOS FICTÍCIOS — SEM VALIDADE CLÍNICA OU LEGAL</span><a href="suporte.html" class="utility-support">Suporte</a><button type="button" class="utility-notes" onclick="openPrivateNotes()">Anotações</button><button type="button" class="utility-accessibility" onclick="toggleAccessibility(event)" aria-controls="accessibilityPanel" aria-expanded="false"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="6" r="3"/><path d="M5 12l11 3 11-3M16 15v6m0 0-6 8m6-8 6 8"/></svg>Acessibilidade</button><button type="button" class="utility-top" onclick="scrollToPortalTop()" aria-label="Voltar ao topo" title="Voltar ao topo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg></button></footer>`}
function shell(content,title){const dark=document.body.classList.contains('dark'),identity=currentIdentity(),unread=unreadNotifications();document.querySelector('#app').innerHTML=`<div class="app"><aside class="sidebar" id="side"><a class="brand" href="dashboard.html" aria-label="Ir para a Agenda" title="Ir para a Agenda"><span class="brand-mark">✚</span>PEP</a><nav class="nav"><label class="portal-search"><span class="sr-only">Buscar no portal</span><input type="search" id="portalSearch" placeholder="Buscar no portal..." oninput="searchPortal(this.value)" aria-controls="portalResults"></label><div id="portalResults" class="search-results" hidden></div><div class="nav-section">Menu principal</div>${navigationMarkup()}</nav></aside><main class="main"><header class="topbar"><button class="menu-toggle secondary" onclick="side.classList.toggle('open')">☰</button><strong>Prontuário Eletrônico do Paciente</strong><div class="top-actions"><button class="theme-toggle" onclick="toggleTheme()" title="${dark?'Ativar modo claro':'Ativar modo escuro'}" aria-label="${dark?'Ativar modo claro':'Ativar modo escuro'}">${dark?'☀':'☾'}</button><button class="bell" onclick="toggleNotify()" title="Notificações" aria-label="Abrir notificações" aria-controls="notify" aria-expanded="false"><img class="bell-light" src="assets/notification-bell.png?v=27742156da75" alt=""><img class="bell-dark" src="assets/notification-bell-dark.png?v=8cd547d2e4f0" alt=""><i class="badge${unread?'':' hidden'}">${unread}</i></button><button class="user-trigger" onclick="toggleProfile(event)" aria-label="Abrir menu do perfil" aria-expanded="false"><span class="user-name">${identity.name}</span><span class="avatar">${identity.initials}</span><span class="chevron">⌄</span></button><div class="account-menu" id="accountMenu"><div class="account-summary"><span class="avatar large">${identity.initials}</span><div><strong>${identity.name}</strong><small>${identity.email}</small></div></div><a href="configuracoes.html">⚙ Configurações</a><a href="suporte.html">? Suporte</a><button onclick="logout()">↪ Sair</button></div></div></header><section class="content"><div class="page-head"><div><h1>${title}</h1><span class="muted">Simulação de atendimentos de Enfermagem</span></div></div>${content}</section>${academicUtilityMarkup()}</main></div><div class="notify-panel" id="notify"><strong>Notificações</strong><div class="notification-list">${notificationMarkup()}</div><button type="button" class="outline" onclick="showAllNotifications()">Visualizar tudo</button></div><div class="modal" id="modal"><div class="modal-box" id="modalBox"></div></div><div id="toast" class="toast"></div>`;window.dispatchEvent(new Event('pep-shell-rendered'))}
function toast(text,type='success'){const t=document.querySelector('#toast');t.textContent=text;t.className='toast '+type+' show';setTimeout(()=>t.classList.remove('show'),3600)}window.toast=toast;function updateUnreadBadge(){const badge=document.querySelector('.badge');if(!badge)return;const unread=unreadNotifications();badge.textContent=unread;badge.classList.toggle('hidden',unread===0)}function note(text){const n=load('notificacoes');n.push({texto:text,data:new Date().toLocaleString('pt-BR')});save('notificacoes',n);updateUnreadBadge()}window.note=note;window.toggleNotify=()=>{const panel=document.querySelector('#notify'),opening=!panel.classList.contains('show');panel.classList.toggle('show');document.querySelector('.bell')?.setAttribute('aria-expanded',String(opening));document.querySelector('#accountMenu')?.classList.remove('show');if(opening){panel.querySelector('.notification-list').innerHTML=notificationMarkup();localStorage.setItem('pep_notifications_seen',String(load('notificacoes').length));updateUnreadBadge()}};window.toggleProfile=e=>{e.stopPropagation();const menu=document.querySelector('#accountMenu'),opening=!menu.classList.contains('show');closeNotifications();menu.classList.toggle('show');e.currentTarget.setAttribute('aria-expanded',String(opening))};document.addEventListener('click',e=>{if(!e.target.closest('.top-actions'))document.querySelector('#accountMenu')?.classList.remove('show')});window.logout=()=>{document.querySelector('#accountMenu')?.classList.remove('show');modal(`<div class="logout-confirm"><div class="logout-symbol">↪</div><h3>Deseja sair do sistema?</h3><p class="muted">Você retornará para a tela de acesso.</p><div class="actions"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="danger" onclick="confirmLogout()">Sair</button></div></div>`,true)};window.confirmLogout=()=>{localStorage.removeItem('pep_logged');location.href='index.html'};window.modal=(html,hideHeader=false)=>{document.querySelector('#modalBox').innerHTML=`${hideHeader?'':`<div class="modal-head"><h2>PEP</h2><button class="close" onclick="closeModal()">×</button></div>`}${html}`;document.querySelector('#modal').classList.add('active')};window.closeModal=()=>document.querySelector('#modal').classList.remove('active');
const age=d=>d?Math.floor((Date.now()-new Date(d))/31557600000):'—';window.patient=()=>load('pacientes').find(p=>String(p.id)===new URLSearchParams(location.search).get('id'));
function dashboard(){const p=load('pacientes'),a=load('atendimentos'),tr=load('triagens');shell(`<div class="grid cards"><div class="card">Pacientes cadastrados<div class="metric">${p.length}</div></div><div class="card">Atendimentos realizados<div class="metric">${a.length}</div></div><div class="card">Triagens<div class="metric">${tr.length}</div></div><div class="card">Em andamento<div class="metric">${a.filter(x=>x.status==='Em andamento').length}</div></div></div><h2>Atendimentos recentes</h2>${table(a.slice(-6).reverse(),p)}`,'Dashboard')}
function table(a,p=load('pacientes')){return `<div class="table-wrap"><table><thead><tr><th>Paciente</th><th>Data</th><th>Tipo</th><th>Status</th><th>Responsável</th><th>Ações</th></tr></thead><tbody>${a.map(x=>`<tr><td>${p.find(q=>q.id==x.pacienteId)?.nome||'—'}</td><td>${fmt(x.data)}</td><td>${x.tipo}</td><td><span class="status">${x.status}</span></td><td>${x.aluno}</td><td><a class="btn outline" href="prontuario.html?id=${x.pacienteId}">Abrir</a></td></tr>`).join('')||'<tr><td colspan="6">Nenhum atendimento registrado.</td></tr>'}</tbody></table></div>`}window.table=table;const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'—';window.fmt=fmt;
function settings(){const cfg=JSON.parse(localStorage.getItem('pep_config')||'{"nome":"Aluno(a) PEP","email":"aluno@pep.com","curso":"Enfermagem","semestre":"6º semestre"}');shell(`<form class="form-card" id="configForm"><div class="form-grid"><label class="field">Nome<input name="nome" value="${safe(cfg.nome)}"></label><label class="field">E-mail<input name="email" type="email" value="${safe(cfg.email)}"></label><label class="field">Curso<input name="curso" value="${safe(cfg.curso)}"></label><label class="field">Semestre<input name="semestre" value="${safe(cfg.semestre)}"></label></div><div class="actions"><button>Salvar perfil</button><button type="button" class="secondary" id="theme">Alternar modo claro/escuro</button></div></form>`,'Configurações');configForm.onsubmit=e=>{e.preventDefault();localStorage.setItem('pep_config',JSON.stringify(Object.fromEntries(new FormData(configForm))));toast('Perfil atualizado com sucesso.')};theme.onclick=toggleTheme;mountPasswordSettings()}
  if(page==='dashboard')dashboard();if(page==='configuracoes')settings();const applyIdentity=()=>{const identity=currentIdentity();document.querySelectorAll('.user-name').forEach(el=>{if(el.textContent!==identity.name)el.textContent=identity.name});document.querySelectorAll('.avatar:not(.person-avatar)').forEach(el=>{if(el.textContent!==identity.initials)el.textContent=identity.initials});document.querySelectorAll('.page-head .muted').forEach(el=>{const caption=page==='atendimento'?'Simulador de Triagem':'Simulador de atendimento';if(el.textContent!==caption)el.textContent=caption});};applyIdentity();new MutationObserver(applyIdentity).observe(document.querySelector('#app'),{childList:true,subtree:true});
  window.confirmLogout=async()=>{if(window.confirmDiscardChanges&&!window.confirmDiscardChanges())return;const firebase=await window.PEPFirebaseReady?.catch(()=>null);try{if(firebase?.enabled)await firebase.signOut();}catch(error){console.warn('Não foi possível encerrar a sessão remota.',error);}finally{['pep_logged','pep_current_email','pep_current_user','pep_current_role','pep_current_unit','pep_current_unit_key','pep_current_turma','pep_current_turma_key','pep_current_profile_semester','pep_selected_semester','pep_admin_unit'].forEach(key=>localStorage.removeItem(key));location.replace('index.html');}};

/* Controles acessíveis do menu móvel: fechar, overlay, Escape e voltar. */
const compactMenu=window.matchMedia('(max-width:1180px), (pointer:coarse) and (max-width:1366px)');
window.setMobileMenu=open=>{
  const sidebar=document.querySelector('#side'),toggle=document.querySelector('.menu-toggle'),main=document.querySelector('.main');
  if(!sidebar)return;open=Boolean(open&&compactMenu.matches);
  sidebar.classList.toggle('open',open);
  document.querySelectorAll('#menuOverlay').forEach(overlay=>{overlay.classList.toggle('show',open);overlay.tabIndex=open?0:-1;});
  toggle?.setAttribute('aria-expanded',String(open));
  toggle?.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
  document.body.classList.toggle('menu-open',open);
  sidebar.inert=compactMenu.matches&&!open;if(main)main.inert=open;
  if(open)sidebar.querySelector('.side-close')?.focus();
  else if(sidebar.contains(document.activeElement))toggle?.focus();
};
window.toggleMobileMenu=()=>setMobileMenu(!document.querySelector('#side')?.classList.contains('open'));
function ensureMobileMenu(){
  const sidebar=document.querySelector('#side');if(!sidebar)return;
  const overlays=[...document.querySelectorAll('#menuOverlay')];overlays.slice(1).forEach(el=>el.remove());
  let overlay=overlays[0];
  if(!overlay){overlay=document.createElement('button');overlay.type='button';overlay.id='menuOverlay';overlay.className='menu-overlay';overlay.setAttribute('aria-label','Fechar menu');document.body.append(overlay);}
  overlay.onclick=()=>setMobileMenu(false);
  const toggle=document.querySelector('.menu-toggle');
  if(toggle){toggle.type='button';toggle.removeAttribute('onclick');toggle.setAttribute('aria-controls','side');}
  if(sidebar.dataset.mobileReady)return;
  sidebar.dataset.mobileReady='1';
  const close=document.createElement('button');close.type='button';close.className='side-close';close.setAttribute('aria-label','Fechar menu');close.textContent='×';close.onclick=()=>setMobileMenu(false);sidebar.prepend(close);
  setMobileMenu(false);
}
document.addEventListener('click',event=>{if(event.target.closest('.menu-toggle')){event.preventDefault();event.stopImmediatePropagation();toggleMobileMenu();return;}if(event.target.closest('#side a'))setMobileMenu(false);},true);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')setMobileMenu(false);
  if(event.key==='Tab'&&document.querySelector('#side')?.classList.contains('open')){
    const controls=[...document.querySelectorAll('#side button,#side a[href]')].filter(el=>el.getClientRects().length&&!el.disabled);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
window.addEventListener('popstate',()=>setMobileMenu(false));
window.addEventListener('pageshow',()=>setMobileMenu(false));
compactMenu.addEventListener('change',()=>setMobileMenu(false));
ensureMobileMenu();new MutationObserver(ensureMobileMenu).observe(document.querySelector('#app'),{childList:true,subtree:true});

/* Imprime somente o documento aberto no modal e permite salvar como PDF. */
window.printDocument=()=>{document.body.classList.add('printing-document');const cleanup=()=>{document.body.classList.remove('printing-document');window.removeEventListener('afterprint',cleanup)};window.addEventListener('afterprint',cleanup);window.print()};

/* Preenchimento automático de endereço pelo CEP usando o serviço público ViaCEP. */
window.lookupCep=async input=>{const form=input.closest('form'),cep=input.value.replace(/\D/g,'').slice(0,8),status=form?.querySelector('.cep-status');input.value=cep.replace(/(\d{5})(\d{1,3})/,'$1-$2');if(cep.length!==8){if(status)status.textContent=cep?'Informe os 8 números do CEP.':'';return}if(status)status.textContent='Buscando endereço...';try{const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`);if(!response.ok)throw new Error('Falha na consulta');const data=await response.json();if(data.erro)throw new Error('CEP não encontrado');[['rua',data.logradouro],['bairro',data.bairro],['cidade',data.localidade],['estado',data.uf]].forEach(([name,value])=>{const field=form.querySelector(`[name="${name}"]`);if(field)field.value=value||''});if(status)status.textContent='Endereço preenchido automaticamente.';form.querySelector('[name="numero"]')?.focus()}catch(error){if(status)status.textContent='CEP não encontrado. Confira e tente novamente.';}};
function bindCepInputs(){document.querySelectorAll('input[name="cep"]:not([data-cep-ready])').forEach(input=>{input.dataset.cepReady='1';input.inputMode='numeric';input.autocomplete='postal-code';input.maxLength=9;const status=document.createElement('small');status.className='cep-status';status.setAttribute('aria-live','polite');input.closest('label')?.append(status);input.addEventListener('blur',()=>lookupCep(input));input.addEventListener('input',()=>{if(input.value.replace(/\D/g,'').length===8)lookupCep(input)})})}
bindCepInputs();new MutationObserver(bindCepInputs).observe(document.querySelector('#app'),{childList:true,subtree:true});

function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }


// Captura também cliques em controles que interrompem a propagação do evento.
function closeNotifications(){
  document.querySelector('#notify')?.classList.remove('show');
  document.querySelector('.bell')?.setAttribute('aria-expanded','false');
}
document.addEventListener('click',event=>{
  if(!event.target.closest('#notify, .bell'))closeNotifications();
},true);

function mountSidebarCalendar(){const nav=document.querySelector('.sidebar .nav');if(nav&&!document.querySelector('.sidebar-calendar'))nav.insertAdjacentHTML('beforebegin',sidebarCalendarMarkup())}


function applyPersonIconToProfile(){document.querySelectorAll('.user-trigger .avatar,.account-summary .avatar').forEach(avatar=>{if(avatar.classList.contains('person-avatar'))return;avatar.classList.remove('avatar','large');avatar.classList.add('person-avatar');avatar.innerHTML='<img class="person-icon-light" src="assets/menu-paciente.svg" alt=""><img class="person-icon-dark" src="assets/menu-paciente-dark.svg" alt="">';avatar.setAttribute('aria-hidden','true')})}
applyPersonIconToProfile();new MutationObserver(applyPersonIconToProfile).observe(document.querySelector('#app'),{childList:true,subtree:true});

const correctionsStyle=document.createElement('link');correctionsStyle.rel='stylesheet';correctionsStyle.href='css/correcoes-v16.css?v=17-20260911';document.head.append(correctionsStyle);
const refinementStyle=document.createElement('link');refinementStyle.rel='stylesheet';refinementStyle.href='css/interface-refinement.css?v=20260923';document.head.append(refinementStyle);

/* Mantém os painéis auxiliares coerentes ao fechar o menu do perfil ou o menu móvel. */
window.closeAccessibilityPanel=window.closeAccessibilityPanel||(()=>{
  const panel=document.querySelector('#accessibilityPanel'),trigger=document.querySelector('[aria-controls="accessibilityPanel"]');
  panel?.classList.remove('show');trigger?.setAttribute('aria-expanded','false');
});
const originalProfileToggle=window.toggleProfile;
window.toggleProfile=event=>{
  originalProfileToggle(event);
  if(!document.querySelector('#accountMenu')?.classList.contains('show'))window.closeAccessibilityPanel();
};
document.addEventListener('click',event=>{
  if(!event.target.closest('.top-actions'))window.closeAccessibilityPanel();
},true);

function lockStudentSemester(){
  if(page!=='configuracoes')return;
  const field=document.querySelector('#configForm [name="semestre"]');
  const role=String(localStorage.getItem('pep_current_role')||'Aluno').toLocaleLowerCase('pt-BR');
  if(!field||['docente','administrador'].includes(role))return;
  const fixedValue=field.value||'Não informado';
  field.value=fixedValue;field.readOnly=true;field.setAttribute('aria-readonly','true');field.title='O semestre é informado pelo docente ou administrador.';
  const label=field.closest('label');
  if(label&&!label.querySelector('.semester-help'))label.insertAdjacentHTML('beforeend','<small class="semester-help">Informado pelo docente ou administrador.</small>');
  document.querySelector('#configForm')?.addEventListener('submit',()=>{field.value=fixedValue;},true);
}
lockStudentSemester();

/* Identificação atualizada da aba de registros de triagem. */
recordTabs[1][1]='Reg. Triagem';


/* Exibe o resultado da gravação depois da resposta do Firebase. */
let pepToastTimer;
toast=(message,type='success')=>{
  const pending=type==='success'&&window.__pepLastSave&&Date.now()-window.__pepLastSave.at<500?window.__pepLastSave:null;
  if(pending)window.__pepLastSave=null;
  Promise.resolve(pending?.promise??true).then(synced=>{
    const target=document.querySelector('#toast');if(!target)return;
    clearTimeout(pepToastTimer);
    target.textContent=synced?message:'Informação salva neste navegador; sincronização pendente.';
    target.className=`toast ${synced?type:'warn'} show`;
    target.setAttribute('role',synced&&type==='success'?'status':'alert');
    pepToastTimer=setTimeout(()=>target.classList.remove('show'),3600);
  });
};window.toast=toast;
