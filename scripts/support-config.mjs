export function validateSupport(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.crypto) || value.crypto.length > 8) throw new Error('Invalid support configuration');
  if (Object.keys(value).some(key => !['url', 'crypto'].includes(key))) throw new Error('Only public support fields are allowed');
  let url = null;
  if (value.url !== null) {
    const parsed = new URL(value.url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || value.url.length > 2048 || /[\x00-\x20]/.test(value.url)) throw new Error('Support URL must be public HTTPS without credentials');
    url = parsed.href;
  }
  const patterns = {
    bitcoin: /^(?:bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    ethereum: /^0x[0-9a-fA-F]{40}$/, polygon: /^0x[0-9a-fA-F]{40}$/,
    'bnb-smart-chain': /^0x[0-9a-fA-F]{40}$/, tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  };
  const crypto = value.crypto.map(item => {
    if (item && Object.keys(item).some(key => !['asset', 'network', 'address'].includes(key))) throw new Error('Only public receiving details are allowed');
    if (!item || !/^[A-Z0-9]{2,12}$/.test(item.asset) || !patterns[item.network]?.test(item.address)) throw new Error('Invalid public receiving address, asset or supported network');
    return { asset: item.asset, network: item.network, address: item.address };
  });
  if (new Set(crypto.map(item => item.network + ':' + item.asset)).size !== crypto.length) throw new Error('Duplicate support asset/network');
  return { url, crypto };
}
