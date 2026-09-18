/* Prontuário clínico tabulado com os campos de atendimento em grupos objetivos. */
const qs = new URLSearchParams(location.search), pp = patient();
const pid = pp?.id;
const tabs = [['resumo', 'Ficha'], ['triagens', 'Reg. Triagem'], ['sinais-vitais', 'Sinais vitais'], ['evolucoes', 'Evolução'], ['anotacoes-enfermagem', 'Anotação de Enfermagem'], ['solicitacoes-procedimentos', 'Exames/Procedimentos'], ['diagnostico-plano', 'Diagnostico/Plano de cuidado'], ['prescricoes', 'Prescrição'], ['receituario', 'Receituário'], ['ficha-completa', 'Ficha completa']];
recordTabs.splice(0, recordTabs.length, ...tabs);

const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const nowParts = () => { const now = new Date(); return { data: localDate(now), hora: now.toTimeString().slice(0, 5), registradoEm: now.toISOString() }; };
const recordTime = entry => entry.registradoEm || `${entry.data || '0000-00-00'}T${entry.hora || '00:00'}`;
function records(key) { return load(key).filter(entry => entry.pacienteId == pid); }
function professionalName(entry) { return entry.profissional || 'Profissional não informado'; }

function list(key, labels, options = {}) {
  const items = records(key).slice().sort((a, b) => recordTime(b).localeCompare(recordTime(a)));
  return items.map(entry => `<article class="card clinical-record"><div class="record-heading"><div><b>${entry.data ? `${fmt(entry.data)} às ${esc(entry.hora || '')}` : ''}</b>${options.showProfessional ? `<span class="professional-chip" title="Profissional responsável">${pepIcon('person')} ${esc(professionalName(entry))}${entry.cargo?` · ${esc(entry.cargo)}`:""}</span>` : ''}${entry.registradoPor ? `<small class="muted">Registrado pela conta: ${esc(entry.registradoPor.nome)}</small>` : ""}</div><div class="record-actions no-print"><button class="outline" type="button" onclick="previewClinicalPrint('${key}',[${entry.id}])">Imprimir</button><button class="outline" type="button" onclick="showRecordChanges('${key}',${entry.id})">Correções</button><button class="secondary" type="button" onclick="editRecord('${key}',${entry.id})"><span aria-hidden="true">✎</span> Editar</button><button class="danger" type="button" onclick="removeRecord('${key}',${entry.id})">Excluir</button></div></div>${labels.map(([field, label, suffix = '']) => (entry[field] !== undefined && entry[field] !== null && entry[field] !== "") ? `<p><b>${label}:</b> ${esc(entry[field])}${suffix}</p>` : '').join('')}</article>`).join('') || '<div class="empty-state"><b>Nenhum registro.</b><span>Os registros salvos aparecerão aqui em ordem cronológica.</span></div>';
}

function fieldMarkup([name, label, type = 'text', required = false, placeholder = '']) {
  if (type === 'textarea') return `<label class="field span-2">${label}<textarea name="${name}" ${required ? 'required' : ''} placeholder="${placeholder}"></textarea></label>`;
  if (type === 'select') return `<label class="field">${label}<select name="${name}" ${required ? 'required' : ''}><option value="">Selecione</option><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></label>`;
  return `<label class="field">${label}<input name="${name}" type="${type}" ${type === 'number' ? 'step="any"' : ''} ${required ? 'required' : ''} placeholder="${placeholder}"></label>`;
}

function simpleForm(key, event, fields) {
  return `<form class="form-card simple" data-k="${key}" data-event="${event}"><div class="form-grid">${fields.map(fieldMarkup).join('')}</div><div class="actions"><button>Salvar registro</button>${printControls(key)}</div></form>`;
}

function pairSection(title, body) {
  return `<section class="clinical-section"><h2>${title}</h2>${body}</section>`;
}

function pairedSections(sections) {
  return `<div class="clinical-pair">${sections.map(([title, body]) => pairSection(title, body)).join('')}</div>`;
}

function examRequests() {
  return simpleForm('solicitacoes_exames', 'Solicitação de exame registrada', [['exames', 'Exame(s) solicitado(s)', 'textarea', true, 'Informe um ou mais exames'], ['indicacao', 'Indicação clínica', 'textarea', true], ['prioridade', 'Prioridade', 'text', false, 'Rotina, urgente...'], ['observacoes', 'Observações', 'textarea']]) + '<h3>Solicitações registradas</h3>' + list('solicitacoes_exames', [['exames', 'Exames'], ['indicacao', 'Indicação'], ['prioridade', 'Prioridade'], ['observacoes', 'Observações']], { showProfessional: true });
}

function procedures() {
  return simpleForm('procedimentos', 'Procedimento registrado', [['procedimento', 'Procedimento', 'text', true], ['data', 'Data', 'date'], ['hora', 'Horário', 'time'], ['indicacao', 'Indicação', 'textarea'], ['materiais', 'Materiais', 'textarea'], ['descricao', 'Descrição', 'textarea', true], ['resultado', 'Resultado', 'textarea'], ['intercorrencias', 'Intercorrências', 'textarea'], ['obs', 'Observações', 'textarea']]) + '<h3>Procedimentos registrados</h3>' + list('procedimentos', [['procedimento', 'Procedimento'], ['descricao', 'Descrição'], ['resultado', 'Resultado']], { showProfessional: true });
}

function diagnosis() {
  return simpleForm('diagnosticos', 'Diagnóstico registrado', [['diagnostico', 'Diagnóstico', 'textarea', true], ['evidencias', 'Evidências', 'textarea'], ['fatores', 'Fatores relacionados', 'textarea'], ['obs', 'Observações', 'textarea']]) + '<h3>Diagnósticos registrados</h3>' + list('diagnosticos', [['diagnostico', 'Diagnóstico'], ['evidencias', 'Evidências'], ['fatores', 'Fatores']], { showProfessional: true });
}

function vitalSigns() {
 return `<form class="form-card simple" data-k="sinais_vitais" data-event="Sinais vitais registrados"><div class="form-grid"><label class="field">Data da medição*<input name="data" type="date" value="${localDate()}" required></label><label class="field">Hora da medição*<input name="hora" type="time" value="${new Date().toTimeString().slice(0,5)}" required></label><label class="field">Profissional responsável*<input name="profissional" required></label></div><fieldset class="vital-fields"><legend>Sinais vitais</legend><div class="form-grid"><label class="field"><span><span aria-hidden="true">◴</span> PA (mmHg)</span><input name="pa" placeholder="120/80" pattern="[0-9]{1,3}\\s*/\\s*[0-9]{1,3}" title="Informe no formato 120/80"></label><label class="field"><span>T (°C)</span><input name="temp" type="number" min="0" step="0.1"></label><label class="field"><span><span aria-hidden="true">↕</span> FR (irpm)</span><input name="fr" type="number" min="0" step="1"></label><label class="field"><span><span aria-hidden="true">♥</span> FC (bpm)</span><input name="fc" type="number" min="0" step="1"></label><label class="field"><span><span aria-hidden="true">◉</span> Saturação %</span><input name="sat" type="number" min="0" max="100" step="0.1"></label><label class="field"><span>Glicemia (mg/dL)</span><input name="glicemia" type="number" min="0" step="1"></label></div></fieldset><label class="field">Observações<textarea name="obs"></textarea></label><div class="actions"><button>Salvar medição</button>${printControls('sinais_vitais')}</div></form><h2>Sinais vitais registrados</h2>` + list('sinais_vitais', [['pa','PA',' mmHg'],['temp','T',' °C'],['fr','FR',' irpm'],['fc','FC',' bpm'],['sat','Saturação',' %'],['spo2','Saturação',' %'],['glicemia','Glicemia',' mg/dL'],['obs','Observações']], {showProfessional:true});
}

function evolution() {
  return simpleForm('evolucoes', 'Evolução de atendimento registrada', [['profissional', 'Profissional responsável*', 'text', true, 'Digite o nome do profissional'], ['cargo', 'Cargo*', 'text', true, 'Digite o cargo'], ['evolucao', 'Evolução do atendimento', 'textarea', true, 'Descreva a evolução clínica observada']]) + '<h2>Evoluções registradas</h2>' + list('evolucoes', [['cargo','Cargo'],['evolucao', 'Evolução']], { showProfessional: true });
}

function nursingNotes() {
  return simpleForm('anotacoes_enfermagem', 'Anotação de Enfermagem registrada', [['profissional', 'Profissional responsável*', 'text', true, 'Digite o nome do profissional'], ['anotacao', 'Anotação', 'textarea', true, 'Descreva a anotação de enfermagem']]) + '<h2>Anotações de Enfermagem registradas</h2>' + list('anotacoes_enfermagem', [['anotacao', 'Anotação']], { showProfessional: true });
}

function carePlan() {
  return simpleForm('planos', 'Plano de cuidados criado', [['diagnostico', 'Diagnóstico relacionado'], ['objetivo', 'Objetivo', 'textarea'], ['intervencao', 'Intervenção', 'textarea'], ['frequencia', 'Frequência'], ['resultado', 'Resultado esperado', 'textarea'], ['status', 'Status', 'select'], ['prazo', 'Prazo']]) + '<h3>Planos registrados</h3>' + list('planos', [['diagnostico', 'Diagnóstico'], ['objetivo', 'Objetivo'], ['status', 'Status']], { showProfessional: true });
}

const medicationFields = {
  prescription: [['medicamento', 'Medicação*', 'text', true], ['dose', 'Dosagem', 'text'], ['apresentacao', 'Apresentação', 'text'], ['via', 'Via de administração', 'text'], ['horario', 'Horário', 'time']],
  recipe: [['medicamento', 'Medicamento e concentração*', 'text', true], ['posologia', 'Posologia*', 'text', true], ['quantidade', 'Quantidade*', 'text', true]]
};
function medicationRow(kind, values = {}, index = 0) {
  return `<fieldset class="medication-row" data-medication-row><legend>Medicamento ${index + 1}</legend><div class="medication-row-actions"><button type="button" class="outline medication-remove" data-remove-medication aria-label="Remover medicamento ${index + 1}" title="Remover medicamento">×</button></div><div class="form-grid medication-grid">${medicationFields[kind].map(([name, label, type, required]) => `<label class="field">${label}<input data-medication-field="${name}" type="${type}" value="${esc(values[name] || '')}" ${required ? 'required' : ''}></label>`).join('')}</div></fieldset>`;
}
function medicationEntries(entry, kind) {
  if (Array.isArray(entry?.medicamentosItens) && entry.medicamentosItens.length) return entry.medicamentosItens;
  if (!entry) return [{}];
  if (kind === 'recipe') return [{ medicamento:entry.medicamentos || '', posologia:entry.posologia || '', quantidade:entry.quantidade || '' }];
  return [{ medicamento:entry.medicamento || '', dose:entry.dose || '', apresentacao:entry.apresentacao || '', via:entry.via || '', horario:entry.horario || '' }];
}
function medicationForm(kind, entry = null, editing = false) {
  const isRecipe = kind === 'recipe';
  const rows = medicationEntries(entry, kind);
  const professional = entry?.profissional || 'Profissional Fictício';
  const crm = entry?.crm || 'CRM 000000-XX';
  const heading = isRecipe ? 'Receituário' : 'Prescrição';
  const action = isRecipe ? 'Salvar receita' : 'Salvar prescrição';
  return `<form class="form-card medication-form ${isRecipe ? 'recipe-form' : 'medical-prescription-form'}" data-medication-form="${kind}" data-edit-id="${entry?.id || ''}"><div class="prescription-form-head"><div><span>${isRecipe ? 'Receituário médico' : 'Prescrição médica'}</span><h2>${heading}</h2></div>${!isRecipe ? '<p>Medicamentos organizados em linhas independentes.</p>' : ''}</div><div class="form-grid prescription-professional-grid"><label class="field">Profissional<input name="profissional" value="${esc(professional)}" readonly></label><label class="field">Cargo<input name="cargo" value="Médico" readonly></label><label class="field">CRM<input name="crm" value="${esc(crm)}" readonly></label>${isRecipe ? `<label class="field patient-field">Paciente<input value="${esc(pp.nome)}" readonly></label><label class="field">Nascimento<input value="${esc(fmt(pp.nascimento))}" readonly></label>` : ''}</div><div class="medication-list" data-medication-list>${rows.map((item, index) => medicationRow(kind, item, index)).join('')}</div><button type="button" class="outline add-medication" data-add-medication>＋ Adicionar medicamento</button>${isRecipe ? '<label class="field recipe-observation">Observação<textarea name="obs" rows="2" placeholder="Escreva uma observação, se necessário.">'+esc(entry?.obs || '')+'</textarea></label>' : ''}<div class="actions"><button type="submit">${editing ? 'Salvar alterações' : action}</button>${editing ? '<button type="button" class="secondary" onclick="closeModal()">Cancelar</button>' : printControls(isRecipe ? 'receituario' : 'prescricoes')}</div></form>`;
}
function medicationList(key, kind) {
  const entries = records(key).slice().sort((a, b) => recordTime(b).localeCompare(recordTime(a)));
  const labels = medicationFields[kind].map(([name, label]) => [name, label.replace('*', '')]);
  return entries.map(entry => `<article class="card clinical-record medication-record"><div class="record-heading"><div><b>${entry.data ? `${fmt(entry.data)} às ${esc(entry.hora || '')}` : ''}</b><span class="professional-chip" title="Profissional responsável">${pepIcon('person')} ${esc(professionalName(entry))} · ${esc(entry.cargo || 'Médico')} · ${esc(entry.crm || 'CRM 000000-XX')}</span></div><div class="record-actions no-print"><button class="outline" type="button" onclick="previewClinicalPrint('${key}',[${entry.id}])">Imprimir</button><button class="secondary" type="button" onclick="editRecord('${key}',${entry.id})">✎ Editar</button><button class="danger" type="button" onclick="removeRecord('${key}',${entry.id})">Excluir</button></div></div><div class="medication-record-list">${medicationEntries(entry, kind).map((item, index) => `<section class="medication-record-row"><b>Medicamento ${index + 1}</b><dl>${labels.map(([name, label]) => item[name] ? `<div><dt>${label}</dt><dd>${esc(item[name])}</dd></div>` : '').join('')}</dl></section>`).join('')}</div>${entry.obs ? `<p><b>Observação:</b> ${esc(entry.obs)}</p>` : ''}</article>`).join('') || '<div class="empty-state"><b>Nenhum registro.</b><span>Os medicamentos salvos aparecerão aqui.</span></div>';
}
function prescriptionForm(entry = null, editing = false) { return medicationForm('prescription', entry, editing); }
function recipeForm(entry = null, editing = false) { return medicationForm('recipe', entry, editing); }
function prescription() { return `${prescriptionForm()}<h2>Prescrições registradas</h2>${medicationList('prescricoes', 'prescription')}`; }

const historyGroups = [['atendimentos', 'Atendimento'], ['sinais_vitais', 'Sinais vitais'], ['triagens', 'Registro de triagem'], ['evolucoes', 'Evolução de atendimento'], ['anotacoes_enfermagem', 'Anotação de Enfermagem'], ['solicitacoes_exames', 'Exames'], ['diagnosticos', 'Diagnóstico'], ['planos', 'Plano de cuidados'], ['procedimentos', 'Procedimento'], ['prescricoes', 'Prescrição'], ['receitas','Receita médica']];
function allHistory() { const items = []; historyGroups.forEach(([key, title]) => records(key).forEach(entry => items.push({ ...entry, key, title }))); return items.sort((a, b) => recordTime(b).localeCompare(recordTime(a))); }
function historySummary(entry) {
  const ignored = new Set(['registradoPor', '_version', 'criadoPor', 'atualizadoPor', 'id', 'pacienteId', 'data', 'hora', 'registradoEm', 'profissional', 'key', 'title']);
  return Object.entries(entry).filter(([key, value]) => !ignored.has(key) && value).map(([key, value]) => `<p><b>${esc(({pa:'PA (mmHg)',temp:'T (°C)',fr:'FR (irpm)',fc:'FC (bpm)',sat:'Saturação %',spo2:'Saturação %',glicemia:'Glicemia (mg/dL)'})[key] || key.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase()))}:</b> ${esc(value)}</p>`).join('');
}

function historyView() {
  const entries = allHistory();
  return `<div class="history-toolbar no-print"><div><h2>Registro completo do paciente</h2><p class="muted">Todos os registros disponíveis do prontuário reunidos em ordem cronológica.</p></div><button type="button" class="outline" onclick="openPrintSelection('all')">Selecionar para imprimir</button></div><div class="timeline">${entries.map(entry => `<article class="event"><div class="event-time">${fmt(entry.data)} às ${esc(entry.hora || '')}</div><b>${esc(entry.title)}</b><div class="event-professional">${pepIcon('person')} ${esc(professionalName(entry))}</div>${historySummary(entry)}<div class="actions no-print"><button class="outline" onclick="previewClinicalPrint('${entry.key}',[${entry.id}])">Imprimir registro</button></div></article>`).join('') || '<p class="muted">O histórico será composto automaticamente conforme os registros forem criados.</p>'}</div>${correctionHistory(pid)}`;
}

function printableHistory() {
  const entries = allHistory().slice().reverse();
  return `<section class="doc patient-history-print"><header class="print-header"><img src="assets/senac-logo.png?v=ce9621f62500" alt="Logo da Enfermagem"><div><h1>Histórico do paciente</h1><p>Prontuário Eletrônico do Paciente</p></div></header><div class="print-patient"><h2>${esc(pp.nome)}</h2><p><b>Identificação:</b> ${esc(patientNumber(pp))} &nbsp; <b>Nascimento:</b> ${fmt(pp.nascimento)} &nbsp; <b>Sexo:</b> ${esc(pp.sexo)}</p><p><b>Tipo sanguíneo:</b> ${esc(pp.sangue || 'Não informado')} &nbsp; <b>Alergias:</b> ${esc(pp.alergias || 'Não informado')}</p></div>${entries.map(entry => `<article class="print-record"><div class="print-record-head"><b>${esc(entry.title)}</b><span>${fmt(entry.data)} às ${esc(entry.hora || '')}</span></div><div class="event-professional">Profissional: ${esc(professionalName(entry))}</div>${historySummary(entry)}</article>`).join('') || '<p>Nenhum registro encontrado.</p>'}${correctionHistory(pid,null,null,true)}<footer>Documento gerado em ${new Date().toLocaleString('pt-BR')} · Ambiente acadêmico — dados fictícios</footer><div class="actions no-print"><button onclick="window.print()">Abrir impressão / Salvar em PDF</button><button class="secondary" onclick="closeModal()">Fechar</button></div></section>`;
}

function content(tab) {
  if(tab==='ficha-completa')return `<section class="card"><div class="actions"><h2>Ficha completa</h2><button class="outline icon-button" type="button" onclick="showFullPatient(pp)" title="Imprimir ficha completa" aria-label="Imprimir ficha completa">${pepIcon('print')}</button></div>${fullPatientMarkup(pp)}</section><section class="card" style="margin-top:14px">${historyView()}</section>`;
  if (tab === 'resumo') return `<div class="grid cards"><div class="card">Tipo sanguíneo<div class="metric">${esc(pp.sangue || '—')}</div></div><div class="card allergy-card">Alergias: <span>${esc(pp.alergias || 'Não informado')}</span></div><div class="card">Idade<div class="metric">${age(pp.nascimento)}</div></div></div><h2>Dados do paciente</h2><div class="card"><b>${esc(pp.nome)}</b><p>Identificação: ${esc(patientNumber(pp))} · Nascimento: ${fmt(pp.nascimento)} · Sexo: ${esc(pp.sexo)}</p></div>`;
  if (tab === 'triagens') return '<div class="form-intro"><b>Registros de triagem</b><span>Este histórico reúne somente as triagens realizadas para este paciente.</span></div>'+list('triagens', [['queixa', 'Queixa'], ['sintomas', 'Sintomas'], ['dor', 'Dor'], ['peso', 'Peso'], ['altura', 'Altura'], ['imc', 'IMC'], ['pa', 'PA', ' mmHg'], ['temp', 'T', ' °C'], ['fr', 'FR', ' irpm'], ['fc', 'FC', ' bpm'], ['sat', 'Saturação', ' %'], ['spo2', 'Saturação', ' %'], ['glicemia', 'Glicemia', ' mg/dL'], ['aluno', 'Responsável'], ['profissional', 'Profissional'], ['obs', 'Observações']]);
  if (tab === 'sinais-vitais') return vitalSigns();
  if (tab === 'evolucoes') return evolution();
  if (tab === 'anotacoes-enfermagem') return nursingNotes();
  if (tab === 'solicitacoes-procedimentos') return pairedSections([['Exames', examRequests()], ['Procedimento', procedures()]]);
  if (tab === 'diagnostico-plano') return pairedSections([['Diagnóstico', diagnosis()], ['Plano de cuidado', carePlan()]]);
  if (tab === 'prescricoes') return prescription();
  if (tab === 'receituario') return recipeView();
  return historyView();
}

function normalizeTab(tab) {
  const redirects = { historico: 'triagens', solicitacoes_exames: 'solicitacoes-procedimentos', procedimentos: 'solicitacoes-procedimentos', diagnosticos: 'diagnostico-plano', planos: 'diagnostico-plano', receita: 'receituario', prescricoes_cuidados: 'prescricoes' };
  const target = redirects[tab] || tab;
  return tabs.some(([key]) => key === target) ? target : 'resumo';
}

function prPage() {
  if(!pp){
    const availablePatients=load('pacientes');
    const recordPatientInitials=name=>{const parts=String(name||'').trim().split(/\s+/).filter(Boolean);return (parts.length>1?parts[0][0]+parts.at(-1)[0]:parts[0]?.slice(0,2)||'P').toUpperCase();};
    const initialList=qs.has('id')?'<div class="empty-state">Paciente não encontrado. Busque outro cadastro.</div>':`<section class="triaged-patients-list patient-directory" aria-label="Lista de pacientes"><p class="patient-filter-summary">Todos os pacientes · ${availablePatients.length} ${availablePatients.length===1?'paciente':'pacientes'}</p><div class="patient-grid" role="list">${availablePatients.map(patient=>`<article class="patient-card" role="listitem"><a class="patient-card-main" href="prontuario.html?id=${encodeURIComponent(patient.id)}" aria-label="Abrir prontuário de ${esc(patient.nome)}"><span class="patient-card-avatar" aria-hidden="true">${esc(recordPatientInitials(patient.nome))}</span><span class="patient-card-name">${esc(patient.nome)}</span><span class="patient-card-id">Prontuário ${esc(patientNumber(patient))}</span></a><dl class="patient-card-data"><div><dt>Nascimento</dt><dd>${fmt(patient.nascimento)}</dd></div><div><dt>Idade</dt><dd>${age(patient.nascimento)} anos</dd></div><div><dt>Sexo</dt><dd>${esc(patient.sexo||'Não informado')}</dd></div></dl></article>`).join('')||'<div class="patient-directory-empty"><strong>Nenhum paciente encontrado.</strong><span>Altere a busca ou escolha outra opção de exibição.</span></div>'}</div></section>`;
    shell(`${patientSearchMarkup('record')}${initialList}`,'Prontuário');bindPatientSearch('record');return;
  }

  const active = normalizeTab(new URLSearchParams(location.search).get('tab') || 'resumo');
  shell(`${patientSearchMarkup('record')}<div class="card patient-record-banner"><h2>${esc(pp.nome)}</h2><p class="muted">Identificação ${esc(patientNumber(pp))} · ${fmt(pp.nascimento)} · ${age(pp.nascimento)} anos · ${esc(pp.sexo)} · Sangue: ${esc(pp.sangue || '—')} · <span class="allergy-inline">Alergias: ${esc(pp.alergias || '—')}</span></p></div><nav class="tabs clinical-tabs" aria-label="Seções do prontuário">${tabs.map(([key, label]) => `<a class="tab ${key === active ? 'active' : ''}" href="prontuario.html?id=${pid}&tab=${key}">${label}</a>`).join('')}</nav><div id="clinical">${content(active)}</div>`, 'Prontuário');
  bindPatientSearch('record');
  bindSimple();
}

function validVitalEntry(entry){if(!['pa','temp','fr','fc','sat','glicemia'].some(k=>entry[k]!==''&&entry[k]!=null)){toast('Informe ao menos um sinal vital.','error');return false;}return true;}

function refreshMedicationRows(form) {
  const rows = [...form.querySelectorAll('[data-medication-row]')];
  rows.forEach((row, index) => {
    row.querySelector('legend').textContent = `Medicamento ${index + 1}`;
    const remove = row.querySelector('[data-remove-medication]');
    remove.disabled = rows.length === 1;
    remove.setAttribute('aria-label', `Remover medicamento ${index + 1}`);
  });
}
function bindMedicationForm(form, kind, editedEntry = null) {
  const list = form.querySelector('[data-medication-list]');
  refreshMedicationRows(form);
  form.addEventListener('click', event => {
    if (event.target.closest('[data-add-medication]')) {
      list.insertAdjacentHTML('beforeend', medicationRow(kind, {}, list.children.length));
      refreshMedicationRows(form);
    }
    const remove = event.target.closest('[data-remove-medication]');
    if (remove && !remove.disabled) { remove.closest('[data-medication-row]').remove(); refreshMedicationRows(form); }
  });
  form.onsubmit = event => {
    event.preventDefault();
    const medications = [...form.querySelectorAll('[data-medication-row]')].map(row => Object.fromEntries(medicationFields[kind].map(([name]) => [name, row.querySelector(`[data-medication-field="${name}"]`).value.trim()])));
    if (!medications.length || medications.some(item => medicationFields[kind].some(([name,, , required]) => required && !item[name]))) { toast('Preencha os campos obrigatórios de cada medicamento.', 'error'); return; }
    const data = Object.fromEntries(new FormData(form));
    const first = medications[0];
    const entry = { ...data, ...first, medicamentosItens:medications };
    if (kind === 'recipe') {
      entry.medicamentos = medications.map(item => item.medicamento).join('\n');
      entry.posologia = medications.map(item => item.posologia).join('\n');
      entry.quantidade = medications.map(item => item.quantidade).join('\n');
    }
    if (editedEntry) {
      saveEditedRecord(kind === 'recipe' ? 'receitas' : 'prescricoes', editedEntry.id, entry);
      closeModal(); prPage(); toast('Registro atualizado com sucesso!'); return;
    }
    const timestamp = nowParts();
    entry.id = DB.id(); entry.pacienteId = pid; entry.data = timestamp.data; entry.hora = timestamp.hora; entry.registradoEm = timestamp.registradoEm;
    const key = kind === 'recipe' ? 'receitas' : 'prescricoes';
    const items = load(key); items.push(entry); save(key, items); note(kind === 'recipe' ? 'Receita registrada' : 'Prescrição registrada');
    toast(kind === 'recipe' ? 'Receita registrada com sucesso!' : 'Prescrição registrada com sucesso!'); prPage();
  };
}

function bindSimple() {
  document.querySelectorAll('[data-medication-form]').forEach(form => bindMedicationForm(form, form.dataset.medicationForm));
  document.querySelectorAll('.simple').forEach(professionalFields);
  document.querySelectorAll('.simple').forEach(form => form.onsubmit = event => {
    event.preventDefault();
    if (!validateProfessional(form)||!form.reportValidity()) return;
    const entry = Object.fromEntries(new FormData(form));
    if ('profissional' in entry) {
      entry.profissional = entry.profissional.trim();
      if (!entry.profissional) { toast('Informe o nome do profissional.', 'error'); return; }
    }
    if ('cargo' in entry) { entry.cargo = entry.cargo.trim(); if (!entry.cargo) { toast('Informe o cargo.', 'error'); return; } }
    if(form.dataset.k==='sinais_vitais'&&!validVitalEntry(entry))return;
    const timestamp = nowParts();
    entry.id = DB.id();
    entry.pacienteId = pid;
    entry.data = entry.data || timestamp.data;
    entry.hora = entry.hora || timestamp.hora;
    entry.registradoEm = timestamp.registradoEm;
    entry.profissional = entry.profissional || currentIdentity().name;
    const items = load(form.dataset.k);
    items.push(entry);
    save(form.dataset.k, items);
    note(form.dataset.event);
    toast(`${form.dataset.event} com sucesso!`);
    prPage();
  });
}

const editableSections = {evolucoes:evolution,anotacoes_enfermagem:nursingNotes,sinais_vitais:vitalSigns,solicitacoes_exames:examRequests,procedimentos:procedures,diagnosticos:diagnosis,planos:carePlan,prescricoes:prescription,receitas:recipeView};
function triageEditor() {
  return simpleForm('triagens', 'Triagem atualizada', [['queixa','Queixa principal','text',true],['sintomas','Sintomas'],['dor','Dor (0–10)','number'],['peso','Peso (kg)','number'],['altura','Altura (m)','number'],['pa','PA (mmHg)'],['temp','T (°C)','number'],['fr','FR (irpm)','number'],['fc','FC (bpm)','number'],['sat','Saturação %','number'],['glicemia','Glicemia (mg/dL)','number'],['obs','Observações','textarea']]);
}
window.editRecord = (key,id) => {
  const entry=records(key).find(item=>item.id==id);
  if (entry && (key === 'prescricoes' || key === 'receitas')) {
    const kind = key === 'receitas' ? 'recipe' : 'prescription';
    modal(`<h2>Editar ${key === 'receitas' ? 'receita' : 'prescrição'}</h2>${medicationForm(kind, entry, true)}`, true);
    bindMedicationForm(document.querySelector('[data-medication-form]'), kind, entry);
    return;
  }
  const render=key==='triagens'?triageEditor:editableSections[key];
  if(!entry||!render){toast('Registro não encontrado.','error');return;}
  const container=document.createElement('div');container.innerHTML=render();
  const source=container.querySelector('form');
  source.classList.remove('simple');source.id='editClinicalRecord';
  const grid=source.querySelector('.form-grid');
  for(const field of [['data','Data','date'],['hora','Horário','time'],['profissional','Profissional responsável']])if(!(key==='receitas'&&['data','hora'].includes(field[0]))&&!source.querySelector('[name="'+field[0]+'"]'))grid.insertAdjacentHTML('beforeend',fieldMarkup(field));
  source.querySelector('.actions').innerHTML='<button type="submit">Salvar alterações</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button>';
  professionalFields(source);
  modal('<h2><span aria-hidden="true">✎</span> Editar registro</h2>'+source.outerHTML);
  const form=document.querySelector('#editClinicalRecord');
  for(const field of form.elements)if(field.name)field.value=entry[field.name]??(field.name==='sat'?entry.spo2??'':'');
  if(key==='triagens'){
    for(const n of ['pa','temp','fr','fc','sat','glicemia'])form.elements[n].required=true;
    for(const input of form.querySelectorAll('input[type="number"]'))input.min='0';
    form.elements.dor.max='10';form.elements.sat.max='100';
    form.elements.pa.pattern='[0-9]{1,3} */ *[0-9]{1,3}';form.elements.pa.title='Informe no formato 120/80';
  }
  form.onsubmit=event=>{event.preventDefault();if(!validateProfessional(form)||!form.reportValidity())return;const changes=Object.fromEntries(new FormData(form));
    if(form.elements.profissional.required&&!changes.profissional.trim()){toast('Informe o nome do profissional.','error');return;}
    changes.profissional=changes.profissional.trim();
    if ('cargo' in changes) { changes.cargo=changes.cargo.trim(); if (!changes.cargo) { toast('Informe o cargo.','error');return; } }
    if(key==='sinais_vitais'&&!validVitalEntry(changes))return;
    if(key==='sinais_vitais'&&'spo2' in entry)changes.spo2=changes.sat;
    if(key==='triagens'){
      const weight=Number(changes.peso),height=Number(changes.altura);
      changes.imc=weight>0&&height>0?(weight/(height*height)).toFixed(2):'';
      if('spo2' in entry)changes.spo2=changes.sat;
    }
    saveEditedRecord(key,id,changes);closeModal();prPage();toast('Registro atualizado com sucesso!');
  };
};
function saveEditedRecord(key,id,changes){
  const items=load(key);const index=items.findIndex(item=>item.id==id&&item.pacienteId==pid);
  if(index<0)throw new Error('Registro não encontrado.');
  const original=items[index];items[index]={...original,...changes,id:original.id,pacienteId:original.pacienteId,registradoEm:original.registradoEm};
  save(key,items);note('Registro atualizado.');
}

window.removeRecord = (key, id) => { if (confirm('Excluir este registro?')) { save(key, load(key).filter(entry => entry.id != id)); toast('Registro excluído.', 'warn'); prPage(); } };
window.printHistory = () => modal(printableHistory(), true);
window.receipt = () => openPrintSelection('receituario');
window.gerarPrescricao = window.receipt;
window.salvarDiagnostico = () => document.querySelector('.simple')?.requestSubmit();
window.salvarPlano = window.salvarDiagnostico;
window.salvarProcedimento = window.salvarDiagnostico;
prPage();


