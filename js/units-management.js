/* Aba administrativa para unidades, turmas e vínculos acadêmicos. */
(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const periods=window.PEPAcademicContext?.semesters||[];
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
  const semesterOf=value=>{const match=normalize(value).match(/^([1-8])\s*(?:º|o|°)?\s*(?:semestre)?$/);return match?`${match[1]}º semestre`:'';};
  let firebase,units=[],classes=[],users=[];
  let editing=null;
  const section=document.createElement('section');
  section.className='unit-management';
  const unitFilter=()=>section.querySelector('#managementUnitFilter')?.value||'';
  const semesterFilter=()=>section.querySelector('#managementSemesterFilter')?.value||'';
  const classInSemester=item=>!semesterFilter()||semesterOf(item.semestre)===semesterFilter();
  const unitOptions=(selected='',all=false)=>`${all?'<option value="">Todas as unidades</option>':''}${units.map(unit=>`<option value="${esc(unit.nome)}" ${unit.nome===selected?'selected':''}>${esc(unit.nome)}</option>`).join('')}`;
  const semesterOptions=(selected='',all=false)=>`${all?'<option value="">Todos os semestres</option>':'<option value="">Selecione o semestre</option>'}${periods.map(period=>`<option value="${esc(period)}" ${period===selected?'selected':''}>${esc(period)}</option>`).join('')}`;

  async function refresh(){
    units=await firebase.listUnits();
    classes=(await Promise.all(units.map(async unit=>(await firebase.listClasses(unit.nome)).map(item=>({...item,unidade:unit.nome}))))).flat();
    users=await firebase.listUsers();
    save('unidades',units.map(unit=>({id:unit.id||DB.id(),nome:unit.nome})));
    save('turmas',classes.map(item=>({id:item.id||DB.id(),nome:item.nome,unidade:item.unidade,semestre:item.semestre||''})));
  }
  function renderLists(){
    const unit=unitFilter(),semester=semesterFilter();
    const visibleClasses=classes.filter(item=>(!unit||normalize(item.unidade)===normalize(unit))&&classInSemester(item));
    const relatedUsers=users.filter(user=>{
      if(unit&&normalize(user.unidade)!==normalize(unit))return false;
      if(!semester)return true;
      return semesterOf(user.semestre)===semester;
    });
    const teachers=relatedUsers.filter(user=>user.perfil==='Docente');
    const students=relatedUsers.filter(user=>user.perfil==='Aluno');
    const target=section.querySelector('#managementResults');
    target.innerHTML=`<div class="management-summary"><div class="card">Unidades<b>${unit?1:units.length}</b></div><div class="card">Turmas<b>${visibleClasses.length}</b></div><div class="card">Docentes<b>${teachers.length}</b></div><div class="card">Alunos<b>${students.length}</b></div></div><div class="table-wrap"><table><thead><tr><th>Unidade</th><th>Turma</th><th>Semestre</th><th>Ações</th></tr></thead><tbody>${visibleClasses.map(item=>`<tr><td>${esc(item.unidade)}</td><td>${esc(item.nome)}</td><td>${esc(item.semestre||'Não informado')}</td><td><button type="button" class="secondary" data-edit-class="${esc(item.chave||item.id)}" data-unit="${esc(item.unidade)}">Editar</button> <button type="button" class="danger" data-delete-class="${esc(item.chave||item.id)}" data-unit="${esc(item.unidade)}">Excluir</button></td></tr>`).join('')||'<tr><td colspan="4">Nenhuma turma para os filtros selecionados.</td></tr>'}</tbody></table></div><h3>Unidades de ensino</h3><div class="unit-list">${units.filter(item=>!unit||normalize(item.nome)===normalize(unit)).map(item=>`<div class="unit-item"><span>${esc(item.nome)}</span><button type="button" class="danger" data-delete-unit="${esc(item.id)}">Excluir</button></div>`).join('')||'<p class="muted">Nenhuma unidade cadastrada.</p>'}</div><h3>Usuários relacionados</h3><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Perfil</th><th>Unidade</th><th>Turma</th><th>Semestre</th></tr></thead><tbody>${relatedUsers.map(user=>`<tr><td>${esc(user.nome)}</td><td>${esc(user.perfil)}</td><td>${esc(user.unidade)}</td><td>${esc(user.turma||'—')}</td><td>${esc(user.semestre||'—')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum usuário para os filtros selecionados.</td></tr>'}</tbody></table></div>`;
  }
  function render(){
    const oldUnit=unitFilter(),oldSemester=semesterFilter();
    section.innerHTML=`<h2>Gestão de Unidade de Ensino e Turmas</h2><p class="muted">Organize unidades e turmas. A exclusão é bloqueada quando existem vínculos ou registros.</p><div class="management-filters"><label class="field">Filtrar unidade<select id="managementUnitFilter">${unitOptions(oldUnit,true)}</select></label><label class="field">Filtrar semestre<select id="managementSemesterFilter">${semesterOptions(oldSemester,true)}</select></label></div><div class="management-forms"><form class="form-card" id="unitForm"><h3>Nova unidade de ensino</h3><label class="field">Nome da unidade*<input name="nome" required></label><div class="actions"><button>Cadastrar unidade</button></div></form><form class="form-card" id="classForm"><h3 id="classFormTitle">Nova turma</h3><div class="form-grid"><label class="field">Unidade*<select name="unidade" required><option value="">Selecione</option>${unitOptions()}</select></label><label class="field">Turma*<input name="turma" required></label><label class="field">Semestre*<select name="semestre" required>${semesterOptions()}</select></label></div><div class="actions"><button id="classSubmit">Cadastrar turma</button><button type="button" class="secondary" id="cancelClassEdit" hidden>Cancelar edição</button></div></form></div><div id="managementResults"></div>`;
    section.querySelector('#managementUnitFilter').onchange=renderLists;
    section.querySelector('#managementSemesterFilter').onchange=renderLists;
    section.querySelector('#unitForm').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,name=String(new FormData(form).get('nome')||'').trim(),button=form.querySelector('button');button.disabled=true;
      try{await firebase.createUnit(name);await refresh();render();toast('Unidade cadastrada com sucesso.')}
      catch(error){toast(error.message||'Não foi possível cadastrar a unidade.','error')}
      finally{button.disabled=false}
    };
    section.querySelector('#classForm').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form)),button=form.querySelector('#classSubmit');button.disabled=true;
      try{if(editing)await firebase.updateClass(editing.unidade,editing.nome,data.turma,data.semestre);else await firebase.createClass(data.unidade,data.turma,data.semestre);editing=null;await refresh();render();toast('Turma salva com sucesso.')}
      catch(error){toast(error.message||'Não foi possível salvar a turma.','error')}
      finally{button.disabled=false}
    };
    section.querySelector('#cancelClassEdit').onclick=()=>{editing=null;render()};
    renderLists();
  }
  function confirmRemoval(message,action){
    modal(`<section class="management-confirm"><h2>Confirmar exclusão</h2><p>${esc(message)}</p><div class="actions"><button type="button" class="danger" id="confirmManagementDelete">Excluir</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button></div></section>`,true);
    document.querySelector('#confirmManagementDelete').onclick=async event=>{
      event.currentTarget.disabled=true;
      try{await action();await refresh();closeModal();render();toast('Exclusão concluída com sucesso.')}
      catch(error){toast(error.message||'Não foi possível concluir a exclusão.','error');event.currentTarget.disabled=false}
    };
  }
  section.addEventListener('click',event=>{
    const edit=event.target.closest('[data-edit-class]');
    const removeClass=event.target.closest('[data-delete-class]');
    const removeUnit=event.target.closest('[data-delete-unit]');
    if(edit){
      const item=classes.find(row=>row.unidade===edit.dataset.unit&&(row.chave||row.id)===edit.dataset.editClass);
      if(!item)return;
      editing=item;const form=section.querySelector('#classForm');
      form.elements.unidade.value=item.unidade;form.elements.unidade.disabled=true;
      form.elements.turma.value=item.nome;form.elements.semestre.value=item.semestre||'';
      section.querySelector('#classFormTitle').textContent='Editar turma';
      section.querySelector('#classSubmit').textContent='Salvar turma';
      section.querySelector('#cancelClassEdit').hidden=false;form.scrollIntoView({behavior:'smooth',block:'center'});
    }
    if(removeClass){
      const item=classes.find(row=>row.unidade===removeClass.dataset.unit&&(row.chave||row.id)===removeClass.dataset.deleteClass);
      if(item)confirmRemoval(`Excluir a turma ${item.nome} da unidade ${item.unidade}?`,()=>firebase.deleteClass(item.unidade,item.nome));
    }
    if(removeUnit){
      const item=units.find(row=>row.id===removeUnit.dataset.deleteUnit);
      if(item)confirmRemoval(`Excluir a unidade ${item.nome}?`,()=>firebase.deleteUnit(item.nome));
    }
  });
  async function start(){
    firebase=await window.PEPFirebaseReady;
    const {profile}=await firebase.sessionReady;
    if(!firebase.isStaff(profile))return;
    const admin=firebase.isAdmin(profile);
    if(admin)await refresh();
    const content=document.querySelector('.content');
    if(!content)return;
    const tabs=document.createElement('nav');tabs.className='settings-tabs';tabs.setAttribute('aria-label','Abas de configurações');tabs.setAttribute('role','tablist');
    const definitions=[['Meu acesso','settingsProfilePane'],...(admin?[['Gestão de Unidade de Ensino e Turmas','settingsAcademicPane']]:[]),['Gestão de Usuários','settingsUsersPane']];
    tabs.innerHTML=definitions.map(([label,id],index)=>`<button type="button" role="tab" aria-controls="${id}" aria-selected="${index===0}" class="${index===0?'active':''}">${label}</button>`).join('');
    const panes=definitions.map(([,id],index)=>{const pane=document.createElement('div');pane.id=id;pane.className='settings-pane';pane.setAttribute('role','tabpanel');pane.hidden=index!==0;return pane});
    content.querySelector('.page-head')?.after(tabs,...panes);
    const [profilePane,managementPane,usersPane]=admin?panes:[panes[0],null,panes[1]];
    const moveExisting=()=>[...content.children].filter(node=>![content.querySelector('.page-head'),tabs,...panes].includes(node)).forEach(node=>profilePane.append(node));
    moveExisting();new MutationObserver(moveExisting).observe(content,{childList:true});
    if(admin){managementPane.append(section);render()}
    const userSection=document.createElement('section');usersPane.append(userSection);
    [...tabs.children].forEach((button,index)=>button.onclick=()=>{
      [...tabs.children].forEach((tab,i)=>{tab.classList.toggle('active',i===index);tab.setAttribute('aria-selected',String(i===index))});
      panes.forEach((pane,i)=>pane.hidden=i!==index);
      history.replaceState(null,'',`${location.pathname}${location.search}${definitions[index][1]==='settingsUsersPane'?'#gestao-usuarios':''}`);
    });
    if(location.hash==='#gestao-usuarios')tabs.querySelector('[aria-controls="settingsUsersPane"]')?.click();
    await window.mountUserManagement(userSection,{embedded:true});
  }
  start().catch(error=>console.warn('Não foi possível carregar a gestão acadêmica.',error));
})();
