import { useEffect, useRef, useState } from 'react';

const FALLBACK_DEMOS = [
  { id: 'garden-original', label: 'Garden original', demo_url: '/samples/garden-original.png' },
  { id: 'coast-original', label: 'Coast original', demo_url: '/samples/coast-original.png' },
  { id: 'shapes-original', label: 'Shapes original', demo_url: '/samples/shapes-original.png' },
];

function App() {
  const [health, setHealth] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [methods, setMethods] = useState(['sha256', 'phash']);
  const [results, setResults] = useState(null);
  const [queryLabel, setQueryLabel] = useState('');
  const [review, setReview] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const picker = useRef(null);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const [status, references] = await Promise.all([
          fetch('/api/health', { cache: 'no-store' }),
          fetch('/api/catalog', { cache: 'no-store' }),
        ]);
        if (!status.ok || !references.ok) throw new Error('The Python API is not available. Start the backend in VS Code first.');
        if (active) {
          setHealth(await status.json());
          setCatalog(await references.json());
        }
      } catch {
        if (active) setError('Python backend not connected. Check that Uvicorn is running on localhost:8000 and that you seeded the demo catalog.');
      }
    }
    start();
    return () => { active = false; };
  }, []);

  function toggleMethod(method) {
    setResults(null);
    setMethods(current => current.includes(method)
      ? (current.length === 1 ? current : current.filter(value => value !== method))
      : [...current, method]);
  }

  async function runSearch(file, label) {
    if (!file || loading) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose a demo image smaller than 8 MB.'); return;
    }
    setError(''); setLoading(true); setResults(null); setReview({});
    try {
      const response = await fetch(`/api/search?methods=${encodeURIComponent(methods.join(','))}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file, // image data is sent to the LOCAL Python backend, not a public search site
        cache: 'no-store',
      });
      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail || `Search failed with HTTP ${response.status}`);
      }
      setResults(await response.json());
      setQueryLabel(label);
    } catch (err) {
      setError(err.message || 'The search could not finish.');
    } finally {
      setLoading(false);
    }
  }

  async function runDemo(demo) {
    try {
      const response = await fetch(demo.demo_url);
      if (!response.ok) throw new Error('Demo sample not found.');
      const file = await response.blob();
      await runSearch(file, `Demo image: ${demo.label}`);
    } catch (err) {
      setError(err.message || 'Demo image could not load.');
    }
  }

  async function onChoose(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // no query file retained in the file input
    if (file) await runSearch(file, 'Local file selected');
  }

  const demos = catalog.filter(c => FALLBACK_DEMOS.some(d => d.id === c.id));
  const available = health?.methods || ['sha256', 'phash'];

  return <div className="site">
    <header className="nav">
      <div className="brand"><span className="brand-mark">R</span><span>RECLAIM</span><span className="brand-slash">/</span><span className="brand-sub">Discovery Lab</span></div>
      <div className="nav-meta"><span className="status-dot" /> LOCAL PYTHON API <span className="nav-separator">•</span> DEMO ONLY</div>
    </header>
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">REACT + PYTHON / BASELINE 0.2</p>
          <h1>One image. <em>Three possible matching methods.</em></h1>
          <p className="lead">A local prototype of Reclaim's discovery engine. Python preprocesses an uploaded image in memory, extracts selected features, and compares them with an approved SQLite reference catalog.</p>
          <div className="hero-tags"><span className="pill">Local Python backend</span><span className="pill">SHA-256 + pHash</span><span className="pill">Optional OpenCLIP</span></div>
        </div>
        <div className="hero-side">
          <div className="hero-metric"><span>{String(health?.reference_count ?? 0).padStart(2, '0')}</span><small>approved demo references</small></div>
          <div className="hero-metric"><span>{String(available.length).padStart(2, '0')}</span><small>available methods</small></div>
          <div className="hero-metric"><span>{results === null ? '—' : String(results.results.length).padStart(2, '0')}</span><small>candidate matches</small></div>
        </div>
      </section>
      <div className="working-layout">
        <section className="panel controls-panel">
          <div className="panel-head"><span className="step">01</span><div><h2>Search a sample image</h2><p>Try the built-in demonstration photos or choose a harmless test picture.</p></div></div>
          <div className="demo-row">
            {(demos.length ? demos : FALLBACK_DEMOS).map(demo => <button className="demo-option" key={demo.id} onClick={() => runDemo(demo)} disabled={loading || !health || !catalog.length}>
              <img src={demo.demo_url} alt="Harmless sample illustration" />
              <span>{demo.label.split(' ')[0]}</span><small>Run demo query</small>
            </button>)}
          </div>
          <input hidden ref={picker} type="file" accept="image/png,image/jpeg,image/webp" onChange={onChoose}/>
          <button className="upload" onClick={() => picker.current?.click()} disabled={loading || !health || !catalog.length}>
            <span className="upload-icon">+</span>
            <span><strong>Choose a test image</strong><small>8 MB max. Sent only to your local Python server for processing.</small></span>
          </button>
          <div className="subhead"><h3>Feature extraction</h3><span>Select at least one</span></div>
          <div className="methods">
            <label className="method"><input type="checkbox" checked={methods.includes('sha256')} onChange={() => toggleMethod('sha256')}/><span><strong>Cryptographic hash · SHA-256</strong><small>Exact-file matching (even small edits change the hash)</small></span></label>
            <label className="method"><input type="checkbox" checked={methods.includes('phash')} onChange={() => toggleMethod('phash')}/><span><strong>Perceptual hash · pHash</strong><small>Finds some visually similar resized or compressed images</small></span></label>
            <label className="method"><input type="checkbox" checked={methods.includes('openclip')} disabled={!available.includes('openclip')} onChange={() => toggleMethod('openclip')}/><span><strong>Computer-vision embeddings · OpenCLIP</strong><small>{available.includes('openclip') ? 'Local model loaded from a developer-provided checkpoint' : 'Optional advanced setup (not required for the baseline)'}</small></span></label>
          </div>
          <div className="index-box"><span className="index-led" /><div><strong>{health ? `${catalog.length} safe reference images indexed in SQLite` : 'Waiting for backend connection'}</strong><small>The database stores pre-approved fingerprints, not query uploads. SQL is storage, not a search source.</small></div></div>
          {error && <div className="error" role="alert">{error}</div>}
          <p className="fineprint">This demo is not access-controlled or security-audited. Do not use real intimate imagery or case evidence. Local Python processing is NOT the same as browser-only processing.</p>
        </section>
        <section className="panel results-panel">
          <div className="panel-head"><span className="step">02</span><div><h2>Combined results</h2><p>All selected methods compare against the same authorized local reference catalog.</p></div></div>
          {loading ? <div className="empty"><div className="loading-ring"/><h3>Searching local references…</h3><p>The source image is processed temporarily by Python.</p></div>
          : !results ? <div className="empty"><div className="empty-glyph">◎</div><h3>No search yet</h3><p>Run a demo query to see exact-file and perceptual comparisons side by side.</p></div>
          : <>
            <div className="summary"><div><span className="summary-overline">LOCAL SEARCH FINISHED</span><h3>{results.results.length} candidate match{results.results.length === 1 ? '' : 'es'}</h3><p>{queryLabel}. Compared against {results.checked_references} demo records.</p></div></div>
            {results.results.length ? <div className="result-list">
              {results.results.map(item => <article className="result" key={item.id}>
                <div className="result-thumb"><img src={item.demo_url} alt="Non-sensitive reference sample" /></div>
                <div>
                  <div className="result-top"><span className={`verdict ${item.exact ? 'exact' : 'possible'}`}>{item.exact ? 'Same exact file' : 'Possible visual match'}</span><span className="result-kind">{item.kind}</span></div>
                  <h4>{item.label}</h4>
                  <div className="distance-row">
                    {item.matching_methods.map(method => <span key={method}>{method.toUpperCase()} matched</span>)}
                    {item.phash_distance !== null && <span>pHash distance: {item.phash_distance} / 64</span>}
                    {item.openclip_cosine !== null && <span>Embedding cosine: {item.openclip_cosine}</span>}
                  </div>
                  <label className="review-choice"><input type="checkbox" checked={Boolean(review[item.id])} onChange={event => setReview(previous => ({ ...previous, [item.id]: event.target.checked }))} /> Mark for review (session only)</label>
                </div>
              </article>)}
            </div> : <div className="empty small"><h3>No matching candidates in the demo collection</h3><p>That cannot establish whether the image exists anywhere else.</p></div>}
            <p className="results-bottom">{results.disclaimer} Search images are not saved by the app. Review checkboxes exist only in React memory and disappear on refresh.</p>
          </>}
        </section>
      </div>
      <section className="roadmap"><div><p className="eyebrow">NEXT / NOT BUILT YET</p><h2>Search first. Secure evidence and reporting later.</h2><p>OSINT research, metadata inspection, encrypted evidence vaults, and takedown routing are separate, future modules. No internet-wide image search is included in this baseline.</p></div><div className="roadmap-cards"><span>01 <b>Local matching</b><small>Working: SHA-256 + pHash</small></span><span>02 <b>Computer vision</b><small>Optional OpenCLIP with local checkpoint</small></span><span>03 <b>OSINT + evidence vault</b><small>Future, access-controlled integrations</small></span></div></section>
    </main>
    <footer>RECLAIM / DISCOVERY LAB <span>Safe sample imagery only • Prototype, not a survivor service</span></footer>
  </div>;
}

export default App;
