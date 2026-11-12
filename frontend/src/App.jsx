import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import EvidenceWorkspace from './EvidenceWorkspace.jsx';
import { WhyItMattersPage, GetHelpPage } from './InfoPages.jsx';
import reclaimLogo from './assets/reclaim-logo.png';

const FALLBACK_DEMOS = [
  { id: 'garden-original', label: 'Garden original', demo_url: '/samples/garden-original.png' },
  { id: 'coast-original', label: 'Coast original', demo_url: '/samples/coast-original.png' },
  { id: 'shapes-original', label: 'Shapes original', demo_url: '/samples/shapes-original.png' },
];

function currentRoute() {
  if (window.location.pathname === '/why-it-matters') return 'why';
  if (window.location.pathname === '/get-help') return 'help';
  return 'app';
}

function App() {
  const [page, setPage] = useState(currentRoute);
  const mainRef = useRef(null);
  const savedEvidenceHeadingRef = useRef(null);
  const previousPageRef = useRef(page);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [backToTopFocused, setBackToTopFocused] = useState(false);
  const pastScrollThresholdRef = useRef(false);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main?.animate || !window.IntersectionObserver) return;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches) return;
    const revealed = new WeakSet();
    const animations = new Map();
    let stopped = false;
    const observer = new IntersectionObserver(entries => {
      if (stopped) return;
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting || revealed.has(target)) return;
        revealed.add(target);
        observer.unobserve(target);
        if (target.contains(document.activeElement)) return;
        const animation = target.animate(
          [{ transform: 'translateY(8px)', opacity: 0.96 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 1200, easing: 'ease-in-out' },
        );
        animations.set(target, animation);
        animation.onfinish = () => animations.delete(target);
      });
    });
    function revealWithoutMotion(target) {
      if (!target || !main.contains(target)) return;
      revealed.add(target);
      observer.unobserve(target);
      animations.get(target)?.cancel();
      animations.delete(target);
    }
    function onCardFocus(event) {
      revealWithoutMotion(event.target.closest('[data-scroll-reveal]'));
    }
    function skipAnchorReveal(hash) {
      if (!hash) return;
      let id;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      const destination = document.getElementById(id);
      revealWithoutMotion(destination?.closest('[data-scroll-reveal]'));
    }
    function onAnchorClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href^="#"]');
      if (link) skipAnchorReveal(link.hash);
    }
    function onHashChange() {
      skipAnchorReveal(window.location.hash);
    }
    function stopReveals() {
      stopped = true;
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      animations.clear();
    }
    function onMotionPreferenceChange(event) {
      if (event.matches) stopReveals();
    }
    onHashChange();
    main.querySelectorAll('[data-scroll-reveal]').forEach(card => {
      if (card.contains(document.activeElement)) revealed.add(card);
      else if (!revealed.has(card)) observer.observe(card);
    });
    main.addEventListener('focusin', onCardFocus);
    main.addEventListener('click', onAnchorClick);
    window.addEventListener('hashchange', onHashChange);
    motionPreference.addEventListener('change', onMotionPreferenceChange);
    return () => {
      stopReveals();
      main.removeEventListener('focusin', onCardFocus);
      main.removeEventListener('click', onAnchorClick);
      window.removeEventListener('hashchange', onHashChange);
      motionPreference.removeEventListener('change', onMotionPreferenceChange);
    };
  }, [page]);

  useEffect(() => {
    function updateBackToTop() {
      const pastThreshold = window.scrollY >= 400;
      if (pastThreshold === pastScrollThresholdRef.current) return;
      pastScrollThresholdRef.current = pastThreshold;
      setShowBackToTop(pastThreshold);
    }
    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    window.addEventListener('pageshow', updateBackToTop);
    return () => {
      window.removeEventListener('scroll', updateBackToTop);
      window.removeEventListener('pageshow', updateBackToTop);
    };
  }, [page]);

  function backToTop() {
    const heading = mainRef.current?.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }

  useEffect(() => {
    if (previousPageRef.current === page) return;
    previousPageRef.current = page;
    const heading = mainRef.current?.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [page]);

  useEffect(() => {
    const onPopState = () => setPage(currentRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = page === 'why' ? 'Why it matters | Reclaim'
      : page === 'help' ? 'Get help | Reclaim'
      : 'Reclaim | Discovery lab';
  }, [page]);

  function navigate(event, destination) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (window.location.pathname !== destination) window.history.pushState({}, '', destination);
    setPage(currentRoute());
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  const [health, setHealth] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [methods, setMethods] = useState(['sha256']);
  const [methodNotice, setMethodNotice] = useState('');
  const [phashScope, setPhashScope] = useState('exploratory');
  const [results, setResults] = useState(null);
  const [queryLabel, setQueryLabel] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
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
    setMethodNotice('');
    if (methods.length === 1 && methods.includes(method)) {
      window.requestAnimationFrame(() => setMethodNotice('At least one matching method must remain selected.'));
    }
    setMethods(current => current.includes(method)
      ? (current.length === 1 ? current : current.filter(value => value !== method))
      : [...current, method]);
  }

  async function runSearch(file, label) {
    if (!file || loading) return;
    if (file.size > 8 * 1024 * 1024) {
      const message = 'Choose a demo image smaller than 8 MB.';
      if (error === message) flushSync(() => setError(''));
      setError(message); return;
    }
    setError(''); setLoading(true); setResults(null); setSelectedResult(null);
    try {
      const params = new URLSearchParams({ methods: methods.join(','), phash_scope: phashScope });
      const response = await fetch(`/api/search?${params.toString()}`, {
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
    setError('');
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

  const methodSummary = methods.includes('phash')
    ? (methods.includes('sha256') ? 'Exact + similar images' : 'Similar images')
    : 'Exact files';

  return (
    <div className="site">
      <a className="skip-link" href="#main-content" onClick={() => mainRef.current?.focus({ preventScroll: true })}>Skip to main content</a>
     <header className="nav">
  <a
    className="brand brand-link"
    href="/"
    onClick={event => navigate(event, '/')}
    aria-label="Reclaim home"
  >
    <img
  className="brand-logo"
  src={reclaimLogo}
  alt="RECLAIM"
/>

  </a>

  <nav className="nav-links" aria-label="Main navigation">
    <a href="/" aria-current={page === 'app' ? 'page' : undefined}
      onClick={event => navigate(event, '/')}>App</a>
    <a href="/why-it-matters"
      aria-current={page === 'why' ? 'page' : undefined}
      onClick={event => navigate(event, '/why-it-matters')}>Why it matters</a>
    <a href="/get-help"
      aria-current={page === 'help' ? 'page' : undefined}
      onClick={event => navigate(event, '/get-help')}>Get help</a>
  </nav>
</header>
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        {page === 'why' ? <WhyItMattersPage onNavigate={navigate} /> : page === 'help' ? <GetHelpPage /> : (
          <>
        <section className="hero" aria-labelledby="page-title" data-scroll-reveal>
  <h1 id="page-title">Reclaim</h1>

  <p className="lead">
    Helping survivors regain control of their digital lives
    with privacy, support, and the freedom to choose what
    happens next.
  </p>
</section>
        <div className="working-layout">
          <section className="panel controls-panel" aria-labelledby="search-heading" data-scroll-reveal>
            <div className="panel-head">
              <div>
                <p className="section-kicker">Discover</p>
                <h2 id="search-heading">Start with an image</h2>
                <p>Choose one of our sample images, or add a harmless test image of your own.</p>
              </div>
            </div>

            <div className="demo-row">
              {(demos.length ? demos : FALLBACK_DEMOS).map(demo => (
                <button className="demo-option" key={demo.id} aria-label={demo.label} onClick={() => runDemo(demo)} disabled={loading || !health || !catalog.length}>
                  <img src={demo.demo_url} alt="" />
                  <span>{demo.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            <input hidden ref={picker} type="file" accept="image/png,image/jpeg,image/webp" onChange={onChoose} />
            <button className="upload" onClick={() => picker.current?.click()} disabled={loading || !health || !catalog.length}>
              <span className="upload-icon" aria-hidden="true">+</span>
              <span><strong>Choose a test image</strong><small>PNG, JPG, or WebP • up to 8 MB</small></span>
            </button>

            <details className="method-details">
              <summary><span>Matching options</span><small>{methodSummary}</small></summary>
              <div className="methods" role="group" aria-label="Matching methods" aria-describedby="matching-method-instruction">
                <span id="matching-method-instruction" hidden>At least one matching method must remain selected.</span>
                <label className="method">
                  <input type="checkbox" checked={methods.includes('sha256')} onChange={() => toggleMethod('sha256')} />
                  <span><strong>Exact files</strong><small>Look for identical files (SHA-256).</small></span>
                </label>
                <label className="method">
                  <input type="checkbox" checked={methods.includes('phash')} onChange={() => toggleMethod('phash')} />
                  <span><strong>Similar images</strong><small>Find some resized or compressed copies (pHash).</small></span>
                </label>
              </div>
              <span role="status" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }}>{methodNotice}</span>
              {methods.includes('phash') && (
                <div className="phash-settings">
                  <label htmlFor="phash-scope">How broad should the comparison be?</label>
                  <select id="phash-scope" value={phashScope} onChange={event => { setPhashScope(event.target.value); setResults(null); }}>
                    <option value="close">Closer matches</option>
                    <option value="exploratory">Include less certain candidates</option>
                  </select>
                  <small>Broader comparisons may also show unrelated pictures. Every result needs review.</small>
                </div>
              )}
            </details>

            <p className="demo-note">This demonstration compares only approved sample images, not the live internet. Please don't upload intimate or sensitive material.</p>
            {error && <div className="error" role="alert">{error}</div>}
          </section>

          <section className="panel results-panel" aria-labelledby="results-heading" data-scroll-reveal>
            <div className="panel-head">
              <div>
                <p className="section-kicker purple">Review</p>
                <h2 id="results-heading">Possible matches</h2>
                <p>Take a look. You decide what to save.</p>
              </div>
            </div>
            {loading ? (
              <div className="empty" role="status"><div className="loading-ring" /><h3>Comparing images…</h3></div>
            ) : !results ? (
              <div className="empty"><div className="empty-glyph" aria-hidden="true">◎</div><h3>Your results will appear here</h3><p>Choose an image to start.</p></div>
            ) : (
              <>
                <div className="summary" role="status">
                  <div><h3>{results.results.length} possible match{results.results.length === 1 ? '' : 'es'}</h3><p>{queryLabel} • Local demo results only</p></div>
                </div>
                {results.results.length ? (
                  <div className="result-list">
                    {results.results.map((item, index) => (
                      <article className="result" key={item.id}>
                        <div className="result-thumb"><img src={item.demo_url} alt="" /></div>
                        <div className="result-body">
                          <span className={`verdict ${item.exact ? 'exact' : item.phash_tier === 'exploratory' ? 'low' : 'possible'}`}>
                            {item.exact ? 'Exact file' : item.phash_tier === 'close' ? 'Close visual match' : 'Possible visual match'}
                          </span>
                          <h3>{item.label}</h3>
                          <details className="match-details"><summary>Match details</summary>
                            <p>Methods: {item.matching_methods.join(', ')}</p>
                            {item.phash_distance != null && <p>pHash distance: {item.phash_distance} of 64</p>}
                            {item.openclip_cosine != null && <p>Embedding similarity: {item.openclip_cosine}</p>}
                            <p>Reference type: {item.kind}</p>
                          </details>
                          <button className="save-result-button" aria-label={`Save to vault: result ${index + 1}`} onClick={() => {
                            setSelectedResult(item);
                            window.requestAnimationFrame(() => {
                              document.getElementById('evidence-workspace')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                              savedEvidenceHeadingRef.current?.focus({ preventScroll: true });
                            });
                          }}>Save to vault <span aria-hidden="true">↓</span></button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty small"><h3>No matches in this demo collection</h3><p>That doesn't mean the image isn't somewhere else.</p></div>
                )}
                <p className="results-bottom">These are possible matches in a sample library, not confirmed findings on the internet.</p>
              </>
            )}
          </section>
        </div>

        <EvidenceWorkspace selectedResult={selectedResult} queryLabel={queryLabel} clearSelection={() => setSelectedResult(null)} savedEvidenceHeadingRef={savedEvidenceHeadingRef} />
          </>
        )}
      </main>
      <div className="back-to-top-placement" hidden={!showBackToTop && !backToTopFocused}>
        <button type="button" className="back-to-top" onClick={backToTop} onFocus={() => setBackToTopFocused(true)} onBlur={() => setBackToTopFocused(false)}>
          Back to top <span aria-hidden="true">↑</span>
        </button>
      </div>
      <footer><span>Reclaim / GDI Hackathon 2026</span><span>Demonstration using safe sample images</span></footer>
    </div>
  );
}

export default App;
