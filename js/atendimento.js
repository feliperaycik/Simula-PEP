/* Registro de atendimento e triagem com sinais vitais. */
const qs = new URLSearchParams(location.search);
const selected = qs.get('id') || '';
const linkedAppointmentId = qs.get('agendamento') || '';

function opts() {
  return '<option value="">Selecione um paciente</option>'+load('pacientes').map(patient => `<option value="${patient.id}" ${patient.id == selected ? 'selected' : ''}>${safe(patient.nome)} · Nº ${patientNumber(patient)}</option>`).join('');
}

const attendanceTabs = [['novo', 'Novo atendimento'], ['triagem', 'Triagem']];

function newAttendance() {
  return `<form class="form-card record" data-store="atendimentos" data-event="Atendimento criado"><div class="form-grid"><label class="field">Paciente*<select name="pacienteId" required>${opts()}</select></label><label class="field">Data*<input name="data" type="date" value="${localDate()}" required></label><label class="field">Horário de agendamento*<input name="hora" type="time" required></label><label class="field">Tipo*<select name="tipo"><option>Consulta de enfermagem</option><option>Retorno</option><option>Visita domiciliar</option></select></label><label class="field">Responsável*<input name="aluno" placeholder="Aluno" required></label><label class="field">Status<select name="status"><option>Aguardando</option><option>Em andamento</option><option>Concluído</option><option>Cancelado</option></select></label></div><div class="actions"><button>Criar atendimento</button></div></form>`;
}

function triage() {
  return `<form class="form-card record" data-store="triagens" data-event="Triagem registrada"><div class="form-grid"><label class="field">Paciente*<input name="pacienteId" type="hidden" value="${safe(load('pacientes').find(p=>p.id==selected)?.id||'')}"><input id="selectedPatientName" placeholder="Paciente..." readonly value="${safe(load('pacientes').find(p=>p.id==selected)?.nome||'')}"></label><label class="field">Queixa principal*<input name="queixa" required></label><label class="field">Sintomas<input name="sintomas"></label><label class="field">Dor (0–10)<input name="dor" type="number" min="0" max="10"></label><label class="field">Peso (kg)<input id="peso" name="peso" type="number" min="0" step=".1"></label><label class="field">Altura (m)<input id="altura" name="altura" type="number" min="0" step=".01"></label><label class="field">IMC educacional<input id="imc" name="imc" readonly></label><label class="field">Profissional responsável*<input name="aluno" placeholder="Aluno" required></label><label class="field">Cargo*<input name="cargo" placeholder="Cargo" required></label><label class="field span-2">Observações<textarea name="obs"></textarea></label></div><fieldset class="vital-fields"><legend>Sinais vitais obrigatórios</legend><p class="muted">Preencha PA, temperatura, frequência respiratória, frequência cardíaca, saturação e glicemia.</p><div class="form-grid"><label class="field"><span>PA (mmHg)</span><input name="pa" required placeholder="120/80" pattern="[0-9]{1,3}\\s*/\\s*[0-9]{1,3}" title="Informe no formato 120/80"></label><label class="field"><span>T (°C)</span><input name="temp" required type="number" min="0" step="0.1"></label><label class="field"><span>FR (irpm)</span><input name="fr" required type="number" min="0" step="1"></label><label class="field"><span>FC (bpm)</span><input name="fc" required type="number" min="0" step="1"></label><label class="field"><span>Saturação %</span><input name="sat" required type="number" min="0" max="100" step="0.1"></label><label class="field"><span>Glicemia (mg/dL)</span><input name="glicemia" required type="number" min="0" step="1"></label></div></fieldset><p class="muted" id="imcClass">O IMC é apresentado apenas como recurso educacional.</p><div class="actions"><button>Salvar triagem</button></div></form>`;
}

function attendanceContent(tab) {
  return tab === 'triagem' ? triage() : newAttendance();
}

function triagePatientInitials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toLocaleUpperCase('pt-BR');
}

function renderTriagePatients() {
  const list = document.querySelector('#triagePatientList');
  if (!list) return;
  const term = document.querySelector('#patientLookup').value.trim();
  const patients = load('pacientes').filter(patient => matchesPatient(patient, term));
  const selectedId = document.querySelector('#triagem [name="pacienteId"]').value;
  document.querySelector('#triagePatientSummary').textContent = `${term ? 'Resultados da busca' : 'Todos os pacientes'} · ${patients.length} ${patients.length === 1 ? 'paciente' : 'pacientes'}`;
  list.innerHTML = `<div class="patient-grid" role="list">${patients.map(patient => {
    const chosen = String(patient.id) === selectedId;
    return `<article class="patient-card ${chosen ? 'triage-patient-selected' : ''}" role="listitem"><button class="patient-card-main triage-patient-choice" type="button" data-triage-patient="${safe(patient.id)}" aria-label="Selecionar ${safe(patient.nome)} para triagem" aria-pressed="${chosen}"><span class="patient-card-avatar" aria-hidden="true">${safe(triagePatientInitials(patient.nome))}</span><span class="patient-card-name">${safe(patient.nome)}</span><span class="patient-card-id">Prontuário ${safe(patientNumber(patient))}</span></button><dl class="patient-card-data"><div><dt>Nascimento</dt><dd>${fmt(patient.nascimento)}</dd></div><div><dt>Idade</dt><dd>${age(patient.nascimento)} anos</dd></div><div><dt>Sexo</dt><dd>${safe(patient.sexo || 'Não informado')}</dd></div></dl><div class="patient-card-actions"><button type="button" data-triage-patient="${safe(patient.id)}">${chosen ? 'Paciente selecionado' : 'Iniciar triagem'}</button></div></article>`;
  }).join('') || `<div class="patient-directory-empty"><strong>${term ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}</strong><span>${term ? 'Altere a busca para encontrar outro cadastro.' : 'Cadastre um paciente na aba Pacientes para iniciar a triagem.'}</span></div>`}</div>`;
}

function selectTriagePatient(id, focusForm = true) {
  const patient = load('pacientes').find(item => String(item.id) === String(id));
  if (!patient) return;
  const form = document.querySelector('#triagem form');
  form.elements.pacienteId.value = String(patient.id);
  const display = document.querySelector('#selectedPatientName');
  display.value = `${patient.nome} · Nº ${patientNumber(patient)}`;
  display.setCustomValidity('');
  form.elements.pacienteId.dispatchEvent(new Event('change', { bubbles: true }));
  renderTriagePatients();
  if (focusForm) {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.elements.queixa.focus({ preventScroll: true });
  }
}

function atPage() {
  shell(`<section class="patient-directory triage-directory" aria-label="Pacientes para triagem"><div class="patient-directory-actions"><div class="patient-directory-search">${pepIcon('search')}<input id="patientLookup" type="search" aria-label="Buscar paciente" placeholder="Buscar por nome, CPF ou prontuário" autocomplete="off"></div></div><p id="triagePatientSummary" class="patient-filter-summary" aria-live="polite"></p><div id="triagePatientList"></div></section><section class="attendance-panel" id="triagem">${triage()}</section>`, 'Triagem');
  document.querySelector('#patientLookup').oninput = renderTriagePatients;
  document.querySelector('#triagePatientList').onclick = event => {
    const choice = event.target.closest('[data-triage-patient]');
    if (choice) selectTriagePatient(choice.dataset.triagePatient);
  };
  document.querySelectorAll('.record').forEach(form => form.onsubmit = record);
  renderTriagePatients();
  window.PEPFirebaseReady?.then(async firebase => {
    await firebase.sessionReady;
    await firebase.hydrationReady;
    if (!document.querySelector('#triagePatientList')) return;
    if (selected && !document.querySelector('#triagem [name="pacienteId"]').value) selectTriagePatient(selected, false);
    renderTriagePatients();
  }).catch(error => console.warn('Não foi possível atualizar a lista de pacientes da triagem.', error));
}

window.addEventListener('pep-stores-hydrated', () => {
  if (!document.querySelector('#triagePatientList')) return;
  if (selected && !document.querySelector('#triagem [name="pacienteId"]').value) selectTriagePatient(selected, false);
  renderTriagePatients();
});

function record(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!load('pacientes').some(p=>p.id==form.elements.pacienteId.value)){toast('Busque e selecione um paciente.','error');document.querySelector('#patientLookup').focus();return;}
  if (!validateProfessional(form)||!form.reportValidity()) return;
  if (form.elements.cargo && !form.elements.cargo.value.trim()) { form.elements.cargo.setCustomValidity('Informe o cargo do profissional.'); form.elements.cargo.reportValidity(); form.elements.cargo.oninput=()=>form.elements.cargo.setCustomValidity(''); return; }
  const data = Object.fromEntries(new FormData(form));
  if ([...form.querySelectorAll('input[type=number]')].some(input => input.value && Number(input.value) < 0)) {
    toast('Não informe valores negativos.', 'error');
    return;
  }
  data.registradoEm = new Date().toISOString();
  data.id = DB.id();
  if (form.dataset.store === 'triagens' && linkedAppointmentId) data.atendimentoId = linkedAppointmentId;
  data.data = data.data || localDate();
  data.hora = data.hora || new Date().toTimeString().slice(0, 5);
  const entries = load(form.dataset.store);
  entries.push(data);
  save(form.dataset.store, entries);
  if (form.dataset.store === 'triagens' && linkedAppointmentId) {
    save('atendimentos',load('atendimentos').map(a=>String(a.id)===String(linkedAppointmentId)?{...a,status:'Triagem'}:a));
  }
  note(form.dataset.event);
  toast(`${form.dataset.event} com sucesso!`);
  form.reset();
  form.elements.pacienteId.value='';
  document.querySelector('#selectedPatientName').value='';
  window.updateAttendancePatient?.();
  renderTriagePatients();
}

document.addEventListener('input', event => {
  if (event.target.id !== 'peso' && event.target.id !== 'altura') return;
  const weight = Number(document.querySelector('#peso')?.value);
  const height = Number(document.querySelector('#altura')?.value);
  const imcField = document.querySelector('#imc');
  const classification = document.querySelector('#imcClass');
  if (!imcField || !classification) return;
  if (Number.isFinite(weight) && Number.isFinite(height) && weight > 0 && height > 0) {
    const value = weight / (height * height);
    imcField.value = value.toFixed(2);
    classification.textContent = `IMC ${value.toFixed(2)} — ${value < 18.5 ? 'baixo peso' : value < 25 ? 'eutrofia' : value < 30 ? 'sobrepeso' : 'obesidade'} (recurso educacional).`;
  } else {
    imcField.value = '';
    classification.textContent = 'Informe peso e altura válidos, maiores que zero, para calcular o IMC.';
  }
});

window.criarAtendimento = () => document.querySelector('[data-store="atendimentos"]')?.requestSubmit();
window.salvarTriagem = () => document.querySelector('[data-store="triagens"]')?.requestSubmit();
atPage();
