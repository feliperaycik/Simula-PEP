/* Barra de apoio acadêmico e anotações privadas do usuário. */
(() => {
  const notice = '⚠ AMBIENTE ACADÊMICO — DADOS FICTÍCIOS — SEM VALIDADE CLÍNICA OU LEGAL';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const icon = name => window.pepIcon?.(name) || '';
  const ownerKey = () => `pep_private_notes_${encodeURIComponent(window.currentIdentity?.().email || localStorage.getItem('pep_current_email') || 'visitante')}`;
  const readNotes = () => { try { return JSON.parse(localStorage.getItem(ownerKey()) || '[]'); } catch { return []; } };
  const saveNotes = rows => localStorage.setItem(ownerKey(), JSON.stringify(rows));

  window.scrollToPortalTop = () => window.scrollTo({ top:0, behavior:'smooth' });
  window.openPrivateNotes = () => {
    const rows = readNotes();
    const list = rows.slice().reverse().map(row => `<article><p>${esc(row.text)}</p><small>${esc(row.date)}</small><button type="button" class="utility-note-delete" data-note-id="${esc(row.id)}" aria-label="Excluir anotação">×</button></article>`).join('') || '<p class="muted">Nenhuma anotação particular ainda.</p>';
    const markup = `<section class="private-notes"><div class="private-notes-head"><div><h2>Anotações</h2><p class="muted">Um espaço pessoal para registrar lembretes e observações.</p></div><button type="button" class="close" onclick="closeModal()" aria-label="Fechar anotações">×</button></div><form id="privateNotesForm" class="private-notes-form"><label class="field">Escreva uma anotação<textarea name="text" required maxlength="1200" placeholder="Digite aqui sua anotação..."></textarea></label><div class="actions"><button>Salvar anotação</button></div></form><div class="private-notes-list">${list}</div></section>`;
    window.modal?.(markup, true);
    document.querySelector('#privateNotesForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const text = new FormData(event.currentTarget).get('text')?.trim();
      if (!text) return;
      const updated = [...readNotes(), { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, text, date:new Date().toLocaleString('pt-BR') }];
      saveNotes(updated); window.openPrivateNotes(); window.toast?.('Anotação salva com sucesso.');
    });
    document.querySelectorAll('.utility-note-delete').forEach(button => button.onclick = () => {
      saveNotes(readNotes().filter(row => row.id !== button.dataset.noteId)); window.openPrivateNotes();
    });
  };

  function mount() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    if (!document.querySelector('#portalUtilityBar')) {
      const bar = document.createElement('nav');
      bar.id = 'portalUtilityBar'; bar.className = 'portal-utility-bar'; bar.setAttribute('aria-label', 'Ferramentas rápidas');
      bar.innerHTML = `<a href="suporte.html" class="utility-support">Suporte</a><button type="button" class="utility-notes" onclick="openPrivateNotes()">Anotações</button><button type="button" class="utility-top" onclick="scrollToPortalTop()" aria-label="Voltar ao topo" title="Voltar ao topo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg></button>`;
      const academicFooter = topbar.closest('.main')?.querySelector('.academic');
      if (academicFooter) academicFooter.before(bar); else document.body.append(bar);
    }
  }
  const observer = new MutationObserver(mount);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();
