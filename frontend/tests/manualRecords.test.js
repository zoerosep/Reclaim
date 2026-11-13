import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildManualRecord, cleanUrl, manualSummary, restoreManualRecord } from '../src/lib/manualRecords.js';
import { platformForRecord } from '../src/lib/reportingPlatforms.js';
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

const stamp = { id: 'manual-001', now: '2026-11-12T12:00:00.000Z' };
// Runs without npm install: node --test frontend/tests/*.test.js

test('a hand-added record keeps the address and notes and never holds an image', () => {
  const record = buildManualRecord({
    site: 'x', url: 'example.invalid/x/status/1', seenOn: '2026-11-10', notes: '  posted by a made-up account  ',
  }, stamp);
  assert.equal(record.recordType, 'manual');
  assert.equal(record.imageBlob, null);
  assert.equal(record.sourceUrl, 'https://example.invalid/x/status/1');
  assert.equal(record.sourcePlatform, 'X');
  assert.equal(record.notes, 'posted by a made-up account');
  assert.equal(record.sourceIsFictional, false);
  assert.equal(platformForRecord(record), 'x');
  assert.match(manualSummary(record), /Web address: https:\/\/example\.invalid\/x\/status\/1/);
});

test('notes alone are enough, and another website has no platform guide', () => {
  const record = buildManualRecord({ site: 'other', siteName: 'Some forum', notes: 'seen in a thread' }, stamp);
  assert.equal(record.sourceUrl, null);
  assert.equal(record.sourcePlatform, 'Some forum');
  assert.equal(platformForRecord(record), null);
});

test('an empty form, an unknown site or a bad date is refused', () => {
  assert.throws(() => buildManualRecord({ site: 'x' }, stamp), /web address or a note/);
  assert.throws(() => buildManualRecord({ site: '', notes: 'n' }, stamp), /Choose where/);
  assert.throws(() => buildManualRecord({ site: 'x', notes: 'n', seenOn: 'yesterday' }, stamp), /valid date/);
});

test('only ordinary web addresses are accepted', () => {
  assert.equal(cleanUrl(''), '');
  assert.equal(cleanUrl(' HTTPS://Example.invalid/a?b=1 '), 'https://example.invalid/a?b=1');
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'not a link', 'localhost']) {
    assert.throws(() => cleanUrl(bad), Error, bad);
  }
});

test('the protected backup carries hand-added records alongside image records', async () => {
  const manual = buildManualRecord({ site: 'reddit', url: 'https://example.invalid/r/demo', notes: 'line one\nline two' }, stamp);
  const withImage = {
    id: 'image-001', demoOnly: true, referenceFileName: 'garden-original.png', discoveredAt: '2026-11-11T12:00:00Z',
    matchingMethods: ['sha256'], imageBlob: new Blob([Buffer.from('harmless-demo')], { type: 'image/png' }),
  };
  const packageBlob = await encryptEvidence([manual, withImage], 'a-long-demo-passphrase');
  assert.ok(!(await packageBlob.text()).includes('example.invalid'), 'the address must not be readable in the backup file');
  const restored = await decryptEvidence(packageBlob, 'a-long-demo-passphrase');
  assert.equal(restored.length, 2);
  assert.deepEqual(restored[0], manual);
  assert.equal(restored[1].imageBlob.type, 'image/png');
});

test('a tampered hand-added record in a backup is cleaned or refused', () => {
  const restored = restoreManualRecord({
    id: 'm1', recordType: 'manual', discoveredAt: '2026-11-12T12:00:00Z', reportPlatform: 'snapchat',
    sourceUrl: 'https://example.invalid/s', notes: 'ok', reportStatus: 'made-up', imageDataUrl: 'data:image/png;base64,AAAA', extra: 'x',
  });
  assert.equal(restored.reportStatus, 'not_started');
  assert.equal(restored.imageBlob, null);
  assert.equal('extra' in restored, false);
  assert.throws(() => restoreManualRecord({ id: 'm2', recordType: 'manual', discoveredAt: '2026-11-12T12:00:00Z', sourceUrl: 'javascript:alert(1)' }), /cannot be read/);
  assert.throws(() => restoreManualRecord({ recordType: 'manual' }), /cannot be read/);
});
