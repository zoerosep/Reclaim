import { useEffect, useRef, useState } from 'react';
import { allEvidence, saveEvidence, deleteEvidence, replaceEvidence, clearEvidence } from './lib/evidenceVault';
import { decryptEvidence, downloadBlob, encryptEvidence } from './lib/secureExport';

// NEVER a real Reddit finding. This is a deliberately non-existent demonstration URL.
const FAKE_REDDIT_URL = 'https://www.reddit.com/r/RECLAIM_DEMO/comments/000000/fictional_post/';
// Verified Reddit U.S. Take It Down Act form and general NCII reporting guide.
const REDDIT_TIDA = 'https://support.reddithelp.com/hc/en-us/requests/new?ticket_form_id=19623931614484';
const REDDIT_RULES_GUIDE = 'https://support.reddithelp.com/hc/en-us/articles/360043513951-What-should-I-do-if-someone-has-shared-or-threatened-to-share-intimate-images-of-me-or-somebody-I-know';
const REDDIT_TIDA_GUIDE = 'https://support.reddithelp.com/hc/en-us/articles/49223517214996-U-S-Take-It-Down-Act-Information-for-people-in-the-U-S';

const DATE_OPTIONS = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
const formatDate = date => date ? new Date(date).toLocaleString(undefined, DATE_OPTIONS) : 'Not recorded';
const statuses = [
  ['not_started', 'Not reported'],
  ['prepared', 'Request prepared'],
  ['submitted', 'I submitted a report'],
  ['removed', 'I confirmed removal'],
  ['rejected', 'Request rejected'],
];

function RecordPreview({ imageBlob, fileName }) {
  const [show, setShow] = useState(false);
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!show || !imageBlob) return undefined;
    const url = URL.createObjectURL(imageBlob);
    setSrc(url);
    return () => { URL.revokeObjectURL(url); setSrc(''); };
  }, [imageBlob, show]);
  return <div className="vault-preview">
    <button type="button" className="quiet-button" onClick={() => setShow(v => !v)}>{show ? 'Hide preview' : 'Reveal preview'}</button>
    {show && src && <img alt={`Harmless demo matched image: ${fileName}`} src={src} />}
  </div>;
}

function reportDraft(record) {
  return [
    'RECLAIM DEMONSTRATION — NOT A REAL REPORT',
    'Site: Reddit (fictional demonstration)',
    `Illustrative content URL (not real): ${record.sourceUrl}`,
    `Local evidence ID: ${record.id}`,
    `Recorded: ${record.discoveredAt}`,
    `Saved demo reference file: ${record.referenceFileName}`,
    `Match methods: ${record.matchingMethods.join(', ')}`,
    record.phashDistance !== null ? `pHash distance: ${record.phashDistance} / 64` : '',
    '',
    'Real submissions require the genuine direct URL and accurate facts.',
    'Reddit’s U.S. legal notice form also requires contact email and full legal signature.',
    'This sample is for product demonstration only. Do not submit it to Reddit.',
  ].filter(Boolean).join('\n');
}

export default function EvidenceWorkspace({ selectedResult, queryLabel, clearSelection }) {
  const [records, setRecords] = useState([]);
  const [sourceType, setSourceType] = useState('local');
  const [notes, setNotes] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [reportId, setReportId] = useState(null);
  const importPicker = useRef(null);

  async function refresh() {
    const values = await allEvidence();
    setRecords(values.sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt)));
  }
  useEffect(() => { refresh().catch(err => setVaultError(err.message)); }, []);
  useEffect(() => { setNotes(''); setSourceType('local'); setVaultError(''); }, [selectedResult?.id]);

  async function saveSelected() {
    if (!selectedResult || busy) return;
    setVaultError(''); setNotice(''); setBusy(true);
    try {
      // Intentionally allow ONLY the bundled, safe demo reference images.
      if (!/^\/samples\/[a-z0-9.-]+\.(png|jpe?g|webp)$/i.test(selectedResult.demo_url)) {
        throw new Error('Only the bundled safe demonstration references can be saved.');
      }
      const response = await fetch(selectedResult.demo_url, { cache: 'no-store' });
      if (!response.ok) throw new Error('The selected demo reference image could not be loaded.');
      const imageBlob = await response.blob();
      if (!imageBlob.type.startsWith('image/') || imageBlob.size > 8 * 1024 * 1024) {
        throw new Error('Invalid demo reference image.');
      }
      // Integrity hash of the explicitly saved reference preview, not of the original search upload.
      const digest = await crypto.subtle.digest('SHA-256', await imageBlob.arrayBuffer());
      const referenceSha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      await saveEvidence({
        id: crypto.randomUUID(), demoOnly: true, sourceIsFictional: sourceType === 'reddit',
        discoveredAt: new Date().toISOString(), sourcePublishedAt: null,
        sourcePlatform: sourceType === 'reddit' ? 'Reddit (fictional)' : 'Local sample catalog',
        sourceUrl: sourceType === 'reddit' ? FAKE_REDDIT_URL : null,
        referenceId: selectedResult.id, referenceLabel: selectedResult.label,
        referenceFileName: selectedResult.file_name || selectedResult.demo_url.split('/').pop(),
        referenceSha256,
        referenceKind: selectedResult.kind,
        matchingMethods: selectedResult.matching_methods,
        phashDistance: selectedResult.phash_distance,
        phashTier: selectedResult.phash_tier,
        embeddingCosine: selectedResult.openclip_cosine,
        exact: selectedResult.exact,
        reviewStatus: 'unverified_candidate',
        reportStatus: 'not_started', reportStatusUpdatedAt: null,
        queryDescription: queryLabel, notes: notes.trim(),
        imageBlob, // Only the explicitly selected demo reference image, NOT the source query.
      });
      await refresh();
      clearSelection();
      setNotice(sourceType === 'reddit'
        ? 'Demo image saved with a FICTIONAL Reddit source. This is NOT a discovery on Reddit.'
        : 'Demo reference image and match details saved locally in this browser.');
    } catch (err) { setVaultError(err.message); }
    finally { setBusy(false); }
  }

  async function removeRecord(record) {
    if (!window.confirm(`Delete the local demo record “${record.referenceFileName}”?`)) return;
    setVaultError('');
    try { await deleteEvidence(record.id); await refresh(); if (reportId === record.id) setReportId(null); }
    catch (err) { setVaultError(err.message); }
  }

  async function changeStatus(record, value) {
    try {
      await saveEvidence({ ...record, reportStatus: value, reportStatusUpdatedAt: new Date().toISOString() });
      await refresh();
    } catch (err) { setVaultError(err.message); }
  }

  async function exportVault() {
    setVaultError(''); setNotice('');
    if (!records.length) { setVaultError('There are no saved demonstration records to export.'); return; }
    if (password !== confirmPassword) { setVaultError('The two export passphrases do not match.'); return; }
    setBusy(true);
    try {
      const blob = await encryptEvidence(records, password);
      downloadBlob(blob, `reclaim-DEMO-evidence-${new Date().toISOString().slice(0, 10)}.reclaim`);
      setPassword(''); setConfirmPassword('');
      setNotice('Encrypted demo package downloaded. Keep your passphrase safe; it cannot be recovered.');
    } catch (err) { setVaultError(err.message); }
    finally { setBusy(false); }
  }

  async function importVault() {
    setVaultError(''); setNotice('');
    if (!importFile) { setVaultError('Choose a .reclaim demo backup to import.'); return; }
    setBusy(true);
    try {
      const restored = await decryptEvidence(importFile, importPassword);
      if (!window.confirm(`Replace ${records.length} current demo records with ${restored.length} imported demo records?`)) return;
      await replaceEvidence(restored);
      await refresh();
      setImportFile(null); setImportPassword('');
      if (importPicker.current) importPicker.current.value = '';
      setReportId(null);
      setNotice('The encrypted demo evidence package was restored into this browser.');
    } catch (err) { setVaultError(err.message); }
    finally { setBusy(false); }
  }

  async function clearVault() {
    if (!window.confirm('Delete ALL locally saved Reclaim demonstration evidence in this browser? This cannot be undone without an exported backup.')) return;
    try { await clearEvidence(); setReportId(null); await refresh(); setNotice('The local demo vault was cleared.'); }
    catch (err) { setVaultError(err.message); }
  }

  async function copyDraft(record) {
    try { await navigator.clipboard.writeText(reportDraft(record)); setNotice('Fictional example report summary copied. Do not submit the sample to Reddit.'); }
    catch { setVaultError('Clipboard access was blocked by this browser.'); }
  }

  const reportRecord = records.find(item => item.id === reportId) || null;
  return <div id="evidence-workspace" className="evidence-workspace">
    <section className="panel vault-panel">
      <div className="panel-head"><span className="step">03</span><div><h2>Saved evidence</h2><p>Keep the matches you choose. Previews stay hidden until you open them.</p></div></div>
      <p className="vault-warning"><strong>Demo safety note:</strong> Saved items are not encrypted in this browser. Only use sample images. A possible match is not proof of distribution.</p>
      {selectedResult && <div className="save-panel">
        <div className="save-head"><div><span className="section-kicker purple">SELECTED IMAGE</span><h3>{selectedResult.label}</h3><p>File: {selectedResult.file_name || selectedResult.demo_url.split('/').pop()} • {selectedResult.matching_methods.join(' + ')} {selectedResult.phash_distance != null ? `• pHash ${selectedResult.phash_distance}/64` : ''}</p></div><button className="quiet-button" onClick={clearSelection}>Cancel</button></div>
        <label className="field-label" htmlFor="source-type">Where was this found? (demo)</label>
        <select id="source-type" value={sourceType} onChange={event => setSourceType(event.target.value)}>
          <option value="local">Sample image collection</option>
          <option value="reddit">Fictional Reddit example</option>
        </select>
        {sourceType === 'reddit' && <p className="fiction-warning">SIMULATED: “Found match on Reddit” is a made-up scenario. The URL is intentionally fictitious. No search of Reddit has occurred.</p>}
        <label className="field-label" htmlFor="evidence-notes">Notes for your record (optional)</label>
        <textarea id="evidence-notes" maxLength={1500} value={notes} onChange={event => setNotes(event.target.value)} placeholder="What would you want a reviewer to know? (demo content only)" rows="3"/>
        <div className="save-actions"><button className="primary-button" onClick={saveSelected} disabled={busy}>{busy ? 'Saving…' : 'Save image + details locally'}</button><span>Only this sample match is saved, not the image you searched with.</span></div>
      </div>}
      {!selectedResult && <p className="instruct">When you find a possible match, choose <strong>Save to vault</strong> to keep it here.</p>}
      <div className="vault-count"><strong>{records.length} saved demonstration record{records.length === 1 ? '' : 's'}</strong><span>On this device • previews hidden</span></div>
      {records.length ? <div className="vault-list">{records.map(record => <article key={record.id} className="vault-record">
        <div className="vault-record-top"><div><span className={record.sourceIsFictional ? 'demo-stamp' : 'reference-stamp'}>{record.sourceIsFictional ? 'FICTIONAL REDDIT' : 'LOCAL DEMO REFERENCE'}</span><h4>{record.referenceFileName}</h4></div><button className="quiet-button remove" onClick={() => removeRecord(record)}>Delete</button></div>
        <div className="evidence-metadata"><span><b>Source</b>{record.sourcePlatform}</span><span><b>Recorded</b>{formatDate(record.discoveredAt)}</span><span><b>Matching</b>{record.matchingMethods.join(', ')}</span><span><b>pHash</b>{record.phashDistance == null ? 'Not used' : `${record.phashDistance} / 64`}</span><span><b>Review</b>Unverified lead</span><span><b>Reporting</b>{statuses.find(s => s[0] === record.reportStatus)?.[1] || 'Not reported'}</span></div>
        <details className="metadata-details"><summary>File integrity and notes</summary><p>Reference SHA-256: <code>{record.referenceSha256 || 'Not available'}</code></p>{record.sourceIsFictional && <p>Fictional source URL (do not use as evidence): <code>{record.sourceUrl}</code></p>}<p>Notes: {record.notes || 'None'}</p></details>
        <div className="vault-record-actions"><RecordPreview imageBlob={record.imageBlob} fileName={record.referenceFileName}/>{record.sourceIsFictional && <button className="outlined-button" onClick={() => { setReportId(record.id); document.getElementById('report-hub')?.scrollIntoView({ behavior: 'smooth' }); }}>Reporting guide</button>}</div>
      </article>)}</div> : <div className="vault-empty">Nothing saved yet. Matches you choose to keep will appear here.</div>}
      <div className="export-box">
        <div><span className="section-kicker steel">KEEP A COPY</span><h3>Download a protected backup</h3><p>Save your selected sample images and match details in a password-protected file on your device.</p></div>
        <div className="vault-passwords"><label>Export passphrase (12+ characters)<input autoComplete="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)}/></label><label>Repeat passphrase<input autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></label></div>
        <button className="primary-button export-button" onClick={exportVault} disabled={!records.length || busy}>Download encrypted .reclaim file</button>
        <details className="import-details"><summary>Restore an exported demo package</summary><p>Import replaces the current demo vault after confirmation.</p><input ref={importPicker} type="file" accept=".reclaim,application/octet-stream" onChange={e => setImportFile(e.target.files?.[0] || null)}/><label>Backup passphrase<input type="password" autoComplete="off" value={importPassword} onChange={e => setImportPassword(e.target.value)}/></label><button className="outlined-button" disabled={busy || !importFile} onClick={importVault}>Import encrypted backup</button></details>
        <button className="quiet-button remove" onClick={clearVault} disabled={!records.length}>Clear demo vault from this browser</button>
      </div>
      {vaultError && <p className="error" role="alert">{vaultError}</p>}
      {notice && <p className="vault-notice" role="status">{notice}</p>}
    </section>
    <section id="report-hub" className="panel reporting-panel">
      <div className="panel-head"><span className="step">04</span><div><h2>Reporting options</h2><p>Explore a possible next step with a fictional Reddit example.</p></div></div>
      {reportRecord?.sourceIsFictional ? <div className="report-content">
        <p className="fiction-warning"><b>FICTIONAL REPORT DEMO:</b> This entry was not found on Reddit. Do not submit its fictional URL or sample information to Reddit.</p>
        <h3>Reddit: nonconsensual intimate media</h3>
        <p>For a real case, an individual in the U.S. can use Reddit's Take It Down Act legal form. Reddit requires a genuine direct content URL, contact email, and full legal signature. Alternatively, a user can report the relevant post/comment under Reddit's sitewide rules.</p>
        <div className="report-actions"><a className="primary-button" href={REDDIT_TIDA} target="_blank" rel="noopener noreferrer">Open Reddit's U.S. legal removal form ↗</a><a className="outlined-button" href={REDDIT_RULES_GUIDE} target="_blank" rel="noopener noreferrer">See Reddit in-app reporting instructions ↗</a><a className="outlined-button" href={REDDIT_TIDA_GUIDE} target="_blank" rel="noopener noreferrer">Legal form requirements ↗</a></div>
        <button className="quiet-button" onClick={() => copyDraft(reportRecord)}>Copy fictional report summary (testing only)</button>
        <label className="field-label" htmlFor="report-status">Track what YOU did (not automatically verified)</label>
        <select id="report-status" value={reportRecord.reportStatus} onChange={e => changeStatus(reportRecord, e.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {reportRecord.reportStatusUpdatedAt && <small>Last manual status update: {formatDate(reportRecord.reportStatusUpdatedAt)}</small>}
      </div> : <div className="report-placeholder"><h3>Explore a reporting example</h3><p>Save any sample match, choose <strong>Fictional Reddit example</strong>, and open its reporting guide. No report will be sent.</p></div>}
      <p className="fineprint">This demo never submits a report. Status changes here are for illustration only.</p>
    </section>
  </div>;
}
