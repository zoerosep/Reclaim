import { useEffect, useId, useRef, useState } from 'react';
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

function RecordPreview({ imageBlob, recordNumber }) {
  const previewId = useId();
  const [show, setShow] = useState(false);
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!show || !imageBlob) return undefined;
    const url = URL.createObjectURL(imageBlob);
    setSrc(url);
    return () => { URL.revokeObjectURL(url); setSrc(''); };
  }, [imageBlob, show]);
  return <div className="vault-preview">
    <button type="button" className="quiet-button" aria-label={`${show ? 'Hide preview' : 'Reveal preview'}: saved record ${recordNumber}`} aria-expanded={show} aria-controls={previewId} onClick={() => setShow(v => !v)}>{show ? 'Hide preview' : 'Reveal preview'}</button>
    <div id={previewId} hidden={!show || !src}>
      {show && src && <div className="vault-preview"><img alt={`Demo image preview for saved record ${recordNumber}`} src={src} /></div>}
    </div>
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

export default function EvidenceWorkspace({ selectedResult, queryLabel, clearSelection, savedEvidenceHeadingRef }) {
  const [records, setRecords] = useState([]);
  const [sourceType, setSourceType] = useState('local');
  const [notes, setNotes] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [errorRevision, setErrorRevision] = useState(0);
  const [validationError, setValidationError] = useState(null);
  const validationErrorId = useId();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeOperation, setActiveOperation] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [reportId, setReportId] = useState(null);
  const importPicker = useRef(null);
  const reportingHeadingRef = useRef(null);
  const newTabDescriptionId = useId();
  const deleteButtonRefs = useRef(new Map());
  const pendingDeleteFocusRef = useRef(null);
  const pendingSelectionFocusRef = useRef(false);

  useEffect(() => {
    if (selectedResult || !pendingSelectionFocusRef.current) return;
    pendingSelectionFocusRef.current = false;
    savedEvidenceHeadingRef?.current?.focus();
  }, [selectedResult, savedEvidenceHeadingRef]);

  function finishSelection() {
    pendingSelectionFocusRef.current = true;
    clearSelection();
  }

  useEffect(() => {
    const pending = pendingDeleteFocusRef.current;
    if (!pending || records.some(record => record.id === pending.id)) return;
    pendingDeleteFocusRef.current = null;
    const nextRecord = records[Math.min(pending.index, records.length - 1)];
    const target = nextRecord
      ? deleteButtonRefs.current.get(nextRecord.id)
      : savedEvidenceHeadingRef?.current;
    target?.focus();
  }, [records, savedEvidenceHeadingRef]);

  async function refresh() {
    const values = await allEvidence();
    setRecords(values.sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt)));
  }
  useEffect(() => { refresh().catch(err => setVaultError(err.message)); }, []);
  useEffect(() => { setNotes(''); setSourceType(selectedResult?.source === 'unsplash' ? 'unsplash' : 'local'); setVaultError(''); }, [selectedResult?.id]);

  function clearFeedback() {
    setVaultError('');
    setNotice('');
    setValidationError(null);
  }

  async function saveSelected() {
    if (!selectedResult || busy) return;
    clearFeedback(); setBusy(true); setActiveOperation('save');
    try {
      // Intentionally allow ONLY the bundled, safe demo reference images, or a
      // photo from the Unsplash test collection that the local Python backend
      // returned in a recent search (it serves previews for those photos only).
      const fromUnsplash = selectedResult.source === 'unsplash';
      let imageUrl = selectedResult.demo_url;
      if (fromUnsplash) {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(selectedResult.photo_id || '')) {
          throw new Error('This Unsplash result cannot be saved.');
        }
        imageUrl = `/api/unsplash/thumbnail/${selectedResult.photo_id}`;
      } else if (!/^\/samples\/[a-z0-9.-]+\.(png|jpe?g|webp)$/i.test(selectedResult.demo_url || '')) {
        throw new Error('Only the bundled safe demonstration references can be saved.');
      }
      const response = await fetch(imageUrl, { cache: 'no-store' });
      if (!response.ok) {
        const details = fromUnsplash ? await response.json().catch(() => null) : null;
        throw new Error(details?.detail || 'The selected demo reference image could not be loaded.');
      }
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
        sourceKind: sourceType, // 'local', 'unsplash' or 'reddit' (fictional)
        sourcePlatform: sourceType === 'reddit' ? 'Reddit (fictional)' : sourceType === 'unsplash' ? 'Unsplash test collection' : 'Local sample catalog',
        sourceUrl: sourceType === 'reddit' ? FAKE_REDDIT_URL : sourceType === 'unsplash' ? (selectedResult.source_url || null) : null,
        referenceId: selectedResult.id, referenceLabel: selectedResult.label,
        referenceFileName: selectedResult.file_name || (selectedResult.demo_url || '').split('/').pop(),
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
      finishSelection();
      setNotice(sourceType === 'reddit'
        ? 'Demo image saved with a FICTIONAL Reddit source. This is NOT a discovery on Reddit.'
        : sourceType === 'unsplash'
        ? 'Unsplash test photo and match details saved locally in this browser.'
        : 'Demo reference image and match details saved locally in this browser.');
    } catch (err) { setVaultError(err.message); }
    finally { setBusy(false); setActiveOperation(null); }
  }

  async function removeRecord(record) {
    if (!window.confirm(`Delete the local demo record “${record.referenceFileName}”?`)) return;
    clearFeedback();
    try {
      await deleteEvidence(record.id);
      pendingDeleteFocusRef.current = { id: record.id, index: records.findIndex(item => item.id === record.id) };
      await refresh();
      if (reportId === record.id) setReportId(null);
    }
    catch (err) { pendingDeleteFocusRef.current = null; setVaultError(err.message); }
  }

  async function changeStatus(record, value) {
    clearFeedback();
    try {
      await saveEvidence({ ...record, reportStatus: value, reportStatusUpdatedAt: new Date().toISOString() });
      await refresh();
    } catch (err) { setVaultError(err.message); }
  }

  async function exportVault() {
    clearFeedback();
    if (!records.length) { setVaultError('There are no saved demonstration records to export.'); return; }
    if (password !== confirmPassword) {
      const message = 'The two export passphrases do not match.';
      // Reinsert the alert only when an explicit retry repeats the same error.
      if (vaultError === message) setErrorRevision(revision => revision + 1);
      setValidationError({ message, fields: ['export', 'confirm'], invalidFields: ['confirm'] });
      setVaultError(message); return;
    }
    setBusy(true); setActiveOperation('export');
    try {
      const blob = await encryptEvidence(records, password);
      downloadBlob(blob, `reclaim-DEMO-evidence-${new Date().toISOString().slice(0, 10)}.reclaim`);
      setPassword(''); setConfirmPassword('');
      setNotice('Encrypted demo package downloaded. Keep your passphrase safe; it cannot be recovered.');
    } catch (err) {
      if (err.message === 'Use a passphrase at least 12 characters long.') {
        if (vaultError === err.message) setErrorRevision(revision => revision + 1);
        setValidationError({ message: err.message, fields: ['export'], invalidFields: ['export'] });
      }
      setVaultError(err.message);
    }
    finally { setBusy(false); setActiveOperation(null); }
  }

  async function importVault() {
    clearFeedback();
    if (!importFile) {
      const message = 'Choose a .reclaim demo backup to import.';
      setValidationError({ message, fields: ['file'], invalidFields: ['file'] });
      setVaultError(message); return;
    }
    setBusy(true); setActiveOperation('import');
    try {
      const restored = await decryptEvidence(importFile, importPassword);
      if (!window.confirm(`Replace ${records.length} current demo records with ${restored.length} imported demo records?`)) return;
      await replaceEvidence(restored);
      await refresh();
      setImportFile(null); setImportPassword('');
      if (importPicker.current) importPicker.current.value = '';
      setReportId(null);
      setNotice('The encrypted demo evidence package was restored into this browser.');
    } catch (err) {
      const fileErrors = [
        'The demo import limit is 30 MB.',
        'The selected file is not a valid Reclaim package.',
        'Unsupported or invalid Reclaim package.',
        'This package has an invalid evidence manifest.',
        'Invalid demonstration evidence record.',
        'Import contains an unsupported image format.',
      ];
      if (fileErrors.includes(err.message)) {
        setValidationError({ message: err.message, fields: ['file'], invalidFields: ['file'] });
      } else if (err.message === 'Could not decrypt this package. Check the passphrase and file.') {
        setValidationError({ message: err.message, fields: ['file', 'import'], invalidFields: [] });
      }
      setVaultError(err.message);
    }
    finally { setBusy(false); setActiveOperation(null); }
  }

  async function clearVault() {
    if (!window.confirm('Delete ALL locally saved Reclaim demonstration evidence in this browser? This cannot be undone without an exported backup.')) return;
    clearFeedback();
    try { await clearEvidence(); setReportId(null); await refresh(); setNotice('The local demo vault was cleared.'); }
    catch (err) { setVaultError(err.message); }
  }

  async function copyDraft(record) {
    clearFeedback();
    try { await navigator.clipboard.writeText(reportDraft(record)); setNotice('Fictional example report summary copied. Do not submit the sample to Reddit.'); }
    catch { setVaultError('Clipboard access was blocked by this browser.'); }
  }

  const reportRecord = records.find(item => item.id === reportId) || null;
  function validationProps(field) {
    const active = validationError?.message === vaultError;
    return {
      'aria-invalid': active && validationError.invalidFields.includes(field) ? true : undefined,
      'aria-describedby': active && validationError.fields.includes(field) ? validationErrorId : undefined,
    };
  }
  function clearFieldValidation(field) {
    if (!validationError?.fields.includes(field)) return;
    setVaultError(current => current === validationError.message ? '' : current);
    setValidationError(null);
  }
  return <div id="evidence-workspace" className="evidence-workspace">
    <section className="panel vault-panel" data-scroll-reveal>
      <div className="panel-head"><span className="step">03</span><div><h2 ref={savedEvidenceHeadingRef} tabIndex={-1}>Saved evidence</h2><p>Keep the matches you choose. Previews stay hidden until you open them.</p></div></div>
      <p className="vault-warning"><strong>Demo safety note:</strong> Saved items are not encrypted in this browser. Only use sample images. A possible match is not proof of distribution.</p>
      {selectedResult && <div className="save-panel">
        <div className="save-head"><div><span className="section-kicker purple">SELECTED IMAGE</span><h3>{selectedResult.label}</h3><p>File: {selectedResult.file_name || (selectedResult.demo_url || '').split('/').pop()} • {selectedResult.matching_methods.join(' + ')} {selectedResult.phash_distance != null ? `• pHash ${selectedResult.phash_distance}/64` : ''}</p></div><button className="quiet-button" onClick={finishSelection}>Cancel</button></div>
        <label className="field-label" htmlFor="source-type">Where was this found? (demo)</label>
        <select id="source-type" value={sourceType} onChange={event => setSourceType(event.target.value)}>
          {selectedResult.source === 'unsplash'
            ? <option value="unsplash">Unsplash test collection</option>
            : <option value="local">Sample image collection</option>}
          <option value="reddit">Fictional Reddit example</option>
        </select>
        {sourceType === 'reddit' && <p className="fiction-warning">SIMULATED: “Found match on Reddit” is a made-up scenario. The URL is intentionally fictitious. No search of Reddit has occurred.</p>}
        <label className="field-label" htmlFor="evidence-notes">Notes for your record (optional)</label>
        <textarea id="evidence-notes" maxLength={1500} value={notes} onChange={event => setNotes(event.target.value)} placeholder="What would you want a reviewer to know? (demo content only)" rows="3"/>
        <div className="save-actions"><button className="primary-button" onClick={saveSelected} disabled={busy}>{activeOperation === 'save' ? 'Saving…' : 'Save image + details locally'}</button><span>Only this sample match is saved, not the image you searched with.</span></div>
      </div>}
      {!selectedResult && <p className="instruct">When you find a possible match, choose <strong>Save to vault</strong> to keep it here.</p>}
      <div className="vault-count"><strong>{records.length} saved demonstration record{records.length === 1 ? '' : 's'}</strong><span>On this device • previews hidden</span></div>
      {records.length ? <div className="vault-list">{records.map((record, index) => <article key={record.id} className="vault-record">
        <div className="vault-record-top"><div><span className={record.sourceIsFictional ? 'demo-stamp' : 'reference-stamp'}>{record.sourceIsFictional ? 'FICTIONAL REDDIT' : record.sourceKind === 'unsplash' ? 'UNSPLASH TEST PHOTO' : 'LOCAL DEMO REFERENCE'}</span><h3>{record.referenceFileName}</h3></div><button className="quiet-button remove" ref={node => {
          if (node) deleteButtonRefs.current.set(record.id, node);
          else deleteButtonRefs.current.delete(record.id);
        }} aria-label={`Delete: saved record ${index + 1}`} onClick={() => removeRecord(record)}>Delete</button></div>
        <div className="evidence-metadata"><span><b>Source</b>{record.sourcePlatform}</span><span><b>Recorded</b>{formatDate(record.discoveredAt)}</span><span><b>Matching</b>{record.matchingMethods.join(', ')}</span><span><b>pHash</b>{record.phashDistance == null ? 'Not used' : `${record.phashDistance} / 64`}</span><span><b>Review</b>Unverified lead</span><span><b>Reporting</b>{statuses.find(s => s[0] === record.reportStatus)?.[1] || 'Not reported'}</span></div>
        <details className="metadata-details"><summary>File integrity and notes</summary><p>Reference SHA-256: <code>{record.referenceSha256 || 'Not available'}</code></p>{record.sourceIsFictional && <p>Fictional source URL (do not use as evidence): <code>{record.sourceUrl}</code></p>}{record.sourceKind === 'unsplash' && /^https:\/\/unsplash\.com\//.test(record.sourceUrl || '') && <p>Found at: <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">{record.sourceUrl}</a></p>}<p>Notes: {record.notes || 'None'}</p></details>
        <div className="vault-record-actions"><RecordPreview imageBlob={record.imageBlob} recordNumber={index + 1}/>{record.sourceIsFictional && <button className="outlined-button" aria-label={`Reporting guide: saved record ${index + 1}`} onClick={() => {
          setReportId(record.id);
          window.requestAnimationFrame(() => {
            document.getElementById('report-hub')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
            reportingHeadingRef.current?.focus({ preventScroll: true });
          });
        }}>Reporting guide</button>}</div>
      </article>)}</div> : <div className="vault-empty">Nothing saved yet. Matches you choose to keep will appear here.</div>}
      <div className="export-box">
        <div><span className="section-kicker steel">KEEP A COPY</span><h3>Download a protected backup</h3><p>Save your selected sample images and match details in a password-protected file on your device.</p></div>
        <div className="vault-passwords"><label>Export passphrase (12+ characters)<input autoComplete="new-password" type="password" {...validationProps('export')} value={password} onChange={e => { setPassword(e.target.value); clearFieldValidation('export'); }}/></label><label>Repeat passphrase<input autoComplete="new-password" type="password" {...validationProps('confirm')} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); clearFieldValidation('confirm'); }}/></label></div>
        <button className="primary-button export-button" onClick={exportVault} disabled={!records.length || busy}>Download encrypted .reclaim file</button>
        <details className="import-details"><summary id="backup-import-label">Restore an exported demo package</summary><p id="backup-import-warning">Import replaces the current demo vault after confirmation.</p><input ref={importPicker} aria-labelledby="backup-import-label" {...validationProps('file')} aria-describedby={['backup-import-warning', validationProps('file')['aria-describedby']].filter(Boolean).join(' ')} type="file" accept=".reclaim,application/octet-stream" onChange={e => { setImportFile(e.target.files?.[0] || null); clearFieldValidation('file'); }}/><label>Backup passphrase<input type="password" autoComplete="off" {...validationProps('import')} value={importPassword} onChange={e => { setImportPassword(e.target.value); clearFieldValidation('import'); }}/></label><button className="outlined-button" disabled={busy || !importFile} onClick={importVault}>Import encrypted backup</button></details>
        <button className="quiet-button remove" onClick={clearVault} disabled={!records.length}>Clear demo vault from this browser</button>
      </div>
      {vaultError && <p key={errorRevision} id={validationErrorId} className="error" role="alert">{vaultError}</p>}
      {notice && <p className="vault-notice" aria-hidden="true">{notice}</p>}
      <span role="status" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }}>{activeOperation === 'export' ? 'Preparing backup…' : activeOperation === 'import' ? 'Restoring backup…' : notice}</span>
    </section>
    <section id="report-hub" className="panel reporting-panel" data-scroll-reveal>
      <div className="panel-head"><span className="step">04</span><div><h2 ref={reportingHeadingRef} tabIndex={-1}>Reporting options</h2><p>Explore a possible next step with a fictional Reddit example.</p></div></div>
      {reportRecord?.sourceIsFictional ? <div className="report-content">
        <p className="fiction-warning"><b>FICTIONAL REPORT DEMO:</b> This entry was not found on Reddit. Do not submit its fictional URL or sample information to Reddit.</p>
        <h3>Reddit: nonconsensual intimate media</h3>
        <p>For a real case, an individual in the U.S. can use Reddit's Take It Down Act legal form. Reddit requires a genuine direct content URL, contact email, and full legal signature. Alternatively, a user can report the relevant post/comment under Reddit's sitewide rules.</p>
        <div className="report-actions"><a className="primary-button" href={REDDIT_TIDA} target="_blank" rel="noopener noreferrer" aria-describedby={newTabDescriptionId}>Open Reddit's U.S. legal removal form <span aria-hidden="true">↗</span></a><a className="outlined-button" href={REDDIT_RULES_GUIDE} target="_blank" rel="noopener noreferrer" aria-describedby={newTabDescriptionId}>See Reddit in-app reporting instructions <span aria-hidden="true">↗</span></a><a className="outlined-button" href={REDDIT_TIDA_GUIDE} target="_blank" rel="noopener noreferrer" aria-describedby={newTabDescriptionId}>Legal form requirements <span aria-hidden="true">↗</span></a></div>
        <span id={newTabDescriptionId} hidden>Opens in a new tab.</span>
        <button className="quiet-button" onClick={() => copyDraft(reportRecord)}>Copy fictional report summary (testing only)</button>
        <label className="field-label" htmlFor="report-status">Track what YOU did (not automatically verified)</label>
        <select id="report-status" value={reportRecord.reportStatus} onChange={e => changeStatus(reportRecord, e.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {reportRecord.reportStatusUpdatedAt && <small>Last manual status update: {formatDate(reportRecord.reportStatusUpdatedAt)}</small>}
      </div> : <div className="report-placeholder"><h3>Explore a reporting example</h3><p>Save any sample match, choose <strong>Fictional Reddit example</strong>, and open its reporting guide. No report will be sent.</p></div>}
      <p className="fineprint">This demo never submits a report. Status changes here are for illustration only.</p>
    </section>
  </div>;
}
