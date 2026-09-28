/* Componente compartilhado pela página de usuários e pela aba de Configurações. */
(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
  const semester=value=>{const match=normalize(value).match(/^([1-8])\s*(?:º|o|°)?\s*(?:semestre)?$/);return match?`${match[1]}º semestre`:'';};
  const periods=window.PEPAcademicContext?.semesters||Array.from({length:8},(_,index)=>`${index+1}º semestre`);
  const lastLogin=value=>{
    const date=value?.toDate?.()||(value?.seconds?new Date(value.seconds*1000):value?new Date(value):null);
    return date&&!Number.isNaN(date.getTime())?date.toLocaleString('pt-BR'):'Nunca acessou';
  };
  window.mountUserManagement=async(root,options={})=>{
    const firebase=await window.PEPFirebaseReady;
    if(!firebase.enabled){root.innerHTML='<p class="error">O Firebase não pôde ser iniciado.</p>';return;}
    const {profile}=await firebase.sessionReady;
    if(!firebase.isStaff(profile)){root.innerHTML='<p class="error">Acesso restrito a docentes e administradores.</p>';return;}
    const admin=firebase.isAdmin(profile),ownUnit=profile.unidade||'Unidade acadêmica';
    let users=[],units=[];
    if(admin){try{units=await firebase.listUnits()}catch(error){console.warn('Não foi possível carregar as unidades para o formulário de usuário.',error)}}
    root.classList.add('user-management');
    root.innerHTML=`<h2>${options.embedded?'Gestão de Usuários':admin?'Gestão de usuários':'Alunos da unidade'}</h2><p class="muted">${admin?'Consulte os acessos e vínculos acadêmicos. Desative contas sem apagar o histórico.':`Cadastre alunos da unidade ${esc(ownUnit)} e consulte seus acessos.`}</p><div class="user-management-toolbar"><label class="field user-search-field">Buscar usuário<input id="userSearch" type="search" placeholder="Nome ou e-mail" autocomplete="off"></label><label class="field">Unidade<select id="userUnitFilter">${admin?'<option value="">Todas as unidades</option>':`<option value="${esc(ownUnit)}">${esc(ownUnit)}</option>`}${admin?units.map(unit=>`<option value="${esc(unit.nome)}">${esc(unit.nome)}</option>`).join(''):''}</select></label><label class="field">Semestre<select id="userSemesterFilter"><option value="">Todos os semestres</option>${periods.map(period=>`<option value="${esc(period)}">${esc(period)}</option>`).join('')}</select></label><label class="field">Perfil<select id="userRoleFilter"><option value="">Todos os perfis</option>${['Aluno','Docente','Administrador'].map(role=>`<option>${role}</option>`).join('')}</select></label><button type="button" id="newUserButton">＋ ${admin?'Novo usuário':'Novo aluno'}</button></div><p class="muted" id="usersTotal" role="status" aria-live="polite"></p><div id="usersTable"></div>`;
    const search=root.querySelector('#userSearch'),unitFilter=root.querySelector('#userUnitFilter'),semesterFilter=root.querySelector('#userSemesterFilter'),roleFilter=root.querySelector('#userRoleFilter');
    if(!admin){semesterFilter.value=semester(profile.semestre);semesterFilter.disabled=true;}
    function syncUnitOptions(){if(!admin)return;const selected=normalize(unitFilter.value),names=[...new Map([...units.map(unit=>unit.nome),...users.map(user=>user.unidade)].filter(Boolean).map(name=>[normalize(name),name])).values()];unitFilter.innerHTML='<option value="">Todas as unidades</option>'+names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');unitFilter.value=names.find(name=>normalize(name)===selected)||'';}
    function render(){
      const term=normalize(search.value),unit=unitFilter.value,semester=semesterFilter.value,role=roleFilter.value;
      const visible=users.filter(user=>(!term||[user.nome,user.email,user.perfil,user.unidade,user.turma].some(value=>normalize(value).includes(term)))&&(!unit||normalize(user.unidade)===normalize(unit))&&(!semester||semester===semesterValue(user.semestre))&&(!role||normalize(user.perfil)===normalize(role)));
      root.querySelector('#usersTotal').textContent=`${visible.length} ${visible.length===1?'usuário encontrado':'usuários encontrados'}`;
      root.querySelector('#usersTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Curso</th><th>Unidade</th><th>Turma</th><th>Semestre</th><th>Status</th><th>Último login</th><th>Ações</th></tr></thead><tbody>${visible.map(user=>`<tr><td>${esc(user.nome)}</td><td>${esc(user.email)}</td><td>${esc(user.perfil)}</td><td>${esc(user.curso||'—')}</td><td>${esc(user.unidade||'—')}</td><td>${esc(user.turma||'—')}</td><td>${esc(user.semestre||'—')}</td><td><span class="status ${user.status==='Inativo'?'inactive':''}">${esc(user.status||'Ativo')}</span></td><td>${esc(lastLogin(user.lastLoginAt))}</td><td>${admin?`<button type="button" class="secondary" data-user-edit="${esc(user.uid)}">Editar</button> <button type="button" class="${user.status==='Inativo'?'secondary':'danger'}" data-user-status="${esc(user.uid)}">${user.status==='Inativo'?'Ativar':'Desativar'}</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="10">Nenhum usuário encontrado.</td></tr>'}</tbody></table></div>`;
      root.querySelectorAll('[data-user-status]').forEach(button=>{if(button.dataset.userStatus===firebase.user?.uid){button.disabled=true;button.title='Não é possível desativar o próprio acesso.';}});
    }
    const semesterValue=semester;
    function semesterField(existing){return `<label class="field" id="userSemesterField">Semestre*<select name="semestre">${['',...periods].map(period=>`<option value="${esc(period)}" ${period===semester(existing.semestre)?'selected':''}>${period||'Selecione o semestre'}</option>`).join('')}</select><small class="semester-help">${admin?'Definido pelo administrador.':'Definido pelo docente.'}</small></label>`;}
    async function openUser(uid){
      if(uid&&!admin)return;
      if(admin){try{units=await firebase.listUnits();syncUnitOptions()}catch(error){console.warn('Não foi possível atualizar as unidades.',error)}}
      const existing=users.find(user=>user.uid===uid)||{perfil:'Aluno',status:'Ativo',curso:'Enfermagem',unidade:admin?(units[0]?.nome||ownUnit):ownUnit,semestre:admin?'':semester(profile.semestre)};
      const creating=!uid;
      let classes=[];
      if(!admin){try{classes=await firebase.listClasses(ownUnit)}catch(error){toast('Não foi possível carregar as turmas da unidade.','error');return}}
      const knownUnits=[...new Set([...units.map(unit=>unit.nome),existing.unidade||ownUnit])];
      const unitField=admin?`<label class="field">Unidade de ensino*<select name="unidade" required>${knownUnits.map(unit=>`<option value="${esc(unit)}" ${unit===existing.unidade?'selected':''}>${esc(unit)}</option>`).join('')}</select></label>`:`<label class="field">Unidade de ensino<input value="${esc(ownUnit)}" readonly><input name="unidade" type="hidden" value="${esc(ownUnit)}"></label>`;
      const classField=admin?`<label class="field">Turma*<input name="turma" value="${esc(existing.turma||'')}" required></label>`:`<label class="field">Turma*<select name="turma" required><option value="">Selecione a turma</option>${classes.map(item=>`<option value="${esc(item.nome)}">${esc(item.nome)}</option>`).join('')}</select></label>`;
      const roleField=admin?`<label class="field">Perfil*<select name="perfil">${['Aluno','Docente','Administrador'].map(role=>`<option ${role===existing.perfil?'selected':''}>${role}</option>`).join('')}</select></label>`:'<label class="field">Perfil<input value="Aluno" readonly><input type="hidden" name="perfil" value="Aluno"></label>';
      modal(`<h2>${creating?(admin?'Novo usuário':'Novo aluno'):'Editar usuário'}</h2><form id="userForm" class="form-card"><div class="form-grid"><label class="field">Nome completo*<input name="nome" value="${esc(existing.nome||'')}" required></label><label class="field">E-mail*<input name="email" type="email" value="${esc(existing.email||'')}" ${creating?'':'readonly'} required></label>${creating?'<label class="field">Senha inicial*<input name="password" type="password" minlength="6" required autocomplete="new-password"></label>':''}${roleField}<label class="field">Curso<input name="curso" value="${esc(existing.curso||'Enfermagem')}"></label>${unitField}${classField}${semesterField(existing)}</div><p class="muted">Por segurança, e-mail e senha de usuários existentes são alterados pelo próprio usuário em Configurações.</p><p class="error" id="userError" aria-live="polite"></p><div class="actions"><button type="submit">${creating?(admin?'Criar usuário':'Cadastrar aluno'):'Salvar alterações'}</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button></div></form>`);
      const form=document.querySelector('#userForm');
      if(!admin&&existing.turma)form.elements.turma.value=existing.turma;
      const updateSemester=()=>{const needsSemester=['Aluno','Docente'].includes(form.elements.perfil.value),field=form.querySelector('#userSemesterField');field.hidden=!needsSemester;form.elements.semestre.disabled=!needsSemester||!admin;form.elements.semestre.required=needsSemester&&admin;};
      form.elements.perfil.addEventListener('change',updateSemester);updateSemester();
      form.onsubmit=async event=>{
        event.preventDefault();
        const data=Object.fromEntries(new FormData(form)),error=form.querySelector('#userError'),button=form.querySelector('button[type="submit"]');
        if(!admin)data.semestre=semester(profile.semestre);
        data.status=creating?'Ativo':existing.status||'Ativo';error.textContent='';button.disabled=true;
        try{
          if(creating)await firebase.createUser(data);else await firebase.updateUser(uid,data);
          window.markFormSaved?.(form);closeModal();toast(creating?'Usuário criado com sucesso.':'Usuário atualizado com sucesso.');
        }catch(exception){error.textContent=exception.message||'Não foi possível salvar o usuário.';button.disabled=false;}
      };
    }
    function confirmStatus(uid){
      if(!admin)return;
      const user=users.find(item=>item.uid===uid);if(!user)return;
      const next=user.status==='Inativo'?'Ativo':'Inativo',verb=next==='Ativo'?'ativar':'desativar';
      modal(`<section class="management-confirm"><h2>Confirmar ${verb}</h2><p>Deseja ${verb} o acesso de <strong>${esc(user.nome)}</strong> (${esc(user.email)})?</p>${next==='Inativo'?'<p class="muted">O histórico e os registros acadêmicos permanecerão preservados.</p>':''}<div class="actions"><button type="button" class="${next==='Ativo'?'':'danger'}" id="confirmUserStatus">${next==='Ativo'?'Ativar':'Desativar'}</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button></div></section>`,true);
      document.querySelector('#confirmUserStatus').onclick=async event=>{const button=event.currentTarget;button.disabled=true;try{await firebase.setUserStatus(uid,next);closeModal();toast(`Usuário ${next==='Ativo'?'ativado':'desativado'} com sucesso.`)}catch(error){toast(error.message||'Não foi possível alterar o acesso.','error');button.disabled=false}};
    }
    [search,unitFilter,semesterFilter,roleFilter].forEach(control=>control.addEventListener(control===search?'input':'change',render));
    root.querySelector('#newUserButton').onclick=()=>openUser();
    root.querySelector('#usersTable').onclick=event=>{const edit=event.target.closest('[data-user-edit]'),status=event.target.closest('[data-user-status]');if(edit)openUser(edit.dataset.userEdit);if(status)confirmStatus(status.dataset.userStatus);};
    window.openUser=openUser;
    const unsubscribe=await firebase.watchUsers(next=>{users=next;syncUnitOptions();render()});
    window.addEventListener('pagehide',()=>unsubscribe?.(),{once:true});
    return {refresh:render,unsubscribe};
  };
})();
