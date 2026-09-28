/* Cadastro, busca e visualização de pacientes. */
let patientDirectoryFilter='all';

function patientForm(p={}){return `<form id="patientForm" class="form-card patient-registration-form"><div class="patient-form-title"><div class="patient-avatar">${pepIcon('person')}</div><div><span>Cadastro do paciente ${p.id?`· ID ${safe(patientNumber(p))}`:''}</span><p>Dados pessoais, contato e informações clínicas</p></div></div>${patientFieldGroups.map(([title,fields])=>`<fieldset class="patient-data-group"><legend>${title}</legend><div class="form-grid">${fields.map(([n,l,t='text',options])=>`<label class="field ${t==='textarea'?'span-3':''}">${l}${['nome','cpf','nascimento','sexo'].includes(n)?'*':''}${t==='textarea'?`<textarea name="${n}">${safe(p[n]||'')}</textarea>`:t==='select'?`<select name="${n}" ${n==='sexo'?'required':''}><option value="">Selecione</option>${[...new Set([...options,...(p[n]?[p[n]]:[])])].map(x=>`<option ${p[n]===x?'selected':''}>${safe(x)}</option>`).join('')}</select>`:`<input name="${n}" type="${t}" value="${safe(p[n]||'')}" ${['nome','cpf','nascimento'].includes(n)?'required':''}>`}</label>`).join('')}</div></fieldset>`).join('')}<div class="error" id="formError"></div><div class="actions"><button>Salvar paciente</button><button type="button" class="secondary" onclick="location.href='pacientes.html'">Cancelar</button></div></form>`;}

async function persistPatientRecord(data,editId){
  const firebase=await window.PEPFirebaseReady;
  if(firebase?.enabled){await firebase.sessionReady;await firebase.hydrationReady;if(!firebase.profile)throw new Error('Sessão expirada. Entre novamente para salvar o paciente.');}
  const records=load('pacientes');
  if(data.cpf&&duplicatePatientCPF(data.cpf,records,editId))throw new Error('Já existe um paciente cadastrado com este CPF.');
  const id=editId||newPatientId();
  const numeroProntuario=editId?'':String(records.reduce((max,item)=>Math.max(max,Number(String(item.numeroProntuario||item.id||0).replace(/\D/g,''))||0),0)+1).padStart(6,'0');
  const updated=editId?records.map(item=>String(item.id)===String(editId)?{...item,...data}:item):[...records,{id,numeroProntuario,...data}];
  const synced=await save('pacientes',updated);
  return {id,synced};
}

function pagePatients(){
  const isNew=new URLSearchParams(location.search).has('novo');
  const directory=`<section class="patient-directory" aria-label="Lista de pacientes">${new URLSearchParams(location.search).has('prontuario')?'<p class="patient-record-prompt" role="status">Selecione um paciente abaixo para abrir o prontuário.</p>':''}<div class="patient-directory-actions"><label class="patient-directory-search"><span class="sr-only">Buscar paciente</span>${pepIcon('search')}<input id="search" type="search" placeholder="Buscar por nome, CPF ou prontuário" autocomplete="off"></label><button class="outline icon-button patient-filter-trigger" type="button" onclick="openPatientFilters()" title="Opções da lista" aria-label="Abrir opções da lista">${pepIcon('filter')}</button><a class="btn patient-new-button" href="pacientes.html?novo=1">＋ Novo paciente</a></div><p id="patientFilterSummary" class="patient-filter-summary" aria-live="polite"></p><div id="patientTable"></div></section>`;
  // O formulário detalhado é responsabilidade de patient-enhancements.js.
  // Não renderize uma segunda versão antes dele, pois ambas disputavam o mesmo
  // #patientForm e os mesmos handlers de gravação.
  if(isNew)return;
  shell(directory,'Pacientes');
  renderPatients();document.querySelector('#search').oninput=renderPatients;window.PEPFirebaseReady?.then(async firebase=>{await firebase.sessionReady;await firebase.hydrationReady;if(!document.querySelector('#patientTable'))return;renderPatients();const notice=sessionStorage.getItem('pep_patient_notice');if(notice){sessionStorage.removeItem('pep_patient_notice');toast(notice)}}).catch(error=>console.warn('Não foi possível atualizar a lista de pacientes.',error));
}

function bindForm(editId){const form=document.querySelector('#patientForm');form.onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(form)),error=form.querySelector('#formError'),button=form.querySelector('.actions button');error.textContent='';if(!x.nome||!x.cpf||!x.nascimento||!x.sexo){error.textContent='Preencha os campos obrigatórios.';return}if(!validSimulatedCPF(x.cpf)){error.textContent='Informe 11 dígitos de CPF fictício.';return}if(x.email&&!/^\S+@\S+\.\S+$/.test(x.email)){error.textContent='Informe um e-mail válido.';return}if(new Date(x.nascimento)>new Date()){error.textContent='Data de nascimento inválida.';return}button.disabled=true;try{const result=await persistPatientRecord(x,editId);editId=result.id;if(!result.synced){error.textContent='Paciente salvo neste navegador, mas não sincronizado. Tente salvar novamente antes de sair.';return}window.markFormSaved?.(form);note('Paciente '+(form.dataset.editing?'atualizado':'cadastrado')+': '+x.nome);sessionStorage.setItem('pep_patient_notice',form.dataset.editing?'Paciente atualizado com sucesso.':'Paciente cadastrado com sucesso.');location.href='pacientes.html'}catch(exception){error.textContent=exception.message||'Não foi possível salvar o paciente.'}finally{button.disabled=false}};form.dataset.editing=editId?'1':''}

function patientInitials(name){const parts=String(name||'').trim().split(/\s+/).filter(Boolean);return (parts.length>1?parts[0][0]+parts.at(-1)[0]:parts[0]?.slice(0,2)||'P').toUpperCase()}
function isBirthdayToday(patient){if(!patient.nascimento)return false;const birthday=new Date(`${patient.nascimento}T12:00:00`),today=new Date();return birthday.getMonth()===today.getMonth()&&birthday.getDate()===today.getDate()}
function hasAppointmentToday(patient){const today=localDate();return load('atendimentos').some(appointment=>String(appointment.pacienteId)===String(patient.id)&&appointment.data===today&&appointment.status!=='Cancelado')}
function currentPatientFilterLabel(){return ({all:'Todos os pacientes',today:'Agendados para hoje',birthday:'Aniversariantes de hoje'})[patientDirectoryFilter]||'Todos os pacientes'}
function visiblePatients(){const term=document.querySelector('#search')?.value||'';return load('pacientes').filter(patient=>matchesPatient(patient,term)).filter(patient=>patientDirectoryFilter==='today'?hasAppointmentToday(patient):patientDirectoryFilter==='birthday'?isBirthdayToday(patient):true)}
function renderPatients(){const patients=visiblePatients(),summary=document.querySelector('#patientFilterSummary');if(summary)summary.textContent=`${currentPatientFilterLabel()} · ${patients.length} ${patients.length===1?'paciente':'pacientes'}`;document.querySelector('#patientTable').innerHTML=`<div class="patient-grid" role="list">${patients.map(patient=>`<article class="patient-card" role="listitem"><a class="patient-card-main" href="prontuario.html?id=${encodeURIComponent(patient.id)}" aria-label="Abrir prontuário de ${safe(patient.nome)}"><span class="patient-card-avatar" aria-hidden="true">${safe(patientInitials(patient.nome))}</span><span class="patient-card-name">${safe(patient.nome)}</span><span class="patient-card-id">Prontuário ${safe(patientNumber(patient))}</span></a><dl class="patient-card-data"><div><dt>Nascimento</dt><dd>${fmt(patient.nascimento)}</dd></div><div><dt>Idade</dt><dd>${age(patient.nascimento)} anos</dd></div><div><dt>Sexo</dt><dd>${safe(patient.sexo||'Não informado')}</dd></div></dl><div class="patient-card-actions"><a class="outline icon-button" href="prontuario.html?id=${encodeURIComponent(patient.id)}" title="Abrir prontuário" aria-label="Abrir prontuário de ${safe(patient.nome)}">${pepIcon('record')}</a><button class="outline icon-button" type="button" onclick="editPatient(${patient.id})" title="Editar cadastro" aria-label="Editar ${safe(patient.nome)}">${pepIcon('edit')}</button></div></article>`).join('')||'<div class="patient-directory-empty"><strong>Nenhum paciente encontrado.</strong><span>Altere a busca ou escolha outra opção de exibição.</span></div>'}</div>`}

window.openPatientFilters=()=>{const options=[['all','Todos os pacientes','Exibe todos os cadastros'],['today','Agendados para hoje','Exibe pacientes com atendimento previsto para hoje'],['birthday','Aniversariantes de hoje','Exibe pacientes que fazem aniversário hoje']];modal(`<section class="patient-filter-sheet" aria-label="Opções da lista de pacientes"><span class="sheet-handle" aria-hidden="true"></span><h2>Exibir pacientes</h2><p>Escolha uma visualização para a lista.</p><div class="patient-filter-options">${options.map(([value,label,description])=>`<button class="${patientDirectoryFilter===value?'active':''}" type="button" onclick="selectPatientFilter('${value}')"><span><b>${label}</b><small>${description}</small></span><span aria-hidden="true">${patientDirectoryFilter===value?'✓':'›'}</span></button>`).join('')}</div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Fechar</button></div></section>`,true)};
window.selectPatientFilter=value=>{patientDirectoryFilter=value;closeModal();renderPatients();document.querySelector('#search')?.focus()};
window.viewPatient=id=>{const p=load('pacientes').find(x=>x.id==id);modal(`<h2>${p.nome}</h2><p><b>CPF:</b> ${p.cpf} &nbsp; <b>Nascimento:</b> ${fmt(p.nascimento)} (${age(p.nascimento)} anos)</p><p><b>Telefone:</b> ${p.telefone||'—'}<br><b>Alergias:</b> ${p.alergias||'Não informado'}<br><b>Tipo sanguíneo:</b> ${p.sangue||'Não informado'}</p><div class="actions"><a class="btn" href="prontuario.html?id=${id}">Abrir prontuário</a></div>`)};
window.editPatient=id=>{const p=load('pacientes').find(x=>x.id==id);modal(patientForm(p));document.querySelector('#patientForm .actions').insertAdjacentHTML('beforeend',`<button type="button" class="danger" onclick="deletePatient(${id})">Excluir paciente</button>`);bindForm(id)};
window.deletePatient=id=>{const p=load('pacientes').find(x=>x.id==id);modal(`<h2>Excluir paciente</h2><p>Tem certeza que deseja excluir <b>${p.nome}</b>? Esta ação não pode ser desfeita.</p><div class="actions"><button class="secondary" onclick="closeModal()">Cancelar</button><button class="danger" onclick="confirmDelete(${id})">Excluir</button></div>`)};
window.confirmDelete=async id=>{try{const records=load('pacientes'),removed=records.find(p=>p.id==id);if(!removed)throw new Error('Paciente não encontrado.');const synced=await save('pacientes',records.filter(p=>p.id!=id),{removedIds:[{id:removed.id,turma:removed.turma}]});note('Paciente excluído.');closeModal();renderPatients();toast(synced?'Paciente excluído com sucesso.':'Paciente excluído neste navegador; sincronização pendente.',synced?'success':'warn')}catch(error){toast('Não foi possível excluir o paciente.','error')}};
window.salvarPaciente=()=>document.querySelector('#patientForm')?.requestSubmit();window.listarPacientes=renderPatients;window.pesquisarPaciente=renderPatients;pagePatients();

/* O filtro da lista segue o mesmo painel expansível usado na Agenda. */
window.openPatientFilters=()=>{
  const actions=document.querySelector('.patient-directory-actions');
  if(!actions)return;
  let panel=document.querySelector('#patientDirectoryFilters');
  if(!panel){
    actions.insertAdjacentHTML('afterend',`<div id="patientDirectoryFilters" class="form-grid patient-directory-filters" hidden><label class="field">Exibir pacientes<select id="patientDirectoryFilter"><option value="all">Todos os pacientes</option><option value="today">Agendados para hoje</option><option value="birthday">Aniversariantes de hoje</option></select></label></div>`);
    panel=document.querySelector('#patientDirectoryFilters');
    const select=panel.querySelector('select');
    select.value=patientDirectoryFilter;
    select.onchange=()=>{patientDirectoryFilter=select.value;renderPatients();};
  }
  panel.hidden=!panel.hidden;
  document.querySelector('.patient-filter-trigger')?.setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden)panel.querySelector('select')?.focus();
};
window.selectPatientFilter=value=>{patientDirectoryFilter=value;document.querySelector('#patientDirectoryFilter')&&(document.querySelector('#patientDirectoryFilter').value=value);document.querySelector('#patientDirectoryFilters')?.setAttribute('hidden','');renderPatients();document.querySelector('#search')?.focus()};
