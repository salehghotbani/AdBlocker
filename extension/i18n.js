(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const { languages, dictionaries } = AdBlockLocales;
  let language = 'en', initialized;
  const textNodes = new Map(), attributes = [];
  const valid = value => languages.some(item => item.code === value);
  function t(source, values = {}) {
    return (Object.hasOwn(dictionaries[language], source) ? dictionaries[language][source] : source).replace(/\{([a-z]+)\}/g, (match, key) => Object.hasOwn(values, key) ? String(values[key]) : match);
  }
  function apply(value) {
    language = valid(value) ? value : 'en';
    const info = languages.find(item => item.code === language);
    document.documentElement.lang = language; document.documentElement.dir = info.dir;
    document.documentElement.dataset.language = language;
    for (const [node, source] of textNodes) if (node.isConnected) node.nodeValue = t(source);
    for (const { element, name, source } of attributes) element.setAttribute(name, t(source));
    for (const select of document.querySelectorAll('[data-language-picker]')) select.value = language;
    dispatchEvent(new CustomEvent('adblock-language-changed'));
  }
  function initialize() {
    if (initialized) return initialized;
    initialized = (async () => {
      const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode, source = node.nodeValue.trim();
        if (!node.parentElement.closest('script,style,select') && Object.hasOwn(dictionaries.en, source)) textNodes.set(node, source);
      }
      for (const element of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
        for (const name of ['aria-label', 'title', 'placeholder']) {
          const source = element.getAttribute(name);
          if (Object.hasOwn(dictionaries.en, source)) attributes.push({ element, name, source });
        }
      }
      for (const select of document.querySelectorAll('[data-language-picker]')) {
        for (const item of languages) {
          const option = document.createElement('option'); option.value = item.code; option.textContent = item.name; option.lang = item.code; select.append(option);
        }
        select.addEventListener('change', async () => {
          const next = select.value, previous = language; select.disabled = true;
          try { if (!valid(next)) throw new Error('Invalid language'); await api?.storage?.local?.set({ language: next }); apply(next); }
          catch { apply(previous); const status = document.getElementById('message') || document.getElementById('copyStatus'); if (status) status.textContent = t('Could not save the language. Try again.'); }
          finally { select.disabled = false; }
        });
      }
      let saved; try { saved = (await api?.storage?.local?.get('language'))?.language; } catch { /* English remains the default. */ }
      apply(saved);
      if (api?.storage?.onChanged?.addListener) api.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.language && changes.language.newValue !== language) apply(changes.language.newValue);
      });
    })();
    return initialized;
  }
  globalThis.AdBlockI18n = Object.freeze({ initialize, t, get language() { return language; },
    number: value => value.toLocaleString(language === 'en' ? 'en-US' : language),
    date: value => new Date(value).toLocaleString(language === 'en' ? 'en-US' : language) });
})();
