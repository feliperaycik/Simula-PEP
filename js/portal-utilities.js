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
    const markup = `<section class="private-notes"><div class="private-notes-head"><div><h2>Anotações</h2><p class="muted">Um espaço pessoal para registrar lembretes e observações.</p></div><button type="button" class="close" onclick="closeModal()" aria-label="Fechar anotações">×</button></div><form id="privateNotesForm" class="private-notes-form"><label class="field">Escreva uma anotação<textarea name="text" required maxlength="1200" placeholder="Digite aqui sua anotação..."></textarea></label><div class="actions"><button>Salvar anotação</button><button type="button" class="secondary" onclick="closeModal()">Cancelar</button></div></form><div class="private-notes-list">${list}</div></section>`;
    window.modal?.(markup, true);
    document.querySelector('#privateNotesForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const text = new FormData(event.currentTarget).get('text')?.trim();
      if (!text) return;
      const updated = [...readNotes(), { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, text, date:new Date().toLocaleString('pt-BR') }];
      try { saveNotes(updated); window.markFormSaved?.(event.currentTarget); window.closeModal?.(); window.toast?.('Anotação salva com sucesso.'); }
      catch (error) { window.toast?.('Não foi possível salvar a anotação.', 'error'); }
    });
    document.querySelectorAll('.utility-note-delete').forEach(button => button.onclick = () => {
      saveNotes(readNotes().filter(row => row.id !== button.dataset.noteId)); window.openPrivateNotes();
    });
  };

  // O rodapé é gerado junto com o shell em app.js. Este módulo cuida apenas das
  // ações dele; não observa nem reescreve o DOM global.
})();
