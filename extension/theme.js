(() => {
  'use strict';
  const api = globalThis.browser || chrome;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let explicit = false;
  let saving = false;
  const valid = value => value === 'light' || value === 'dark';
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    }
  }
  apply(system.matches ? 'dark' : 'light');
  const ready = api.storage.local.get('theme').then(({ theme }) => {
    explicit = valid(theme);
    apply(explicit ? theme : system.matches ? 'dark' : 'light');
  }).catch(() => {});
  system.addEventListener('change', () => {
    if (!explicit) apply(system.matches ? 'dark' : 'light');
  });
  document.addEventListener('DOMContentLoaded', async () => {
    await ready;
    apply(document.documentElement.dataset.theme);
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.disabled = false;
      button.addEventListener('click', async () => {
        if (saving) return;
        saving = true;
        const previous = document.documentElement.dataset.theme;
        const wasExplicit = explicit;
        explicit = true;
        const theme = button.dataset.themeChoice;
        apply(theme);
        try {
          await api.storage.local.set({ theme });
          document.getElementById('themeStatus').textContent = theme === 'dark' ? 'Dark theme saved.' : 'Light theme saved.';
        } catch {
          explicit = wasExplicit;
          apply(previous);
          document.getElementById('message').textContent = 'Could not save the theme. Try again.';
        } finally { saving = false; }
      });
    }
  });
})();
