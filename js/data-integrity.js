/* Persistência local com autoria e histórico das alterações a partir da v20. */
const clinicalStores = ['pacientes','atendimentos','triagens','sinais_vitais','evolucoes','anotacoes_enfermagem','solicitacoes_exames','procedimentos','diagnosticos','planos','prescricoes','prescricoes_cuidados','receitas'];
const backupStores = [...clinicalStores,'avaliacoes','auditoria','usuarios','unidades','notificacoes','chamados'];
function localActor(){return {nome:localStorage.getItem('pep_current_user')||'Aluno(a) PEP',email:localStorage.getItem('pep_current_email')||'aluno@pep.com'};}
function auditedSave(key, values){
  const previous=JSON.parse(localStorage.getItem('pep_'+key)||'[]');
  const scoped=window.PEPAcademicContext?.mergeForSave?.(key,previous,structuredClone(values))||structuredClone(values);
  let next=scoped,audit=JSON.parse(localStorage.getItem('pep_auditoria')||'[]');
  if(clinicalStores.includes(key)){
    const actor=localActor(),now=new Date().toISOString(),oldMap=new Map(previous.map(e=>[String(e.id),e]));
    next=next.map(entry=>{const old=oldMap.get(String(entry.id));const {registradoPor,...fields}=entry;return old?{...fields,...(old.registradoPor?{registradoPor:old.registradoPor}:{})}:{...fields,registradoPor:actor};});
    const academic=window.PEPAcademicContext?.get?.()||{};
    for(const item of next){const old=oldMap.get(String(item.id));if(old&&JSON.stringify(old)!==JSON.stringify(item))audit.push({id:Date.now()+Math.random(),colecao:key,registroId:item.id,pacienteId:key==='pacientes'?item.id:item.pacienteId,acao:'Edição',em:now,usuario:actor,unidade:item.unidade||old?.unidade||academic.unit||'Unidade acadêmica',antes:old,depois:item});}
    for(const item of previous)if(!next.some(e=>String(e.id)===String(item.id)))audit.push({id:Date.now()+Math.random(),colecao:key,registroId:item.id,pacienteId:key==='pacientes'?item.id:item.pacienteId,acao:'Exclusão',em:now,usuario:actor,unidade:item.unidade||academic.unit||'Unidade acadêmica',antes:item,depois:null});
  }
  const oldData=localStorage.getItem('pep_'+key),oldAudit=localStorage.getItem('pep_auditoria');
  try{localStorage.setItem('pep_'+key,JSON.stringify(next));if(clinicalStores.includes(key))localStorage.setItem('pep_auditoria',JSON.stringify(audit));}
  catch(error){if(oldData===null)localStorage.removeItem('pep_'+key);else localStorage.setItem('pep_'+key,oldData);if(oldAudit===null)localStorage.removeItem('pep_auditoria');else localStorage.setItem('pep_auditoria',oldAudit);alert('Não foi possível salvar. Verifique o espaço disponível no navegador e faça um backup.');throw error;}
  if(key!=='notificacoes')window.markCurrentFormSaved?.();
  window.PEPFirebase?.syncStore?.(key,next).catch(error=>console.warn('A alteração foi salva neste navegador, mas ainda não foi enviada ao Firebase.',error));
  if(clinicalStores.includes(key))window.PEPFirebase?.syncStore?.('auditoria',load('auditoria')).catch(error=>console.warn('O histórico local ainda não foi enviado ao Firebase.',error));
}
function buildBackup(){const data={};for(const key of backupStores)data[key]=JSON.parse(localStorage.getItem('pep_'+key)||'[]');return {formato:'PEP-LOCAL',versao:1,geradoEm:new Date().toISOString(),dados:data};}
function validateBackup(value){
  if(value?.formato!=='PEP-LOCAL'||value.versao!==1||!value.dados||typeof value.dados!=='object')throw new Error('Este arquivo não é um backup compatível do PEP.');
  if(value.dados.receitas===undefined)value.dados.receitas=[];
  if(value.dados.avaliacoes===undefined)value.dados.avaliacoes=[];
  if(value.dados.unidades===undefined)value.dados.unidades=[];
  for(const key of backupStores){const list=value.dados[key];if(!Array.isArray(list)||list.some(e=>!e||typeof e!=='object'||Array.isArray(e)))throw new Error('Dados inválidos no backup: '+key);if(clinicalStores.includes(key)&&(list.some(e=>e.id==null)||new Set(list.map(e=>String(e.id))).size!==list.length))throw new Error('Identificadores inválidos: '+key);}
  return value;
}
function restoreBackup(value){
  validateBackup(value);const rollback={};for(const key of backupStores)rollback[key]=localStorage.getItem('pep_'+key);
  const oldSeed=localStorage.getItem('pep_seed');
  try{for(const key of backupStores)localStorage.setItem('pep_'+key,JSON.stringify(value.dados[key]));localStorage.setItem('pep_seed','1');}
  catch(error){for(const key of backupStores){if(rollback[key]===null)localStorage.removeItem('pep_'+key);else localStorage.setItem('pep_'+key,rollback[key]);}if(oldSeed===null)localStorage.removeItem('pep_seed');else localStorage.setItem('pep_seed',oldSeed);throw new Error('Não foi possível restaurar. Os dados anteriores foram preservados.');}
}
