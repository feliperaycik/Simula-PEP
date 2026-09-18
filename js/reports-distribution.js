/* Distribuição baseada nos atendimentos disponíveis para a unidade atual. */
(() => {
  function renderDistribution() {
    const anchor = document.querySelector('.report-metrics');
    if (!anchor || document.querySelector('#reportDistribution')) return;
    const patients = load('pacientes');
    const appointments = load('atendimentos');
    const groups = appointments.reduce((result,item) => { const key=item.tipo || 'Não informado'; result.set(key,(result.get(key)||0)+1); return result; },new Map());
    const entries=[...groups.entries()].sort((left,right)=>right[1]-left[1]); const total=entries.reduce((sum,[,value])=>sum+value,0); const colors=['#087fac','#20a570','#e7a21a','#7a62c9','#c55d77','#5f7f91']; const gradient=entries.map(([,_value],index)=>{const before=entries.slice(0,index).reduce((sum,[,value])=>sum+value,0)/Math.max(total,1)*100,after=(entries.slice(0,index+1).reduce((sum,[,value])=>sum+value,0)/Math.max(total,1)*100);return `${colors[index%colors.length]} ${before}% ${after}%`;}).join(', ');
    const section=document.createElement('section'); section.id='reportDistribution'; section.className='card report-dashboard';
    section.innerHTML=`<div class="report-dashboard-chart"><h2>Dashboard de relatórios</h2><p class="muted">Distribuição dos atendimentos registrados nesta unidade.</p>${entries.length?`<div class="report-chart-graphic" role="img" aria-label="Gráfico de distribuição de atendimentos por tipo"><div class="report-donut" style="background:conic-gradient(${gradient})"><span><b>${total}</b>consultas</span></div><ul class="report-chart-legend">${entries.map(([label,value],index)=>`<li><i style="background:${colors[index%colors.length]}"></i><span>${safe(label)}</span><strong>${value}</strong></li>`).join('')}</ul></div>`:'<p class="muted">Ainda não há atendimentos para representar no gráfico.</p>'}</div><aside class="report-dashboard-list" aria-label="Resumo dos dados"><h3>Resumo</h3><dl><div><dt>Total de pacientes</dt><dd>${patients.length}</dd></div><div><dt>Total de consultas</dt><dd>${appointments.length}</dd></div></dl></aside>`;
    anchor.replaceWith(section);
  }
  renderDistribution();
})();
