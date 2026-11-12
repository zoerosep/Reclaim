import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptEvidence, decryptEvidence } from '../src/lib/secureExport.js';

// Browser FileReader substitute for Node's native Blob in this isolated unit test.
class TestFileReader {
  async readAsDataURL(blob) {
    const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    this.result = `data:${blob.type};base64,${base64}`;
    this.onload?.();
  }
}
globalThis.FileReader = TestFileReader;

const example = {
  id: 'test-001', demoOnly: true, referenceFileName: 'garden-original.png',
  discoveredAt: '2026-11-11T12:00:00Z', sourcePlatform: 'Reddit (fictional)',
  sourceIsFictional: true, matchingMethods: ['sha256', 'phash'],
  imageBlob: new Blob([Buffer.from('harmless-demo')], { type: 'image/png' }),
};

// Runs without npm install: node --test frontend/tests/*.test.js

test('password-protected export restores metadata and explicitly saved demo blob', async () => {
  const packageBlob = await encryptEvidence([example], 'a-long-demo-passphrase');
  const envelope = JSON.parse(await packageBlob.text());
  assert.equal(envelope.algorithm, 'AES-256-GCM');
  assert.ok(!JSON.stringify(envelope).includes('garden-original.png'));
  const records = await decryptEvidence(packageBlob, 'a-long-demo-passphrase');
  assert.equal(records.length, 1);
  assert.equal(records[0].referenceFileName, 'garden-original.png');
  assert.equal(await records[0].imageBlob.text(), 'harmless-demo');
});

test('wrong password fails to decrypt', async () => {
  const packageBlob = await encryptEvidence([example], 'a-long-demo-passphrase');
  await assert.rejects(() => decryptEvidence(packageBlob, 'not-the-right-password'), /Could not decrypt/);
});

test('passphrases shorter than twelve characters fail', async () => {
  await assert.rejects(() => encryptEvidence([example], 'short'), /at least 12/);
});
