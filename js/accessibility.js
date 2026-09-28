/* Controles de acessibilidade compartilhados por todas as telas do PEP. */
(() => {
  'use strict';
  const keys = { scale: 'pep_font_scale', voice: 'pep_voice_enabled', libras: 'pep_libras' };
  const root = document.documentElement;
  let narrationTimer;
  if (localStorage.getItem('pep_voice_enabled') === null && localStorage.getItem('pep_narration') === '1') localStorage.setItem(keys.voice, '1');
  localStorage.removeItem('pep_narration');
  const getScale = () => {
    const value = Number(localStorage.getItem(keys.scale) || 1);
    return Number.isFinite(value) ? Math.min(2, Math.max(.8, value)) : 1;
  };
  const isOn = key => localStorage.getItem(key) === '1';
  const supportsSpeech = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const clean = text => String(text || '').replace(/\s+/g, ' ').trim();

  function announce(message) {
    const live = document.querySelector('#a11yStatus');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(() => { live.textContent = message; }, 20);
  }
  function apply() {
    const scale = getScale();
    root.style.setProperty('--a11y-scale', String(scale));
    document.body?.classList.toggle('a11y-scaled', scale !== 1);
    root.classList.remove('invert-colors');
    syncControls();
  }
  function getVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(voice => /^pt-BR/i.test(voice.lang)) || voices.find(voice => /^pt/i.test(voice.lang)) || null;
  }
  function speak(text, options = {}) {
    const message = clean(text);
    if (!message || !supportsSpeech()) return false;
    window.clearTimeout(narrationTimer);
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'pt-BR'; utterance.rate = .92; utterance.pitch = 1;
    const voice = getVoice();
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
    if (!options.silent) announce('Leitura por voz iniciada.');
    return true;
  }
  function mainText() {
    const content = document.querySelector('.content, main, .login-card') || document.body;
    const clone = content.cloneNode(true);
    clone.querySelectorAll('script,style,button,.a11y-only,[aria-hidden="true"],.toast,.modal').forEach(node => node.remove());
    const text = clean(clone.innerText || clone.textContent);
    return text.length > 2200 ? `${text.slice(0, 2200)}. O restante do conteúdo permanece disponível na tela.` : text;
  }
  function readCurrentPage() {
    const text = mainText();
    if (!text) return announce('Não há conteúdo disponível para leitura nesta tela.');
    speak(text);
  }
  function toggleVoice() {
    if (!supportsSpeech()) return announce('A leitura por voz não é compatível com este navegador.');
    const enabled = !isOn(keys.voice);
    localStorage.setItem(keys.voice, enabled ? '1' : '0');
    if (!enabled) speechSynthesis.cancel();
    syncControls();
    if (enabled) speak('Leitura automática ativada.', { silent: true });
    else announce('Leitura automática desativada.');
  }
  function changeScale(delta) {
    const next = Math.round((getScale() + delta) * 10) / 10;
    localStorage.setItem(keys.scale, String(Math.min(2, Math.max(.8, next))));
    apply(); announce(`Tamanho do texto: ${Math.round(getScale() * 100)} por cento.`);
  }
  function reset() {
    const librasEnabled = isOn(keys.libras);
    Object.values(keys).forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('pep_invert_colors');
    if (librasEnabled) disableLibras();
    if (supportsSpeech()) speechSynthesis.cancel();
    apply(); announce('Preferências de acessibilidade restauradas.');
  }
  function panelMarkup() {
    return `<span class="a11y-title">Acessibilidade</span><p class="a11y-description">As preferências valem em todas as telas.</p><div class="accessibility-row"><button type="button" data-a11y="smaller" aria-label="Diminuir tamanho do texto">A−</button><button type="button" data-a11y="larger" aria-label="Aumentar tamanho do texto">A+</button></div><button type="button" data-a11y="libras" aria-pressed="false">Libras — ativar tradutor</button><button type="button" data-a11y="read">▶ Ler esta página</button><button type="button" data-a11y="voice" aria-pressed="false">Ativar leitura automática</button><button type="button" data-a11y="reset">Restaurar preferências</button>`;
  }
  function bindPanel(panel) {
    if (panel.dataset.a11yReady === '1') return;
    panel.dataset.a11yReady = '1'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Opções de acessibilidade'); panel.innerHTML = panelMarkup();
    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-a11y]')?.dataset.a11y;
      if (!action) return;
      event.stopPropagation();
      ({ smaller: () => changeScale(-.1), larger: () => changeScale(.1), libras: toggleLibras, read: readCurrentPage, voice: toggleVoice, reset }[action])();
    });
  }
  function syncControls() {
    document.querySelectorAll('[data-a11y="smaller"]').forEach(button=>button.disabled=getScale()<=.8);
    document.querySelectorAll('[data-a11y="larger"]').forEach(button=>button.disabled=getScale()>=2);
    document.querySelectorAll('[data-a11y="libras"]').forEach(button => { button.setAttribute('aria-pressed', String(isOn(keys.libras))); button.textContent = isOn(keys.libras) ? 'Libras — desativar tradutor' : 'Libras — ativar tradutor'; });
    document.querySelectorAll('[data-a11y="voice"]').forEach(button => { button.disabled = !supportsSpeech(); button.setAttribute('aria-pressed', String(isOn(keys.voice))); button.textContent = isOn(keys.voice) ? 'Desativar leitura automática' : 'Ativar leitura automática'; });
    document.querySelectorAll('[data-a11y="read"]').forEach(button => button.disabled = !supportsSpeech());
  }
  function togglePanel(trigger) {
    const panel = document.querySelector('#accessibilityPanel');
    if (!panel) return;
    const open = !panel.classList.contains('show');
    panel.classList.toggle('show', open);
    document.querySelectorAll('[aria-controls="accessibilityPanel"]').forEach(button=>button.setAttribute('aria-expanded',String(open&&button===trigger)));
    if (open) panel.querySelector('button')?.focus();
  }
  function closePanel() {
    const panel = document.querySelector('#accessibilityPanel');
    if (!panel?.classList.contains('show')) return;
    panel.classList.remove('show');
    document.querySelectorAll('[aria-controls="accessibilityPanel"]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
  }
  function ensurePanel() {
    const panels=[...document.querySelectorAll('#accessibilityPanel')];
    let panel = panels.find(item=>item.parentElement===document.body)||panels[0];
    panels.filter(item=>item!==panel).forEach(item=>item.remove());
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'accessibilityPanel'; panel.className = 'accessibility-panel';
    }
    panel.classList.add('a11y-floating-panel');
    if(panel.parentElement!==document.body)document.body.append(panel);
    const inPortal=Boolean(document.querySelector('.app'));
    document.querySelector('.account-menu button[onclick*="toggleAccessibility"]')?.remove();
    let trigger=document.querySelector('#a11yFloatingTrigger');
    if(inPortal){trigger?.remove();}
    else if(!trigger){
      const trigger = document.createElement('button');
      trigger.type = 'button'; trigger.id = 'a11yFloatingTrigger'; trigger.className = 'a11y-floating-trigger'; trigger.setAttribute('aria-label', 'Abrir opções de acessibilidade'); trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false'); trigger.textContent = 'Acessibilidade'; document.body.append(trigger);
      trigger.addEventListener('click', () => togglePanel(trigger));
    }
    document.querySelectorAll('button[onclick*="toggleAccessibility"]').forEach(button=>{button.setAttribute('aria-controls','accessibilityPanel');if(!button.hasAttribute('aria-expanded'))button.setAttribute('aria-expanded','false');});
    bindPanel(panel); syncControls();
  }
  function ensureEvaluationMenu() {
    // A avaliação é oferecida na barra inferior e na navegação principal.
  }
  function standardizeNavigationArrows() {
    document.querySelectorAll('.chevron,.menu-arrow,.faq button span').forEach(arrow => {
      if (arrow.dataset.sharedArrow === '1') return;
      arrow.dataset.sharedArrow = '1'; arrow.textContent = '›';
      arrow.classList.add('record-chevron', 'shared-chevron'); arrow.setAttribute('aria-hidden', 'true');
    });
  }
  function visibleControlText(control) {
    const copy = control.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"],script,style').forEach(node => node.remove());
    return clean(copy.innerText || copy.textContent);
  }
  function fieldLabel(field) {
    const explicit = field.labels?.[0];
    const wrapping = field.closest('label');
    const source = explicit || wrapping;
    if (source) {
      const copy = source.cloneNode(true);
      copy.querySelectorAll('input,select,textarea,button,[aria-hidden="true"]').forEach(node => node.remove());
      const label = clean(copy.innerText || copy.textContent);
      if (label) return label.replace(/\*+$/,'').trim();
    }
    return clean(field.getAttribute('aria-label') || field.getAttribute('title') || field.placeholder || field.name?.replace(/([A-Z])/g, ' $1')) || 'Campo';
  }
  function controlName(control) {
    if (!control) return '';
    const labelledBy = control.getAttribute('aria-labelledby');
    if (labelledBy) {
      const name = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent).join(' ');
      if (clean(name)) return clean(name);
    }
    if (control.matches('input,select,textarea')) return fieldLabel(control);
    const direct = clean(control.getAttribute('aria-label') || control.getAttribute('title'));
    if (direct) return direct;
    const text = visibleControlText(control);
    if (text) return text;
    if (control.matches('.menu-toggle')) return 'Abrir menu';
    return control.matches('button') ? 'Botão sem rótulo' : 'Controle sem rótulo';
  }
  function selectedValue(field) {
    if (field.matches('select')) return clean(field.selectedOptions?.[0]?.textContent || field.value);
    if (field.matches('[type="checkbox"],[type="radio"]')) return field.checked ? 'marcado' : 'desmarcado';
    if (field.type === 'password') return field.value ? 'senha preenchida' : 'senha vazia';
    if (field.type === 'date' && field.value) {
      const date = new Date(`${field.value}T12:00:00`);
      return Number.isNaN(date.getTime()) ? field.value : date.toLocaleDateString('pt-BR');
    }
    return clean(field.value);
  }
  function calendarDescription(control) {
    const calendarBox = control.closest('#calendarBox');
    if (!calendarBox) return '';
    const month = clean(calendarBox.querySelector('h3')?.textContent);
    const selected = calendarBox.querySelector('.calendar-day.selected')?.getAttribute('aria-label');
    if (month && selected) return `Calendário de ${month}. ${selected}.`;
    return month ? `Calendário de ${month}.` : '';
  }
  let lastAutomaticText = '';
  let lastAutomaticAt = 0;
  function autoSpeak(message, delay = 0) {
    if (!isOn(keys.voice) || !message) return;
    window.setTimeout(() => {
      const now = Date.now();
      if (message === lastAutomaticText && now - lastAutomaticAt < 500) return;
      lastAutomaticText = message; lastAutomaticAt = now;
      speak(message, { silent: true });
    }, delay);
  }
  function describeControl(control, includeValue = true) {
    const calendar = calendarDescription(control);
    if (calendar) return calendar;
    const name = controlName(control);
    if (!includeValue || !control.matches('input,select,textarea')) return name;
    const value = selectedValue(control);
    return value ? `${name}: ${value}.` : name;
  }
  function formSummary(form) {
    const values = [...form.elements].filter(field => field.matches?.('input,select,textarea') && field.name && !field.disabled && field.type !== 'hidden' && field.type !== 'password')
      .map(field => {
        const value = selectedValue(field);
        return value ? `${fieldLabel(field)}: ${value}` : '';
      }).filter(Boolean);
    const title = clean(form.closest('.modal-box')?.querySelector('h2')?.textContent || form.querySelector('h2,legend')?.textContent || 'formulário');
    return `Revisão antes de confirmar ${title}. ${values.length ? values.join('. ') : 'Nenhum campo foi preenchido.'}`;
  }
  function pageIntroduction(arrival) {
    const tabs = [...document.querySelectorAll('.clinical-tabs .tab')].map(tab => controlName(tab)).filter(Boolean);
    if (!tabs.length) return arrival || document.querySelector('h1')?.textContent || document.title;
    if (arrival && !/^abrir prontuário$/i.test(arrival)) return `${arrival}. Seção do prontuário carregada.`;
    return `Prontuário. Seções disponíveis: ${tabs.join(', ')}.`;
  }
  function closeReview(review, focusTarget) {
    review?.remove();
    if (focusTarget?.isConnected) focusTarget.focus();
  }
  function openReview(form) {
    if (document.querySelector('.a11y-review')) return;
    const opener = document.activeElement;
    const summary = formSummary(form);
    const review = document.createElement('div');
    review.className = 'a11y-review'; review.setAttribute('role', 'dialog'); review.setAttribute('aria-modal', 'true'); review.setAttribute('aria-labelledby', 'a11yReviewTitle');
    const box = document.createElement('div'); box.className = 'a11y-review-box';
    const title = document.createElement('h2'); title.id = 'a11yReviewTitle'; title.textContent = 'Revisar dados antes de confirmar';
    const text = document.createElement('p'); text.textContent = summary;
    const hint = document.createElement('p'); hint.className = 'muted'; hint.textContent = 'Confira a leitura e escolha confirmar para salvar ou cancelar para continuar editando.';
    const actions = document.createElement('div'); actions.className = 'actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = 'Cancelar';
    const confirm = document.createElement('button'); confirm.type = 'button'; confirm.textContent = 'Confirmar e salvar';
    cancel.onclick = () => closeReview(review, opener);
    confirm.onclick = () => { review.remove(); form.dataset.a11yConfirming = '1'; if (form.requestSubmit) form.requestSubmit(); else form.submit(); };
    actions.append(cancel, confirm); box.append(title, text, hint, actions); review.append(box); document.body.append(review);
    confirm.focus(); speak(summary, { silent: true });
  }
  function enableAutoNarration() {
    document.addEventListener('focusin', event => {
      const control = event.target.closest?.('button,a[href],input,select,textarea,[role="button"]');
      if (control && !control.closest('.a11y-review')) autoSpeak(describeControl(control), 180);
    }, true);
    document.addEventListener('input', event => {
      const field = event.target;
      if (!field.matches?.('input,textarea') || field.type === 'password') return;
      window.clearTimeout(narrationTimer);
      narrationTimer = window.setTimeout(() => autoSpeak(describeControl(field), 0), 650);
    }, true);
    document.addEventListener('change', event => {
      const field = event.target;
      if (field.matches?.('input,select,textarea')) autoSpeak(describeControl(field), 80);
    }, true);
    document.addEventListener('click', event => {
      const control = event.target.closest?.('button,a[href],[role="button"]');
      if (!control || control.closest('#accessibilityPanel,.a11y-review')) return;
      if (control.closest('#calendarBox')) {
        window.setTimeout(() => {
          const box = document.querySelector('#calendarBox');
          const month = clean(box?.querySelector('h3')?.textContent);
          const selected = box?.querySelector('.calendar-day.selected')?.getAttribute('aria-label');
          autoSpeak(month && selected ? `Calendário de ${month}. ${selected}.` : controlName(control));
        }, 100);
        return;
      }
      const link = control.closest('a[href]');
      if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
        sessionStorage.setItem('pep_a11y_arrival', controlName(link));
        return;
      }
      autoSpeak(describeControl(control, false), 100);
    }, true);
    document.addEventListener('submit', event => {
      const form = event.target;
      if (!form.matches?.('form')) return;
      if (form.dataset.a11yConfirming === '1') { delete form.dataset.a11yConfirming; return; }
      if (!isOn(keys.voice)) return;
      event.preventDefault(); event.stopImmediatePropagation(); openReview(form);
    }, true);
    window.setTimeout(() => {
      if (!isOn(keys.voice)) return;
      const arrival = sessionStorage.getItem('pep_a11y_arrival');
      sessionStorage.removeItem('pep_a11y_arrival');
      autoSpeak(pageIntroduction(arrival));
    }, 300);
  }
  window.adjustFont = changeScale; window.resetAccessibility = reset; window.toggleNarration = toggleVoice; window.narrate = speak;
  window.toggleAccessibility = event => { event?.stopPropagation(); ensurePanel(); togglePanel(event?.currentTarget); };
  function disableLibras(){
    localStorage.removeItem(keys.libras);
    document.querySelector('#vlibrasScript')?.remove();
    document.querySelectorAll('[vw]').forEach(widget=>widget.remove());
    syncControls(); announce('Tradutor Libras desativado.');
  }
  function toggleLibras(){if(isOn(keys.libras))disableLibras();else loadLibras();}
  function loadLibras(){
    if(document.querySelector('#vlibrasScript')){localStorage.setItem(keys.libras,'1');syncControls();announce('O tradutor Libras está disponível no botão lateral.');return;}
    const script=document.createElement('script');script.id='vlibrasScript';script.src='https://vlibras.gov.br/app/vlibras-plugin.js';script.async=true;
    script.onload=()=>{localStorage.setItem(keys.libras,'1');syncControls();announce('Tradutor Libras carregado. Utilize o botão lateral para traduzir.');};
    script.onerror=()=>{script.remove();localStorage.removeItem(keys.libras);syncControls();announce('Não foi possível carregar Libras. Verifique sua conexão e tente novamente.');if(window.toast)window.toast('Libras indisponível. Verifique sua conexão e tente novamente.','error');};
    document.head.append(script);announce('Carregando tradutor Libras...');
  }
  function start() {
    if (window.__pepAccessibilityStarted) return;
    window.__pepAccessibilityStarted = true;
    let live = document.querySelector('#a11yStatus');
    if (!live) { live = document.createElement('div'); live.id = 'a11yStatus'; live.className = 'a11y-only'; live.setAttribute('aria-live', 'polite'); document.body.append(live); }
    apply(); ensurePanel(); ensureEvaluationMenu(); standardizeNavigationArrows(); enableAutoNarration();if(isOn(keys.libras))loadLibras();
    document.querySelectorAll('button[onclick*="toggleAccessibility"]').forEach(trigger => { trigger.setAttribute('aria-controls','accessibilityPanel'); trigger.setAttribute('aria-expanded','false'); });
    window.closeAccessibilityPanel = closePanel;
    window.toggleAccessibility = event => { event?.stopPropagation(); togglePanel(event?.currentTarget); };
    document.addEventListener('click', event => { if (!event.target.closest('#accessibilityPanel,[aria-controls="accessibilityPanel"]')) closePanel(); }, true);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
    if (supportsSpeech()) speechSynthesis.onvoiceschanged = syncControls;
    new MutationObserver(standardizeNavigationArrows).observe(document.body, { childList: true, subtree: true });
    const app = document.querySelector('#app');
    if (app) new MutationObserver(()=>ensurePanel()).observe(app, { childList: true });
  }
  window.addEventListener('pep-firebase-session', ensureEvaluationMenu);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
