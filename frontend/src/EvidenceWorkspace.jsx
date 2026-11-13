import { useEffect, useId, useRef, useState } from 'react';
import { allEvidence, saveEvidence, deleteEvidence, replaceEvidence, clearEvidence } from './lib/evidenceVault';
import { decryptEvidence, downloadBlob, encryptEvidence } from './lib/secureExport';
import { PLATFORMS, PLATFORM_IDS, GENERAL_GUIDE, isPlatform, platformForRecord } from './lib/reportingPlatforms';
import { MANUAL_LIMITS, OTHER_SITE, buildManualRecord, isManualRecord, manualSummary } from './lib/manualRecords';
import { PREVENTION_TOOLS } from './lib/supportTools';
import './reporting.css';

// The fictional platform examples and their official reporting links live in
// lib/reportingPlatforms.js. Every example URL there is deliberately non-existent.

const DATE_OPTIONS = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
const formatDate = date => date ? new Date(date).toLocaleString(undefined, DATE_OPTIONS) : 'Not recorded';
// A day the person typed (YYYY-MM-DD), shown without a time.
const formatDay = day => day ? new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';
const todayLocal = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const EMPTY_MANUAL = { site: '', siteName: '', url: '', seenOn: '', notes: '' };
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
  if (isManualRecord(record)) return manualSummary(record);
  const platform = PLATFORMS[platformForRecord(record)] || PLATFORMS.reddit;
  return [
    'RECLAIM DEMONSTRATION — NOT A REAL REPORT',
    `Site: ${platform.name} (fictional demonstration)`,
    `Illustrative content URL (not real): ${record.sourceUrl}`,
    `Local evidence ID: ${record.id}`,
    `Recorded: ${record.discoveredAt}`,
    `Saved demo reference file: ${record.referenceFileName}`,
    `Match methods: ${record.matchingMethods.join(', ')}`,
    record.phashDistance !== null ? `pHash distance: ${record.phashDistance} / 64` : '',
    '',
    'Real submissions require the genuine direct URL and accurate facts.',
    platform.draftNote,
    `This sample is for product demonstration only. Do not submit it to ${platform.name}.`,
  ].filter(Boolean).join('\n');
}

// Free services that stop copies spreading. Shown under every reporting guide.
function PreventionTools({ describedBy }) {
  return <div className="prevention-tools">
    <h3>Stop copies spreading</h3>
    <p>These free services can block copies on the platforms that take part. They work alongside a report, not instead of one. Reclaim does not contact them for you.</p>
    <ul>{PREVENTION_TOOLS.map(tool => <li key={tool.id}>
      <span className="prevention-who">{tool.who}</span>
      <strong>{tool.name}</strong>
      <span className="prevention-text">{tool.text}</span>
      <a className="outlined-button" href={tool.href} target="_blank" rel="noopener noreferrer" aria-describedby={describedBy}>{tool.label} <span aria-hidden="true">↗</span></a>
    </li>)}</ul>
  </div>;
}

export default function EvidenceWorkspace({ selectedResult, queryLabel, clearSelection, savedEvidenceHeadingRef, addByHandRequest = 0 }) {
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
  // "Add a record by hand" form: text only, never an image.
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [manualError, setManualError] = useState('');
  const manualHeadingId = useId();
  const manualErrorId = useId();
  const manualSiteRef = useRef(null);
  const addByHandButtonRef = useRef(null);
  const pendingManualFocusRef = useRef(false);
  const setManualField = (field, value) => { setManual(current => ({ ...current, [field]: value })); setManualError(''); };

  function openManual() {
    clearFeedback();
    setManualError('');
    pendingManualFocusRef.current = true;
    setManualOpen(true);
  }
  function closeManual() {
    setManualOpen(false); setManual(EMPTY_MANUAL); setManualError('');
    window.requestAnimationFrame(() => addByHandButtonRef.current?.focus());
  }
  // A request from the search panel opens the form.
  useEffect(() => {
    if (!addByHandRequest) return;
    setManualError('');
    pendingManualFocusRef.current = true;
    setManualOpen(true);
  }, [addByHandRequest]);
  // Move to the form once it is on the page (also when opened from the search panel).
  useEffect(() => {
    if (!manualOpen || !pendingManualFocusRef.current || !manualSiteRef.current) return;
    pendingManualFocusRef.current = false;
    manualSiteRef.current.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    manualSiteRef.current.focus({ preventScroll: true });
  }, [manualOpen, addByHandRequest]);
  // Saving a search result and adding by hand are separate steps: show one at a time.
  useEffect(() => { if (selectedResult) setManualOpen(false); }, [selectedResult]);

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
        id: crypto.randomUUID(), demoOnly: true, sourceIsFictional: isPlatform(sourceType),
        discoveredAt: new Date().toISOString(), sourcePublishedAt: null,
        sourceKind: sourceType, // 'local', 'unsplash', or a fictional platform id such as 'reddit'
        reportPlatform: isPlatform(sourceType) ? sourceType : null,
        sourcePlatform: isPlatform(sourceType) ? PLATFORMS[sourceType].sourcePlatform : sourceType === 'unsplash' ? 'Unsplash test collection' : 'Local sample catalog',
        sourceUrl: isPlatform(sourceType) ? PLATFORMS[sourceType].fictionalUrl : sourceType === 'unsplash' ? (selectedResult.source_url || null) : null,
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
      setNotice(isPlatform(sourceType)
        ? `Demo image saved with a FICTIONAL ${PLATFORMS[sourceType].name} source. This is NOT a discovery on ${PLATFORMS[sourceType].name}.`
        : sourceType === 'unsplash'
        ? 'Unsplash test photo and match details saved locally in this browser.'
        : 'Demo reference image and match details saved locally in this browser.');
    } catch (err) { setVaultError(err.message); }
    finally { setBusy(false); setActiveOperation(null); }
  }

  async function saveManual(event) {
    event.preventDefault();
    if (busy) return;
    clearFeedback(); setManualError('');
    let record;
    try { record = buildManualRecord(manual, { id: crypto.randomUUID(), now: new Date().toISOString() }); }
    catch (err) { setManualError(err.message); return; }
    setBusy(true); setActiveOperation('save-manual');
    try {
      await saveEvidence(record);
      await refresh();
      setManualOpen(false); setManual(EMPTY_MANUAL);
      setNotice('Your record was saved in this browser. No image was saved.');
      window.requestAnimationFrame(() => savedEvidenceHeadingRef?.current?.focus());
    } catch (err) { setManualError(err.message); }
    finally { setBusy(false); setActiveOperation(null); }
  }

  async function copyAddress(record) {
    clearFeedback();
    try { await navigator.clipboard.writeText(record.sourceUrl); setNotice('Web address copied.'); }
    catch { setVaultError('Clipboard access was blocked by this browser.'); }
  }

  async function removeRecord(record) {
    if (!window.confirm(`Delete the saved record “${record.referenceFileName}”? This cannot be undone.`)) return;
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
    if (!records.length) { setVaultError('There are no saved records to export.'); return; }
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
      setNotice('Encrypted backup downloaded. Keep your passphrase safe; it cannot be recovered.');
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
      if (!window.confirm(`Replace the ${records.length} record(s) saved here with the ${restored.length} record(s) in this backup?`)) return;
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
        'This backup contains a hand-added record that cannot be read.',
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
    if (!window.confirm('Delete ALL records saved by Reclaim in this browser, including ones you added by hand? This cannot be undone without an exported backup.')) return;
    clearFeedback();
    try { await clearEvidence(); setReportId(null); await refresh(); setNotice('The vault in this browser was cleared.'); }
    catch (err) { setVaultError(err.message); }
  }

  async function copyDraft(record) {
    clearFeedback();
    try {
      await navigator.clipboard.writeText(reportDraft(record));
      setNotice(isManualRecord(record)
        ? 'Your record summary was copied. Paste it wherever you need it.'
        : `Fictional example report summary copied. Do not submit the sample to ${PLATFORMS[platformForRecord(record)]?.name || 'a platform'}.`);
    }
    catch { setVaultError('Clipboard access was blocked by this browser.'); }
  }

  const reportRecord = records.find(item => item.id === reportId) || null;
  const reportIsManual = isManualRecord(reportRecord);
  const reportPlatform = PLATFORMS[platformForRecord(reportRecord)] || (reportIsManual ? GENERAL_GUIDE : null);
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
      <div className="panel-head"><span className="step">03</span><div><h2 ref={savedEvidenceHeadingRef} tabIndex={-1}>Saved evidence</h2><p>Keep the matches you choose, or add what you found yourself. Previews stay hidden until you open them.</p></div></div>
      <p className="vault-warning"><strong>Demo safety note:</strong> Saved items stay on this device, but they are not encrypted in this browser. Only use sample images. A possible match is not proof of distribution.</p>
      {selectedResult && <div className="save-panel">
        <div className="save-head"><div><span className="section-kicker purple">SELECTED IMAGE</span><h3>{selectedResult.label}</h3><p>File: {selectedResult.file_name || (selectedResult.demo_url || '').split('/').pop()} • {selectedResult.matching_methods.join(' + ')} {selectedResult.phash_distance != null ? `• pHash ${selectedResult.phash_distance}/64` : ''}</p></div><button className="quiet-button" onClick={finishSelection}>Cancel</button></div>
        <label className="field-label" htmlFor="source-type">Where was this found? (demo)</label>
        <select id="source-type" value={sourceType} onChange={event => setSourceType(event.target.value)}>
          {selectedResult.source === 'unsplash'
            ? <option value="unsplash">Unsplash test collection</option>
            : <option value="local">Sample image collection</option>}
          {PLATFORM_IDS.map(id => <option key={id} value={id}>{PLATFORMS[id].exampleLabel}</option>)}
        </select>
        {isPlatform(sourceType) && <p className="fiction-warning">SIMULATED: “Found match on {PLATFORMS[sourceType].name}” is a made-up scenario. The URL is intentionally fictitious. No search of {PLATFORMS[sourceType].name} has occurred.</p>}
        <label className="field-label" htmlFor="evidence-notes">Notes for your record (optional)</label>
        <textarea id="evidence-notes" maxLength={1500} value={notes} onChange={event => setNotes(event.target.value)} placeholder="What would you want a reviewer to know? (demo content only)" rows="3"/>
        <div className="save-actions"><button className="primary-button" onClick={saveSelected} disabled={busy}>{activeOperation === 'save' ? 'Saving…' : 'Save image + details locally'}</button><span>Only this sample match is saved, not the image you searched with.</span></div>
      </div>}
      {manualOpen && !selectedResult && <form className="save-panel manual-panel" aria-labelledby={manualHeadingId} onSubmit={saveManual} noValidate>
        <div className="save-head"><div><span className="section-kicker steel">ADD BY HAND</span><h3 id={manualHeadingId}>Record something you found yourself</h3><p>Use this when you found something outside Reclaim, for example with one of the search engines above. Only what you type is saved. No image is saved.</p></div><button type="button" className="quiet-button" onClick={closeManual}>Cancel</button></div>
        <label className="field-label" htmlFor="manual-site">Where did you find it?</label>
        <select id="manual-site" ref={manualSiteRef} value={manual.site} onChange={event => setManualField('site', event.target.value)}>
          <option value="">Choose one…</option>
          {PLATFORM_IDS.map(id => <option key={id} value={id}>{PLATFORMS[id].name}</option>)}
          <option value={OTHER_SITE}>Another website or app</option>
        </select>
        {manual.site === OTHER_SITE && <>
          <label className="field-label" htmlFor="manual-site-name">Name of the website or app (optional)</label>
          <input id="manual-site-name" type="text" autoComplete="off" maxLength={MANUAL_LIMITS.siteName} value={manual.siteName} onChange={event => setManualField('siteName', event.target.value)}/>
        </>}
        <label className="field-label" htmlFor="manual-url">Web address (URL)</label>
        <input id="manual-url" type="text" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={MANUAL_LIMITS.url} placeholder="https://…" value={manual.url} onChange={event => setManualField('url', event.target.value)}/>
        <label className="field-label" htmlFor="manual-date">Date you saw it (optional)</label>
        <input id="manual-date" type="date" max={todayLocal()} value={manual.seenOn} onChange={event => setManualField('seenOn', event.target.value)}/>
        <label className="field-label" htmlFor="manual-notes">Your notes</label>
        <textarea id="manual-notes" maxLength={MANUAL_LIMITS.notes} rows="4" value={manual.notes} onChange={event => setManualField('notes', event.target.value)} placeholder="For example: the username that posted it, what the post said, or who you have told."/>
        <p className="manual-privacy">This stays in this browser on this device. Reclaim does not send it anywhere. It is not encrypted here, so someone who can open this browser could read it. The backup file you download below is password-protected.</p>
        {manualError && <p id={manualErrorId} className="error" role="alert">{manualError}</p>}
        <div className="save-actions"><button type="submit" className="primary-button" disabled={busy}>{activeOperation === 'save-manual' ? 'Saving…' : 'Save record'}</button><span>Add a web address, a note, or both.</span></div>
      </form>}
      {!selectedResult && !manualOpen && <div className="manual-start">
        <button type="button" className="outlined-button" ref={addByHandButtonRef} onClick={openManual}>Add a record by hand</button>
      </div>}
      <div className="vault-count"><strong>{records.length} saved record{records.length === 1 ? '' : 's'}</strong><span>On this device • previews hidden</span></div>
      {records.length ? <div className="vault-list">{records.map((record, index) => {
        const byHand = isManualRecord(record);
        const stamp = byHand ? 'ADDED BY HAND'
          : record.sourceIsFictional ? (PLATFORMS[platformForRecord(record)]?.stamp || 'FICTIONAL EXAMPLE')
          : record.sourceKind === 'unsplash' ? 'UNSPLASH TEST PHOTO' : 'LOCAL DEMO REFERENCE';
        const reportingLabel = statuses.find(s => s[0] === record.reportStatus)?.[1] || 'Not reported';
        return <article key={record.id} className="vault-record">
        <div className="vault-record-top"><div><span className={record.sourceIsFictional ? 'demo-stamp' : byHand ? 'manual-stamp' : 'reference-stamp'}>{stamp}</span><h3>{record.referenceFileName}</h3></div><button className="quiet-button remove" ref={node => {
          if (node) deleteButtonRefs.current.set(record.id, node);
          else deleteButtonRefs.current.delete(record.id);
        }} aria-label={`Delete: saved record ${index + 1}`} onClick={() => removeRecord(record)}>Delete</button></div>
        {byHand
          ? <div className="evidence-metadata"><span><b>Where</b>{record.sourcePlatform}</span><span><b>Date seen</b>{formatDay(record.seenOn)}</span><span><b>Saved here</b>{formatDate(record.discoveredAt)}</span><span><b>Image</b>None saved</span><span><b>Reporting</b>{reportingLabel}</span></div>
          : <div className="evidence-metadata"><span><b>Source</b>{record.sourcePlatform}</span><span><b>Recorded</b>{formatDate(record.discoveredAt)}</span><span><b>Matching</b>{record.matchingMethods.join(', ')}</span><span><b>pHash</b>{record.phashDistance == null ? 'Not used' : `${record.phashDistance} / 64`}</span><span><b>Review</b>Unverified lead</span><span><b>Reporting</b>{reportingLabel}</span></div>}
        {byHand
          ? <details className="metadata-details" open><summary>Web address and notes</summary>
            {record.sourceUrl
              ? <p className="manual-address">Web address: <code>{record.sourceUrl}</code> <button type="button" className="quiet-button compact" aria-label={`Copy web address: saved record ${index + 1}`} onClick={() => copyAddress(record)}>Copy</button></p>
              : <p>Web address: Not recorded</p>}
            <p className="manual-notes">Notes: {record.notes || 'None'}</p>
          </details>
          : <details className="metadata-details"><summary>File integrity and notes</summary><p>Reference SHA-256: <code>{record.referenceSha256 || 'Not available'}</code></p>{record.sourceIsFictional && <p>Fictional source URL (do not use as evidence): <code>{record.sourceUrl}</code></p>}{record.sourceKind === 'unsplash' && /^https:\/\/unsplash\.com\//.test(record.sourceUrl || '') && <p>Found at: <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">{record.sourceUrl}</a></p>}<p>Notes: {record.notes || 'None'}</p></details>}
        <div className="vault-record-actions">{record.imageBlob && <RecordPreview imageBlob={record.imageBlob} recordNumber={index + 1}/>}{(record.sourceIsFictional || byHand) && <button className="outlined-button" aria-label={`Reporting guide: saved record ${index + 1}`} onClick={() => {
          setReportId(record.id);
          window.requestAnimationFrame(() => {
            document.getElementById('report-hub')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
            reportingHeadingRef.current?.focus({ preventScroll: true });
          });
        }}>Reporting guide</button>}</div>
      </article>; })}</div> : <div className="vault-empty">Nothing saved yet. Matches you choose to keep, and records you add by hand, will appear here.</div>}
      <div className="export-box">
        <div><span className="section-kicker steel">KEEP A COPY</span><h3>Download a protected backup</h3><p>Save your selected sample images, match details and hand-added records in a password-protected file on your device.</p></div>
        <div className="vault-passwords"><label>Export passphrase (12+ characters)<input autoComplete="new-password" type="password" {...validationProps('export')} value={password} onChange={e => { setPassword(e.target.value); clearFieldValidation('export'); }}/></label><label>Repeat passphrase<input autoComplete="new-password" type="password" {...validationProps('confirm')} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); clearFieldValidation('confirm'); }}/></label></div>
        <button className="primary-button export-button" onClick={exportVault} disabled={!records.length || busy}>Download encrypted .reclaim file</button>
        <details className="import-details"><summary id="backup-import-label">Restore a backup</summary><p id="backup-import-warning">Restoring replaces everything saved here, after you confirm.</p><input ref={importPicker} aria-labelledby="backup-import-label" {...validationProps('file')} aria-describedby={['backup-import-warning', validationProps('file')['aria-describedby']].filter(Boolean).join(' ')} type="file" accept=".reclaim,application/octet-stream" onChange={e => { setImportFile(e.target.files?.[0] || null); clearFieldValidation('file'); }}/><label>Backup passphrase<input type="password" autoComplete="off" {...validationProps('import')} value={importPassword} onChange={e => { setImportPassword(e.target.value); clearFieldValidation('import'); }}/></label><button className="outlined-button" disabled={busy || !importFile} onClick={importVault}>Import encrypted backup</button></details>
        <button className="quiet-button remove" onClick={clearVault} disabled={!records.length}>Clear the vault from this browser</button>
      </div>
      {vaultError && <p key={errorRevision} id={validationErrorId} className="error" role="alert">{vaultError}</p>}
      {notice && <p className="vault-notice" aria-hidden="true">{notice}</p>}
      <span role="status" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }}>{activeOperation === 'export' ? 'Preparing backup…' : activeOperation === 'import' ? 'Restoring backup…' : notice}</span>
    </section>
    <section id="report-hub" className="panel reporting-panel" data-scroll-reveal>
      <div className="panel-head"><span className="step">04</span><div><h2 ref={reportingHeadingRef} tabIndex={-1}>Reporting options</h2><p>See the official reporting steps for a record you saved. Reclaim opens each platform's own page. It never sends a report for you.</p></div></div>
      {reportPlatform ? <div className="report-content">
        {reportIsManual
          ? <p className="platform-note" role="note"><b>Your record:</b> you added this by hand. Use the web address you saved when you fill in {reportPlatform === GENERAL_GUIDE ? "the site's" : `${reportPlatform.name}'s`} own form. Only report what is true for you.</p>
          : <p className="fiction-warning"><b>FICTIONAL REPORT DEMO:</b> This entry was not found on {reportPlatform.name}. Do not submit its fictional URL or sample information to {reportPlatform.name}.</p>}
        <h3>{reportPlatform.heading}</h3>
        <p>{reportPlatform.intro}</p>
        {reportIsManual && reportRecord.sourceUrl && <p className="manual-address">Web address you saved: <code>{reportRecord.sourceUrl}</code> <button type="button" className="quiet-button compact" onClick={() => copyAddress(reportRecord)}>Copy</button></p>}
        {reportPlatform.linkStatus === 'unverified' && <p className="platform-note platform-note-warning" role="note"><b>Not yet verified:</b> {reportPlatform.name}'s own reporting pages could not be checked, so there is no direct form link here. Please confirm the official steps on {reportPlatform.name} before relying on this.</p>}
        <div className="report-actions">{reportPlatform.links.map((link, index) => <a key={link.href} className={index === 0 && reportPlatform.linkStatus !== 'unverified' ? 'primary-button' : 'outlined-button'} href={link.href} target="_blank" rel="noopener noreferrer" aria-describedby={newTabDescriptionId}>{link.label} <span aria-hidden="true">↗</span></a>)}</div>
        {reportPlatform.note && reportPlatform.linkStatus !== 'unverified' && <p className="platform-note">{reportPlatform.note}</p>}
        <button className="quiet-button" onClick={() => copyDraft(reportRecord)}>{reportIsManual ? 'Copy my record summary' : 'Copy fictional report summary (testing only)'}</button>
        <label className="field-label" htmlFor="report-status">Track what YOU did (not automatically verified)</label>
        <select id="report-status" value={reportRecord.reportStatus} onChange={e => changeStatus(reportRecord, e.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        {reportRecord.reportStatusUpdatedAt && <small>Last manual status update: {formatDate(reportRecord.reportStatusUpdatedAt)}</small>}
      </div> : <div className="report-placeholder"><h3>Open a reporting guide</h3><p>Choose <strong>Reporting guide</strong> on a record you added by hand, or on a sample match saved with a <strong>Fictional</strong> platform example (Reddit, X, Snapchat or OnlyFans). No report will be sent.</p></div>}
      <PreventionTools describedBy={newTabDescriptionId}/>
      <span id={newTabDescriptionId} hidden>Opens in a new tab.</span>
      <p className="fineprint">Reclaim never submits a report. Status changes here are your own notes and are not checked.</p>
    </section>
  </div>;
}
