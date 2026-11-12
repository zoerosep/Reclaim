/**
 * Demo encrypted portable export, using browser-native Web Crypto:
 * PBKDF2(SHA-256, 310k iterations) -> AES-256-GCM, random salt & nonce.
 * This is not an independently audited archival/forensic security system.
 */
const ITERATIONS = 310000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = '';
  const sliceSize = 0x8000;
  for (let i = 0; i < bytes.length; i += sliceSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + sliceSize));
  }
  return btoa(binary);
}
function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function deriveKey(password, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}
function requireCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error('Encrypted exports require a secure browser context (localhost or HTTPS).');
  }
}
function fileToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not encode a demonstration image.'));
    reader.readAsDataURL(blob);
  });
}
function dataUrlToBlob(uri) {
  if (typeof uri !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/i.test(uri)) {
    throw new Error('Import contains an unsupported image format.');
  }
  const [header, raw] = uri.split(',', 2);
  const type = header.substring(5, header.indexOf(';'));
  return new Blob([base64ToBytes(raw)], { type });
}

/** Package metadata and explicitly saved reference preview blobs only. */
export async function encryptEvidence(records, password) {
  requireCrypto();
  if (password.length < 12) throw new Error('Use a passphrase at least 12 characters long.');
  const entries = [];
  for (const { imageBlob, ...meta } of records) {
    entries.push({ ...meta, imageDataUrl: await fileToDataUrl(imageBlob) });
  }
  const payload = encoder.encode(JSON.stringify({
    format: 'reclaim-demo-evidence', version: 1, demo_only: true,
    warning: 'Fictional demonstration content only; not verified evidence.',
    exported_at: new Date().toISOString(), entries,
  }));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
  return new Blob([JSON.stringify({
    format: 'reclaim-encrypted-demo', version: 1, algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
    salt: bytesToBase64(salt), iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  }, null, 2)], { type: 'application/octet-stream' });
}

export async function decryptEvidence(file, password) {
  requireCrypto();
  if (file.size > 30 * 1024 * 1024) throw new Error('The demo import limit is 30 MB.');
  let envelope;
  try { envelope = JSON.parse(await file.text()); }
  catch { throw new Error('The selected file is not a valid Reclaim package.'); }
  if (envelope?.format !== 'reclaim-encrypted-demo' || envelope?.version !== 1 ||
      envelope?.iterations !== ITERATIONS || envelope?.algorithm !== 'AES-256-GCM') {
    throw new Error('Unsupported or invalid Reclaim package.');
  }
  let data;
  try {
    const key = await deriveKey(password, base64ToBytes(envelope.salt), envelope.iterations);
    data = JSON.parse(decoder.decode(await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext)
    )));
  } catch {
    throw new Error('Could not decrypt this package. Check the passphrase and file.');
  }
  if (data?.format !== 'reclaim-demo-evidence' || data?.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 100) {
    throw new Error('This package has an invalid evidence manifest.');
  }
  return data.entries.map(({ imageDataUrl, ...meta }) => {
    if (!meta.id || !meta.demoOnly || !meta.referenceFileName) throw new Error('Invalid demonstration evidence record.');
    return { ...meta, imageBlob: dataUrlToBlob(imageDataUrl) };
  });
}

export function downloadBlob(blob, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
