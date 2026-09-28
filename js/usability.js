/* Proteção dos formulários e identificação do paciente. */
const changedForms=new Set(),accountEditedForms=new WeakSet(),formBaselines=new WeakMap();let currentSubmitForm=null;
function formSnapshot(form){return JSON.stringify([...form.elements].filter(field=>field.name&&!field.disabled&&field.type!=='search'&&field.type!=='hidden').map(field=>[field.name,field.type,field.type==='checkbox'||field.type==='radio'?field.checked:field.value]));}
function trackableForm(form){return form&&!form.matches('#reportSearchForm,#adminContextForm,#semesterSelectionForm,#calendarPeriodForm,#fullHistoryPrintForm');}
function dirtyForms(){return [...changedForms].filter(form=>form.isConnected&&trackableForm(form)&&formBaselines.has(form)&&formSnapshot(form)!==formBaselines.get(form));}
window.confirmDiscardChanges=()=>{if(!dirtyForms().length)return true;if(!confirm('Há alterações não salvas. Deseja sair e descartá-las?'))return false;changedForms.clear();return true;};
window.markFormSaved=form=>{if(!form)return;formBaselines.set(form,formSnapshot(form));changedForms.delete(form);};
window.currentSubmittedForm=()=>currentSubmitForm;
window.markCurrentFormSaved=()=>window.markFormSaved(currentSubmitForm);
window.discardFormChanges=form=>{if(!form||!dirtyForms().includes(form))return true;if(!confirm('Há alterações não salvas. Deseja descartá-las?'))return false;window.markFormSaved(form);return true;};
function recordFormChange(event){const field=event.target;if(!event.isTrusted||!field.matches?.('input,select,textarea')||!field.name||field.type==='search'||field.type==='hidden')return;const form=field.form;if(!trackableForm(form))return;if(form.id==='firebaseAccountForm'&&!accountEditedForms.has(form))return;if(!formBaselines.has(form)){formBaselines.set(form,formSnapshot(form));return;}changedForms.add(form);}
document.addEventListener('beforeinput',event=>{const field=event.target,form=field.form;if(!event.isTrusted||form?.id!=='firebaseAccountForm'||!field.matches?.('input,textarea')||!field.name)return;if(!accountEditedForms.has(form)){formBaselines.set(form,formSnapshot(form));accountEditedForms.add(form);changedForms.delete(form);}},true);
document.addEventListener('input',recordFormChange,true);
document.addEventListener('change',recordFormChange,true);
document.addEventListener('submit',e=>{currentSubmitForm=e.target;setTimeout(()=>{currentSubmitForm=null;},0);},true);
window.addEventListener('beforeunload',e=>{if(dirtyForms().length){e.preventDefault();e.returnValue='';}});
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href]'),button=e.target.closest('button');
  const leaves=link&&!link.getAttribute('href').startsWith('#')||button&&/location\.href|togglePatients/.test(button.getAttribute('onclick')||'');
  if(leaves&&dirtyForms().length){if(!confirm('Há alterações não salvas. Deseja sair e descartá-las?')){e.preventDefault();e.stopImmediatePropagation();}else changedForms.clear();}
},true);
const originalCloseModal=window.closeModal;
window.closeModal=()=>{for(const form of dirtyForms().filter(f=>f.closest('#modal')))if(!discardFormChanges(form))return;originalCloseModal();};
const originalToast=window.toast;
window.toast=(message,type='success')=>{if(type==='success'&&currentSubmitForm?.id==='configForm')markCurrentFormSaved();originalToast(message,type);};
const uiEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function patientIdentityMarkup(p){return p?`<strong>${uiEsc(p.nome)}</strong><span>Nascimento: ${uiEsc(fmt(p.nascimento))} · Prontuário: ${uiEsc(patientNumber(p))}</span>`:'<strong>Selecione um paciente antes de registrar.</strong>';}
function updateAttendancePatient(){const select=document.querySelector('.attendance-panel [name="pacienteId"]'),banner=document.querySelector('#attendanceIdentity');if(!select||!banner)return;const p=load('pacientes').find(p=>p.id==select.value);banner.innerHTML=patientIdentityMarkup(p);}
function enhanceForms(){
  for(const form of document.querySelectorAll('form:not([data-enhanced])')){
    form.dataset.enhanced='1';
    for(const input of form.querySelectorAll('input[name="profissional"],input[name="aluno"]')){input.required=true;input.placeholder='Aluno';if(form.id!=='editClinicalRecord'&&['Aluno','Aluno(a) PEP'].includes(input.value)){input.value='';input.defaultValue='';}}
    formBaselines.set(form,formSnapshot(form));
  }
  const panel=document.querySelector('.attendance-panel');
  if(panel&&!document.querySelector('#attendanceIdentity')){const banner=document.createElement('div');banner.id='attendanceIdentity';banner.className='patient-context';banner.setAttribute('aria-live','polite');panel.before(banner);updateAttendancePatient();}
}
document.addEventListener('change',e=>{if(e.target.matches('.attendance-panel [name="pacienteId"]'))updateAttendancePatient();});
document.addEventListener('reset',()=>setTimeout(updateAttendancePatient,0));
enhanceForms();new MutationObserver(enhanceForms).observe(document.querySelector('#app'),{childList:true,subtree:true});
const originalModal=window.modal;
window.modal=(html,hideHeader=false)=>{for(const form of dirtyForms().filter(f=>f.closest('#modal')))if(!discardFormChanges(form))return;if(/id="editClinicalRecord"/.test(html)){const p=patient();html='<div class="patient-context modal-patient">'+patientIdentityMarkup(p)+'</div>'+html;}originalModal(html,hideHeader);};
const originalShell=window.shell;
window.shell=(html,title)=>{for(const form of dirtyForms())if(!discardFormChanges(form))return;originalShell(html,title);};
