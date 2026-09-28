/* Distribuição baseada nos atendimentos disponíveis para a unidade atual. */
(() => {
  function renderDistribution() {
    const anchor = document.querySelector('.report-metrics');
    if (!anchor || document.querySelector('#reportDistribution')) return;
    const patients = load('pacientes');
    const appointments = load('atendimentos');
    const entries=[['Consultas atendidas',appointments.filter(item=>item.status==='Concluído').length],['Consultas canceladas',appointments.filter(item=>item.status==='Cancelado').length],['Pacientes',patients.length]];
    const total=entries.reduce((sum,[,value])=>sum+value,0);const colors=['#087fac','#c55d77','#20a570'];const gradient=entries.map(([,_value],index)=>{const before=entries.slice(0,index).reduce((sum,[,value])=>sum+value,0)/Math.max(total,1)*100,after=(entries.slice(0,index+1).reduce((sum,[,value])=>sum+value,0)/Math.max(total,1)*100);return `${colors[index]} ${before}% ${after}%`;}).join(', ');
    const section=document.createElement('section'); section.id='reportDistribution'; section.className='card report-dashboard';
    section.innerHTML=`<div class="report-dashboard-chart"><h2>Dashboard de relatórios</h2><p class="muted">Consultas e pacientes registrados no contexto selecionado.</p>${total?`<div class="report-chart-graphic" role="img" aria-label="Gráfico de consultas atendidas, canceladas e pacientes"><div class="report-donut" style="background:conic-gradient(${gradient})"><span><b>${total}</b>registros</span></div><ul class="report-chart-legend">${entries.map(([label,value],index)=>`<li><i style="background:${colors[index]}"></i><span>${safe(label)}</span><strong>${value}</strong></li>`).join('')}</ul></div>`:'<p class="muted">Ainda não há dados para representar no gráfico.</p>'}</div><aside class="report-dashboard-list" aria-label="Resumo dos dados"><h3>Resumo</h3><dl><div><dt>Consultas atendidas</dt><dd>${entries[0][1]}</dd></div><div><dt>Consultas canceladas</dt><dd>${entries[1][1]}</dd></div><div><dt>Pacientes</dt><dd>${patients.length}</dd></div></dl></aside>`;
    anchor.replaceWith(section);
  }
  renderDistribution();
})();
