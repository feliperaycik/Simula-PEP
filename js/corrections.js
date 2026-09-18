function correctionHistory(patientId,key,id,expanded=false){
  const entries=load('auditoria').filter(e=>e.pacienteId==patientId&&(!key||e.colecao===key)&&(!id||e.registroId==id)).slice().reverse();
  const clean=value=>Object.fromEntries(Object.entries(value||{}).filter(([k])=>!['id','pacienteId','_version','registradoPor'].includes(k)));
  return `<section class="correction-history"><h2>Histórico de correções</h2><p class="muted">Alterações e exclusões guardadas a partir da versão 20. Registros anteriores não têm histórico retroativo.</p>${entries.map(e=>`<details ${expanded?'open':''}><summary>${esc(e.acao)} · ${esc(new Date(e.em).toLocaleString('pt-BR'))} · ${esc(e.usuario?.nome||'Não informado')}</summary><p>Registro ${esc(e.registroId)} · ${esc(e.colecao.replaceAll('_',' '))}</p><h3>Conteúdo anterior</h3><pre>${esc(JSON.stringify(clean(e.antes),null,2))}</pre><h3>${e.depois?'Conteúdo corrigido':'Registro excluído'}</h3>${e.depois?'<pre>'+esc(JSON.stringify(clean(e.depois),null,2))+'</pre>':''}</details>`).join('')||'<p class="muted">Nenhuma correção registrada.</p>'}</section>`;
}
window.showRecordChanges=(key,id)=>{modal(correctionHistory(pid,key,id));};
