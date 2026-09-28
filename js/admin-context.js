/* Unidade e semestre selecionados pelo administrador para consultar a Agenda. */
(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const periods=window.PEPAcademicContext?.semesters||[];
  let units=[],started=false;
  const isAdmin=()=>String(localStorage.getItem('pep_current_role')||'').toLocaleLowerCase('pt-BR')==='administrador';
  const selectedUnit=()=>localStorage.getItem('pep_admin_unit')||'';
  const selectedSemester=()=>localStorage.getItem('pep_selected_semester')||'';
  const unitOptions=value=>units.map(unit=>`<option value="${esc(unit.nome)}" ${unit.nome===value?'selected':''}>${esc(unit.nome)}</option>`).join('');
  const semesterOptions=value=>periods.map(period=>`<option value="${esc(period)}" ${period===value?'selected':''}>${esc(period)}</option>`).join('');
  function saveSelection(unit,semester){
    if(!units.some(item=>item.nome===unit)||!periods.includes(semester))throw new Error('Selecione uma unidade e um semestre válidos.');
    localStorage.setItem('pep_admin_unit',unit);
    localStorage.setItem('pep_current_unit',unit);
    localStorage.setItem('pep_current_unit_key',encodeURIComponent(unit));
    localStorage.setItem('pep_selected_semester',semester);
    location.reload();
  }
  function mount(){
    if(!isAdmin()||!units.length)return;
    const actions=document.querySelector('.topbar .top-actions');
    if(!actions||actions.querySelector('.admin-context-control'))return;
    const controls=document.createElement('div');controls.className='admin-context-control';
    controls.innerHTML=`<label>Unidade<select aria-label="Unidade de ensino selecionada">${unitOptions(selectedUnit())}</select></label><label>Semestre<select aria-label="Semestre selecionado"><option value="">Selecione</option>${semesterOptions(selectedSemester())}</select></label>`;
    const [unitField,semesterField]=controls.querySelectorAll('select');
    unitField.onchange=()=>{if(!semesterField.value){semesterField.focus();window.toast?.('Selecione também o semestre.','warn');return}saveSelection(unitField.value,semesterField.value)};
    semesterField.onchange=()=>{if(!semesterField.value)return;saveSelection(unitField.value,semesterField.value)};
    actions.prepend(controls);
  }
  function promptSelection(){
    if(document.body.dataset.page!=='dashboard'||!isAdmin()||!document.querySelector('#modal')||!units.length)return;
    if(units.some(item=>item.nome===selectedUnit())&&periods.includes(selectedSemester()))return;
    modal(`<section class="semester-selection"><h2>Selecione a unidade e o semestre</h2><p>Escolha os dados que deseja consultar na Agenda.</p><form id="adminContextForm"><label class="field">Unidade<select name="unit" required><option value="">Selecione a unidade</option>${unitOptions(selectedUnit())}</select></label><label class="field">Semestre<select name="semester" required><option value="">Selecione o semestre</option>${semesterOptions(selectedSemester())}</select></label><div class="actions"><button>Continuar</button></div></form></section>`,true);
    document.querySelector('#adminContextForm').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;try{saveSelection(form.elements.unit.value,form.elements.semester.value)}catch(error){window.toast?.(error.message,'error')}};
  }
  async function start(){
    if(started)return;started=true;
    const firebase=await window.PEPFirebaseReady;
    const {profile}=await firebase.sessionReady;
    if(!firebase.isAdmin(profile))return;
    units=firebase.enabled?await firebase.listUnits():load('unidades');
    if(!units.length)units=[{nome:profile.unidade||'Unidade acadêmica'}];
    if(selectedUnit()&&!units.some(item=>item.nome===selectedUnit())){
      localStorage.removeItem('pep_admin_unit');localStorage.removeItem('pep_selected_semester');location.reload();return;
    }
    new MutationObserver(mount).observe(document.querySelector('#app'),{childList:true,subtree:true});
    mount();window.setTimeout(promptSelection,0);
  }
  start().catch(error=>console.warn('Não foi possível carregar as unidades do administrador.',error));
})();
