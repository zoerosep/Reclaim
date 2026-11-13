/**
 * Records a person adds by hand: where they saw something, the web address,
 * the date and their own notes. No image is stored for these records.
 *
 * Everything here is plain text typed by the person. Nothing is sent anywhere.
 */
import { PLATFORMS, isPlatform } from './reportingPlatforms.js';

export const OTHER_SITE = 'other';
export const MANUAL_LIMITS = { url: 2000, notes: 1500, siteName: 80 };

const REPORT_STATUSES = ['not_started', 'prepared', 'submitted', 'removed', 'rejected'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const isManualRecord = record => record?.recordType === 'manual';

/**
 * Tidy a typed web address. Returns '' when nothing was typed.
 * Only ordinary http and https addresses are accepted.
 */
export function cleanUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > MANUAL_LIMITS.url) throw new Error('That web address is too long to save.');
  if (/\s/.test(text)) throw new Error('A web address cannot contain spaces. Check it and try again.');
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let parsed;
  try { parsed = new URL(withScheme); }
  catch { throw new Error('That does not look like a web address. It should look like https://example.com/page'); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only web addresses that start with https:// or http:// can be saved.');
  }
  if (!parsed.hostname.includes('.')) {
    throw new Error('That does not look like a web address. It should look like https://example.com/page');
  }
  return parsed.href;
}

function cleanDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (!DATE_ONLY.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new Error('Choose a valid date, or leave the date empty.');
  }
  return text;
}

function sourceName(site, siteName) {
  if (isPlatform(site)) return PLATFORMS[site].name;
  return String(siteName ?? '').trim().slice(0, MANUAL_LIMITS.siteName) || 'Another website or app';
}

/** Build a vault record from the "add by hand" form. Throws a readable Error if it cannot be saved. */
export function buildManualRecord({ site, siteName, url, seenOn, notes }, { id, now }) {
  if (!isPlatform(site) && site !== OTHER_SITE) throw new Error('Choose where you found it.');
  const sourceUrl = cleanUrl(url);
  const cleanNotes = String(notes ?? '').trim().slice(0, MANUAL_LIMITS.notes);
  if (!sourceUrl && !cleanNotes) throw new Error('Add a web address or a note, so there is something to save.');
  const sourcePlatform = sourceName(site, siteName);
  return {
    id, recordType: 'manual', demoOnly: false, sourceIsFictional: false,
    discoveredAt: now, sourcePublishedAt: null, seenOn: cleanDate(seenOn),
    sourceKind: 'manual', reportPlatform: isPlatform(site) ? site : null,
    sourcePlatform, sourceUrl: sourceUrl || null,
    // Shown as the record's title in the vault.
    referenceFileName: `${sourcePlatform}: added by hand`,
    referenceId: null, referenceLabel: null, referenceSha256: null, referenceKind: null,
    matchingMethods: [], phashDistance: null, phashTier: null, embeddingCosine: null, exact: false,
    reviewStatus: 'added_by_hand', reportStatus: 'not_started', reportStatusUpdatedAt: null,
    queryDescription: null, notes: cleanNotes,
    imageBlob: null, // By design: hand-added records never hold an image.
  };
}

/**
 * Rebuild a hand-added record that came out of a backup file, keeping only the
 * fields this app understands. Throws if the record is not usable.
 */
export function restoreManualRecord(meta) {
  const invalid = new Error('This backup contains a hand-added record that cannot be read.');
  if (!meta || typeof meta.id !== 'string' || !meta.id || meta.id.length > 100) throw invalid;
  const savedAt = typeof meta.discoveredAt === 'string' ? Date.parse(meta.discoveredAt) : NaN;
  if (Number.isNaN(savedAt)) throw invalid;
  const site = isPlatform(meta.reportPlatform) ? meta.reportPlatform : OTHER_SITE;
  let record;
  try {
    record = buildManualRecord({
      site, siteName: typeof meta.sourcePlatform === 'string' ? meta.sourcePlatform : '',
      url: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : '',
      seenOn: typeof meta.seenOn === 'string' ? meta.seenOn : '',
      notes: typeof meta.notes === 'string' ? meta.notes : '',
    }, { id: meta.id, now: new Date(savedAt).toISOString() });
  } catch { throw invalid; }
  if (REPORT_STATUSES.includes(meta.reportStatus)) record.reportStatus = meta.reportStatus;
  const updatedAt = typeof meta.reportStatusUpdatedAt === 'string' ? Date.parse(meta.reportStatusUpdatedAt) : NaN;
  record.reportStatusUpdatedAt = Number.isNaN(updatedAt) ? null : new Date(updatedAt).toISOString();
  return record;
}

/** Plain-text summary the person can paste into a platform's own report form. */
export function manualSummary(record) {
  return [
    'My record (kept in Reclaim)',
    `Where: ${record.sourcePlatform}`,
    `Web address: ${record.sourceUrl || 'Not recorded'}`,
    `Date I saw it: ${record.seenOn || 'Not recorded'}`,
    `Saved in Reclaim: ${record.discoveredAt}`,
    record.notes ? `Notes: ${record.notes}` : '',
  ].filter(Boolean).join('\n');
}
