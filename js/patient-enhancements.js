/* Complementos do cadastro do paciente: identificação, saúde e contato. */
(() => {
  const style = document.createElement('link'); style.rel = 'stylesheet'; style.href = 'css/patient-revision.css?v=30'; document.head.append(style);
  const esc = value => safe(value ?? '');
  const health = [['alergiasPossui','Possui alergias?','alergias','Quais alergias?'],['medicamentosPossui','Faz uso de medicamentos?','medicamentos','Quais medicamentos?'],['cronicasPossui','Possui doenças pré-existentes?','cronicas','Quais?'],['cirurgiasPossui','Já realizou cirurgias?','cirurgias','Quais cirurgias?']];
  const yesNo = value => `<option value="Não" ${value==='Não'?'selected':''}>Não</option><option value="Sim" ${value==='Sim'?'selected':''}>Sim</option>`;
  const maskCPF = value => String(value||'').replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  const validCPF = value => validSimulatedCPF(value);
  function details(patient) { return health.map(([flag,label,field,detail])=>{ const value=patient[flag]||(patient[field]?'Sim':'Não'); return `<label class="field">${label}<select name="${flag}" data-detail="${field}">${yesNo(value)}</select></label><label class="field span-2 conditional-detail" data-field="${field}" ${value==='Sim'?'':'hidden'}>${detail}<input name="${field}" value="${esc(patient[field]||'')}"></label>`; }).join(''); }
  function form(patient={}) { const foreign=patient.estrangeiro==='Sim',agreement=patient.convenioPossui==='Sim',admin=window.PEPAcademicContext.get().role==='administrador'; return `<form id="patientForm" class="form-card patient-registration-form" novalidate><div class="patient-form-title"><div class="patient-avatar">${pepIcon('person')}</div><div><span>Cadastro do paciente ${patient.id?`· Prontuário ${esc(patientNumber(patient))}`:''}</span><p>Dados pessoais, contato e informações clínicas</p></div></div>
  <fieldset class="patient-data-group"><legend>Identificação e dados pessoais</legend><div class="form-grid"><label class="field span-2">Nome completo*<input name="nome" required value="${esc(patient.nome||'')}"></label><label class="field">Nome social<input name="social" value="${esc(patient.social||'')}"></label><label class="field">Nascimento*<input name="nascimento" type="date" required value="${esc(patient.nascimento||'')}"></label><label class="field">Sexo*<select name="sexo" required><option value="">Selecione</option>${['Feminino','Masculino','Outro','Prefiro não informar'].map(v=>`<option ${patient.sexo===v?'selected':''}>${v}</option>`).join('')}</select></label>${admin?(patient.id?`<p class="field-help">Turma: ${esc(patient.turma||'Turma acadêmica')}</p>`:'<label class="field">Turma*<select name="turma" required><option value="">Carregando turmas...</option></select></label>'):''}<label class="field">Paciente estrangeiro?<select name="estrangeiro" id="foreignPatient">${yesNo(foreign?'Sim':'Não')}</select></label><label class="field span-2" id="cpfField">CPF*<input name="cpf" inputmode="numeric" maxlength="14" value="${esc(maskCPF(patient.cpf||''))}"></label><label class="field span-2" id="foreignDocument" ${foreign?'':'hidden'}>Documento de identificação do estrangeiro*<input name="documentoEstrangeiro" value="${esc(patient.documentoEstrangeiro||'')}"></label><p class="field-help span-3" id="foreignHelp" ${foreign?'':'hidden'}>Para pacientes estrangeiros, o CPF não é obrigatório.</p><label class="field">RG<input name="rg" value="${esc(patient.rg||'')}"></label><label class="field">CNS<input name="cns" value="${esc(patient.cns||'')}"></label></div></fieldset>
  <fieldset class="patient-data-group"><legend>Endereço e contato</legend><div class="form-grid compact-contact-grid"><label class="field">CEP<input name="cep" value="${esc(patient.cep||'')}"></label><label class="field span-2">Endereço<input name="rua" value="${esc(patient.rua||'')}"></label><label class="field">Número<input name="numero" value="${esc(patient.numero||'')}"></label><label class="field">Complemento<input name="complemento" value="${esc(patient.complemento||'')}"></label><label class="field">Bairro<input name="bairro" value="${esc(patient.bairro||'')}"></label><label class="field">Cidade<input name="cidade" value="${esc(patient.cidade||'')}"></label><label class="field">Estado<input name="estado" value="${esc(patient.estado||'')}"></label><label class="field">País<input name="pais" value="${esc(patient.pais||'')}"></label><label class="field">Telefone<input name="telefone" type="tel" value="${esc(patient.telefone||'')}"></label><label class="field">Celular<input name="celular" type="tel" value="${esc(patient.celular||'')}"></label><label class="field">E-mail<input name="email" type="email" value="${esc(patient.email||'')}"></label></div></fieldset>
  <fieldset class="patient-data-group emergency-contact"><legend>Contato de emergência</legend><div class="form-grid"><label class="field span-2">Nome<input name="emergenciaNome" value="${esc(patient.emergenciaNome||'')}"></label><label class="field">Grau de parentesco<input name="emergenciaParentesco" value="${esc(patient.emergenciaParentesco||'')}"></label><label class="field">Telefone<input name="emergenciaTelefone" type="tel" value="${esc(patient.emergenciaTelefone||'')}"></label></div></fieldset>
  <fieldset class="patient-data-group"><legend>Informações complementares</legend><div class="form-grid"><label class="field span-3">Observação<textarea name="obs" rows="4">${esc(patient.obs||'')}</textarea></label></div></fieldset>
  <fieldset class="patient-data-group"><legend>Informações de saúde</legend><div class="form-grid"><label class="field">Altura (m)<input name="altura" value="${esc(patient.altura||'')}"></label><label class="field">Peso (kg)<input name="peso" value="${esc(patient.peso||'')}"></label><label class="field">Tipo sanguíneo<select name="sangue"><option value="">Selecione</option>${['A+','A-','B+','B-','AB+','AB-','O+','O-','Não informado'].map(v=>`<option ${patient.sangue===v?'selected':''}>${v}</option>`).join('')}</select></label>${details(patient)}</div></fieldset>
  <fieldset class="patient-data-group"><legend>Convênio médico</legend><div class="form-grid"><label class="field">Possui convênio médico?<select name="convenioPossui" id="agreementToggle">${yesNo(agreement?'Sim':'Não')}</select></label><div class="form-grid span-3" id="agreementFields" ${agreement?'':'hidden'}><label class="field">Nome do convênio<input name="convenioNome" value="${esc(patient.convenioNome||'')}"></label><label class="field">Número da carteirinha<input name="convenioCarteirinha" value="${esc(patient.convenioCarteirinha||'')}"></label><label class="field">Validade<input name="convenioValidade" type="date" value="${esc(patient.convenioValidade||'')}"></label></div></div></fieldset>
  <p class="error" id="formError" aria-live="polite"></p><div class="actions"><button>Salvar paciente</button><button type="button" class="secondary" onclick="location.href='pacientes.html'">Cancelar</button></div></form>`; }
  function bind(editId) {
    const patientForm=document.querySelector('#patientForm'),cpf=patientForm.elements.cpf,foreign=patientForm.elements.estrangeiro;
    const classSelect=patientForm.elements.turma;
    if(classSelect)window.PEPFirebaseReady.then(async firebase=>{
      await firebase.sessionReady;
      const context=window.PEPAcademicContext.get();
      const classes=(await firebase.listClasses(context.unit)).filter(item=>!context.semester||!item.semestre||item.semestre===context.semester);
      if(!classSelect.isConnected)return;
      classSelect.innerHTML='<option value="">Selecione a turma</option>'+classes.map(item=>`<option value="${esc(item.nome)}">${esc(item.nome)}</option>`).join('');
      if(!classes.length)patientForm.querySelector('#formError').textContent='Não há turma cadastrada para esta unidade e semestre.';
    }).catch(error=>{patientForm.querySelector('#formError').textContent=error.message||'Não foi possível carregar as turmas.';});
    const foreignState=()=>{
      const on=foreign.value==='Sim',cpfLabel=document.querySelector('#cpfField');
      cpf.required=!on;cpfLabel.firstChild.textContent=on?'CPF':'CPF*';
      document.querySelector('#foreignDocument').hidden=!on;
      document.querySelector('#foreignDocument input').required=on;
      document.querySelector('#foreignHelp').hidden=!on;
    };
    cpf.oninput=()=>cpf.value=maskCPF(cpf.value);
    foreign.onchange=foreignState;foreignState();
    patientForm.querySelectorAll('[data-detail]').forEach(control=>control.onchange=()=>{
      const target=document.querySelector('[data-field="'+control.dataset.detail+'"]');
      target.hidden=control.value!=='Sim';
      if(target.hidden)target.querySelector('input').value='';
    });
    document.querySelector('#agreementToggle').onchange=event=>{
      const target=document.querySelector('#agreementFields');
      target.hidden=event.target.value!=='Sim';
      if(target.hidden)target.querySelectorAll('input').forEach(input=>input.value='');
    };
    patientForm.dataset.editing=editId?'1':'';
    patientForm.onsubmit=async event=>{
      event.preventDefault();
      const data=Object.fromEntries(new FormData(patientForm)),error=document.querySelector('#formError'),button=patientForm.querySelector('.actions button');
      error.textContent='';
      if(!patientForm.reportValidity())return;
      data.cpf=maskCPF(data.cpf||'');
      if(data.cpf&&!validCPF(data.cpf)){error.textContent='Informe 11 dígitos de CPF fictício.';cpf.focus();return;}
      if(data.estrangeiro==='Sim'&&!data.documentoEstrangeiro.trim()){error.textContent='Informe o documento de identificação do paciente estrangeiro.';return;}
      if(new Date(data.nascimento)>new Date()){error.textContent='Data de nascimento inválida.';return;}
      health.forEach(([flag,,field])=>{if(data[flag]!=='Sim')data[field]='';});
      if(data.convenioPossui!=='Sim')['convenioNome','convenioCarteirinha','convenioValidade'].forEach(key=>data[key]='');
      button.disabled=true;
      try{
        const result=await persistPatientRecord(data,editId);
        editId=result.id;
        if(!result.synced){error.textContent='Paciente salvo neste navegador, mas não sincronizado. Tente salvar novamente antes de sair.';return;}
        window.markFormSaved?.(patientForm);
        note('Paciente '+(patientForm.dataset.editing?'atualizado':'cadastrado')+': '+data.nome);
        sessionStorage.setItem('pep_patient_notice',patientForm.dataset.editing?'Paciente atualizado com sucesso.':'Paciente cadastrado com sucesso.');
        location.href='pacientes.html';
      }catch(exception){error.textContent=exception.message||'Não foi possível salvar o paciente.';}
      finally{button.disabled=false;}
    };
  }
  function openRevision(patient,id) { modal(form(patient));document.querySelector('#patientForm .actions').insertAdjacentHTML('beforeend',`<button type="button" class="danger" onclick="deletePatient(${id})">Excluir paciente</button>`);bind(id); }
  window.editPatient = id => { const patient=load('pacientes').find(item=>item.id==id);if(patient)openRevision(patient,id); };
  if(new URLSearchParams(location.search).has('novo')) { shell(form(), 'Pacientes'); bind(); }
})();
