(() => {
  'use strict';
  const root = document.documentElement;
  const shell = document.querySelector('.wiki-shell');
  const main = document.querySelector('.wiki-main');
  const sections = [...document.querySelectorAll('section[data-search-title]')];
  const topics = sections.map(section => ({ id: section.id, title: section.querySelector('h2').childNodes[0].textContent.trim(), content: section.textContent.replace(/\s+/g, ' ').trim() }));
  const preferences = { fontSize: 'standard', width: 'standard', theme: 'light' };
  const allowed = { fontSize: ['small', 'standard', 'large'], width: ['standard', 'wide'], theme: ['auto', 'light', 'dark'] };
  const names = { 'font-size': 'fontSize', 'content-width': 'width', theme: 'theme' };
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const mobile = window.matchMedia('(max-width: 760px)');
  let currentIndex = 0;
  try {
    const saved = JSON.parse(localStorage.getItem('unknown-wiki-appearance') || '{}');
    for (const key of Object.keys(preferences)) if (allowed[key].includes(saved[key])) preferences[key] = saved[key];
  } catch (_) { /* Storage is optional for local files. */ }
  function applyPreferences() {
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.width = preferences.width;
    root.dataset.theme = preferences.theme === 'auto' ? (colorScheme.matches ? 'dark' : 'light') : preferences.theme;
    for (const [name, key] of Object.entries(names)) document.querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = input.value === preferences[key]; });
  }
  applyPreferences();
  document.querySelectorAll('.appearance input[type="radio"]').forEach(input => input.addEventListener('change', () => {
    if (!input.checked || !names[input.name]) return;
    preferences[names[input.name]] = input.value;
    applyPreferences();
    try { localStorage.setItem('unknown-wiki-appearance', JSON.stringify(preferences)); } catch (_) { /* Optional persistence. */ }
  }));
  colorScheme.addEventListener('change', applyPreferences);
  const appearance = document.querySelector('#appearance');
  const appearanceButton = document.querySelector('#appearance-toggle');
  appearanceButton.addEventListener('click', () => {
    const open = appearance.classList.toggle('is-open');
    appearanceButton.setAttribute('aria-expanded', String(open));
  });
  document.querySelector('#appearance-collapse').addEventListener('click', () => {
    appearance.classList.remove('is-open');
    appearanceButton.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('click', event => {
    if (!appearance.contains(event.target) && !appearanceButton.contains(event.target)) {
      appearance.classList.remove('is-open');
      appearanceButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelectorAll('[data-print]').forEach(button => button.addEventListener('click', () => window.print()));
  const contentsToggle = document.querySelector('#contents-toggle');
  function syncContents() {
    contentsToggle.setAttribute('aria-expanded', String(mobile.matches ? shell.classList.contains('mobile-contents-open') : !shell.classList.contains('contents-hidden')));
  }
  contentsToggle.addEventListener('click', () => {
    shell.classList.toggle(mobile.matches ? 'mobile-contents-open' : 'contents-hidden');
    syncContents();
  });
  mobile.addEventListener('change', syncContents);
  syncContents();

  function renderTopic() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch (_) { hash = ''; }
    if (hash === 'document') { main.focus({ preventScroll: true }); return; }
    const target = document.getElementById(hash);
    const section = target?.matches('section[data-search-title]') ? target : target?.closest('section[data-search-title]');
    currentIndex = Math.max(0, sections.indexOf(section));
    sections.forEach((item, i) => { item.hidden = i !== currentIndex; });
    const current = topics[currentIndex];
    document.querySelector('#topic-ribbon').textContent = current.title;
    document.title = `${current.title} - 알수없는 문서`;
    document.querySelectorAll('.tree-folder').forEach(folder => {
      if (folder.dataset.topic === current.id) folder.open = true;
    });
    document.querySelectorAll('.topic-tree a, #alphabetical-index a').forEach(link => {
      const selectable = !link.closest('summary');
      const active = selectable && link.hash === `#${hash.includes('-part-') ? hash : current.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    const first = currentIndex === 0;
    const last = currentIndex === sections.length - 1;
    document.querySelectorAll('[data-previous]').forEach(button => { button.disabled = first; });
    document.querySelectorAll('[data-next]').forEach(button => { button.disabled = last; });
    document.querySelector('#previous-label').textContent = first ? '서고의 첫 글' : `이전 글: ${topics[currentIndex - 1].title}`;
    document.querySelector('#next-label').textContent = last ? '서고의 마지막 글' : `다음 글: ${topics[currentIndex + 1].title}`;
    // Reference-page introductions belong to its first topic.
    document.querySelectorAll('.article-body > p').forEach(p => { p.hidden = currentIndex !== 0; });
    main.scrollTop = 0;
    if (section && target !== section) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    shell.classList.remove('mobile-contents-open');
    syncContents();
  }
  window.addEventListener('hashchange', renderTopic);
  document.querySelectorAll('[data-previous]').forEach(button => button.addEventListener('click', () => { if (currentIndex > 0) location.hash = topics[currentIndex - 1].id; }));
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => { if (currentIndex < topics.length - 1) location.hash = topics[currentIndex + 1].id; }));
  document.querySelector('.topic-tree').addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    event.stopPropagation();
    if (link.hash === location.hash) renderTopic();
  });
  document.querySelector('#topic-count').textContent = `${topics.length}개 항목 · 로컬 문헌 보관소`;
  const index = document.querySelector('#alphabetical-index');
  topics.slice().sort((a, b) => a.title.localeCompare(b.title, 'ko')).forEach(topic => {
    const link = document.createElement('a');
    link.href = `#${topic.id}`;
    link.textContent = topic.title;
    index.append(link);
  });
  const tabs = [...document.querySelectorAll('[data-panel]')];
  function selectPanel(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.querySelector(`#panel-${item.dataset.panel}`).hidden = !selected;
    });
    if (tab.dataset.panel === 'search') document.querySelector('#site-search').focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectPanel(tab));
    tab.addEventListener('keydown', event => {
      const at = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (at < 0) return;
      event.preventDefault();
      selectPanel(tabs[at]);
      tabs[at].focus();
    });
  });
  const dialog = document.querySelector('#search-dialog');
  const searchInput = document.querySelector('#search-input');
  const sidebarInput = document.querySelector('#site-search');
  function search(query, list, status, modal) {
    const term = query.trim().toLocaleLowerCase('ko');
    list.replaceChildren();
    if (!term) { status.textContent = '제목과 본문에서 검색합니다.'; return; }
    const matches = topics.filter(topic => `${topic.title} ${topic.content}`.toLocaleLowerCase('ko').includes(term));
    status.textContent = matches.length ? `${matches.length}개 항목을 찾았습니다.` : '일치하는 기록이 없습니다.';
    matches.forEach(topic => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      const snippet = document.createElement('small');
      link.href = `#${topic.id}`;
      link.textContent = topic.title;
      const at = topic.content.toLocaleLowerCase('ko').indexOf(term);
      const start = Math.max(0, at - 15);
      snippet.textContent = `${start > 0 ? '…' : ''}${topic.content.slice(start, start + 80)}…`;
      link.append(snippet);
      link.addEventListener('click', () => {
        if (modal) dialog.close();
        if (link.hash === location.hash) renderTopic();
        requestAnimationFrame(() => {
          const section = sections[topics.indexOf(topic)];
          section.setAttribute('tabindex', '-1');
          section.focus({ preventScroll: true });
        });
      });
      li.append(link);
      list.append(li);
    });
  }
  const sidebarSearch = () => search(sidebarInput.value, document.querySelector('#sidebar-search-results'), document.querySelector('#sidebar-search-status'), false);
  sidebarInput.addEventListener('input', sidebarSearch);
  document.querySelector('#header-search').addEventListener('submit', event => { event.preventDefault(); sidebarSearch(); });
  const modalSearch = () => search(searchInput.value, document.querySelector('#search-results'), document.querySelector('#search-status'), true);
  searchInput.addEventListener('input', modalSearch);
  document.querySelector('#close-search').addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      appearance.classList.remove('is-open');
      appearanceButton.setAttribute('aria-expanded', 'false');
      shell.classList.remove('mobile-contents-open');
      syncContents();
    }
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || dialog.open || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    event.preventDefault();
    dialog.showModal();
    searchInput.focus();
    modalSearch();
  });
  const reopen = document.querySelector('#reopen-help');
  document.querySelectorAll('[data-window]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.window === 'minimize') {
      const minimized = shell.classList.toggle('is-minimized');
      button.setAttribute('aria-label', minimized ? '창 복원' : '창 최소화');
      button.title = minimized ? '복원' : '최소화';
    }
    if (button.dataset.window === 'maximize') {
      shell.classList.remove('is-minimized');
      document.querySelector('[data-window="minimize"]').setAttribute('aria-label', '창 최소화');
      document.querySelector('[data-window="minimize"]').title = '최소화';
      const maximized = shell.classList.toggle('is-maximized');
      button.setAttribute('aria-label', maximized ? '창 크기 복원' : '창 최대화');
      button.title = maximized ? '복원' : '최대화';
    }
    if (button.dataset.window === 'close') { shell.hidden = true; reopen.hidden = false; reopen.focus(); }
  }));
  reopen.addEventListener('click', () => { shell.hidden = false; reopen.hidden = true; shell.classList.remove('is-minimized'); document.querySelector('[data-window="minimize"]').setAttribute('aria-label', '창 최소화'); document.querySelector('[data-window="minimize"]').title = '최소화'; contentsToggle.focus(); });
  renderTopic();
})();
