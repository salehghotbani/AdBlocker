(async () => {
  'use strict';
  const t = (text, values) => globalThis.AdBlockI18n?.t(text, values) || text;
  await AdBlockI18n.initialize();
  const support = globalThis.AdBlockDistribution?.support;
  const names = { bitcoin: 'Bitcoin', ethereum: 'Ethereum (ERC-20)', tron: 'TRON (TRC-20)',
    solana: 'Solana', polygon: 'Polygon', 'bnb-smart-chain': 'BNB Smart Chain (BEP-20)' };
  function render() {
  document.getElementById('copyStatus').textContent = '';
  document.getElementById('cryptoAddresses').replaceChildren();
  document.getElementById('cryptoNotice').hidden = true;
  let configured = false;
  if (support?.url) {
    try {
      const url = new URL(support.url);
      if (url.protocol === 'https:' && !url.username && !url.password) {
        const link = document.getElementById('supportPayment'); link.href = url.href; link.hidden = false; configured = true;
      }
    } catch { /* Invalid links are never made clickable. */ }
  }
  for (const item of support?.crypto || []) {
    if (!names[item.network] || !/^[A-Z0-9]{2,12}$/.test(item.asset) || !/^[a-zA-Z0-9]{26,100}$/.test(item.address)) continue;
    const card = document.createElement('div'); card.className = 'crypto-card';
    const label = document.createElement('label'); label.textContent = t('{asset} • {network} only', { asset: item.asset, network: names[item.network] });
    const input = document.createElement('input'); input.readOnly = true; input.value = item.address;
    input.setAttribute('aria-label', t('{asset} receiving address on {network}', { asset: item.asset, network: names[item.network] }));
    const button = document.createElement('button'); button.type = 'button'; button.textContent = t('Copy receiving address');
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(item.address); document.getElementById('copyStatus').textContent = t('Address copied. Verify the asset, network and entire address before sending.'); }
      catch { input.focus(); input.select(); document.getElementById('copyStatus').textContent = t('Select and copy the address manually. Verify the asset and network before sending.'); }
    });
    card.append(label, input, button); document.getElementById('cryptoAddresses').append(card);
    document.getElementById('cryptoNotice').hidden = false; configured = true;
  }
  document.getElementById('financial').hidden = !configured;
  document.getElementById('notConfigured').hidden = configured;
  }
  render();
  addEventListener('adblock-language-changed', render);
})();
