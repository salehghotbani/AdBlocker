// Generate copy/paste dashboard material; never authenticate or submit a listing.
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const publisher = await read('store/publisher.json');
const metadata = await read('store/metadata.json');
const translations = await read('localization/translations.json');
const support = await read('config/support.json');
const { version } = await read('package.json');
if (!publisher.displayName || publisher.publicSupportEmail !== null || publisher.allowPublicEmail !== false) {
  throw new Error('The approved publisher profile uses GitHub support without a public email');
}
for (const key of ['homepage','supportWebsite']) {
  const url = new URL(publisher[key]);
  if (url.origin !== 'https://github.com' || url.username || url.password || !url.pathname.startsWith('/salehghotbani/AdBlocker')) throw new Error('Unexpected public contact');
}
const permissions = {
  storage: 'Save protection, language/theme preferences and explicit site/URL exceptions locally; keep one-time tab pauses in session memory.',
  declarativeNetRequest: 'Apply bundled local ad/tracker blocking rules and explicit user exceptions through the browser.',
  activeTab: 'Read the selected page for user-invoked controls and the native per-tab blocked-request count when available.',
  webNavigation: 'Expire one-time pauses and refresh effective protection on top-level navigation and SPA route changes; no browsing history is retained.',
  hostAccess: 'HTTP/HTTPS access lets bundled rules and isolated content scripts filter websites, including changing tabs and new ad placements. A fixed small domain list cannot provide general website filtering. Processing is local, with per-site and exact-URL exceptions.'
};
const purpose = 'Block listed advertising/tracking requests and targeted ad placements locally, including selected Persian-language sites, with user-controlled exceptions.';
for (const browser of ['chrome','edge','firefox']) {
  const images = browser === 'firefox' ? metadata.firefoxScreenshots : metadata.screenshots;
  const output = {
    version, browser, publicationStatus: 'not_submitted',
    publisher, name: metadata.name, defaultLanguage: 'en',
    uploadFile: `adblocker-${browser}-store-${version}.zip`,
    sourceFile: `adblocker-reviewer-source-${version}.zip`,
    supportWebsite: publisher.supportWebsite, homepage: publisher.homepage,
    privacyPolicy: metadata.browserPrivacyUrls[browser], license: 'MIT',
    price: 'free', requiresPayment: false, financialSupportConfigured: Boolean(support.url || support.crypto?.length),
    purpose, permissionJustifications: permissions,
    remoteCode: { used: false, explanation: 'All executable code, filters, translations and fonts are bundled. Store builds make no GitHub update checks; updates are managed by the store/browser.' },
    privacy: {
      collectsOrTransmitsUserData: false,
      localProcessing: 'Page markers, native YouTube ad UI/media state and per-page counters are processed locally. Settings and chosen exception URLs stay in browser storage. No analytics, history collection or sale of data.',
      externalLinks: 'Only explicit user clicks open GitHub support/source pages; those sites receive normal connection information under their own policies.',
      dataUseCertifications: { noSale: true, noUnrelatedUse: true, noCreditOrLendingUse: true }
    },
    platforms: ['desktop'], privateBrowsing: false,
    screenshotFiles: images.map(file => `assets/${file}`),
    iconFile: `assets/${browser === 'firefox' ? 'icon-64.png' : browser === 'edge' ? 'icon-300.png' : metadata.icon}`,
    smallPromo: browser === 'firefox' ? null : `assets/${metadata.smallPromo}`,
    marqueePromo: browser === 'firefox' ? null : `assets/${metadata.marqueePromo}`,
    reviewerNotes: 'REVIEWER-NOTES.md', buildInstructions: 'BUILD.md',
    ownerActionsRequired: ['Create/sign in to the publisher account and complete its verification/security requirements.',
      'Use real account details and determine any publisher/trader disclosures in the dashboard; no legal identity is inferred by this kit.',
      'Choose the matching category/eligible markets and review the final listing before submission.'],
    publicationBlockers: browser === 'chrome' ? ['No publisher account is ready.', 'Owner does not authorize a public email. Google documents a required verified contact email displayed in extension contact information. Resolve this with the owner before submission.'] : ['No publisher account is ready.'],
    locales: {}
  };
  if (browser === 'firefox') output.firefox = { distribution: 'listed', stableId: 'adblocker@salehghotbani.local', requiredDataCollection: ['none'], sourceRequired: true, androidListing: false };
  for (const [index, language] of translations.languages.entries()) {
    const description = translations.rows.at(-1)[index], summary = translations.rows.at(-2)[index];
    if (summary.length > 132 || description.length < 250 || description.length > 10000) throw new Error('Invalid listing length: ' + language.code);
    output.locales[language.code] = { name: metadata.name, summary, description };
  }
  const text = JSON.stringify(output, null, 2) + '\n';
  const target = new URL(`store/${browser}/DASHBOARD.json`, root);
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== text) throw new Error('Stale dashboard fields: ' + browser);
  } else await writeFile(target, text);
}
console.log('PASS: three store dashboard files, ten valid listings, approved GitHub-only public contact and explicit publication blockers');
