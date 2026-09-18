/* Cadastro de unidades de ensino, exclusivo da administração. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const localUnits = () => load('unidades');
  const saveLocalUnit = name => { const list=localUnits(); if (!list.some(unit => String(unit.nome).toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) { list.push({ id:DB.id(), nome:name }); save('unidades',list); } };
  async function start() {
    const firebase = await window.PEPFirebaseReady;
    const { profile } = await firebase.sessionReady;
    if (!firebase.isAdmin(profile)) return;
    let units = firebase.enabled ? await firebase.listUnits() : localUnits();
    if (!units.length) units = [{ nome:'Unidade acadêmica' }]; save('unidades', units.map(unit=>({id:unit.id||DB.id(),nome:unit.nome}))); 
    const section=document.createElement('section'); section.className='form-card unit-management';
    const render=()=>{ section.innerHTML=`<h2>Unidades de ensino</h2><p class="muted">Cadastre as instituições que poderão ser vinculadas a alunos e docentes.</p><form id="unitForm"><div class="form-grid"><label class="field">Nome da unidade*<input name="nome" required placeholder="Ex.: Faculdade Senac"></label></div><div class="actions"><button>Cadastrar unidade</button></div><p class="error" aria-live="polite"></p></form><div class="unit-list" aria-live="polite">${units.map(unit=>`<span class="status">${esc(unit.nome)}</span>`).join('')}</div>`; const form=section.querySelector('form'); form.onsubmit=async event=>{event.preventDefault(); const name=String(new FormData(form).get('nome')||'').trim(),error=form.querySelector('.error');error.textContent=''; try { if(firebase.enabled) await firebase.createUnit(name); else saveLocalUnit(name); units=firebase.enabled?await firebase.listUnits():localUnits(); if(!units.length)units=[{nome:'Unidade acadêmica'}]; save('unidades',units.map(unit=>({id:unit.id||DB.id(),nome:unit.nome}))); render(); toast('Unidade cadastrada com sucesso.'); } catch(exception) { error.textContent=exception.message||'Não foi possível cadastrar a unidade.'; } }; };
    render(); document.querySelector('.content')?.append(section);
  }
  start().catch(error=>console.warn('Não foi possível carregar as unidades.',error));
})();
