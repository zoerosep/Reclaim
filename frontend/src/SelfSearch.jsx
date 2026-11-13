import { useId } from 'react';
import { SEARCH_ENGINES } from './lib/supportTools';
import './reporting.css';

// "Search this yourself": opens real search engines in a new tab.
// Reclaim sends nothing to them. The person chooses whether to upload anything there.
export default function SelfSearch({ onAddByHand }) {
  const newTabId = useId();
  return (
    <section className="panel self-search-panel" aria-labelledby="self-search-heading" data-scroll-reveal>
      <div className="panel-head">
        <div>
          <p className="section-kicker steel">Search wider</p>
          <h2 id="self-search-heading">Search the wider internet yourself</h2>
        </div>
      </div>
      <p className="platform-note self-search-privacy" role="note">
        <b>Reclaim sends nothing to these sites.</b> If you upload an image on one of them, it goes to that company, not to Reclaim. You decide what to share. An ordinary photo of your face, or a cropped version, can be enough to search with. No result on these sites does not mean an image is not online. They do not cover every website.
      </p>
      <ul className="self-search-list">
        {SEARCH_ENGINES.map(engine => (
          <li key={engine.id} className="self-search-item">
            <h3>{engine.name}</h3>
            <p>{engine.text}</p>
            <a className="outlined-button" href={engine.href} target="_blank" rel="noopener noreferrer" aria-describedby={newTabId}>
              Open {engine.name} <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <span id={newTabId} hidden>Opens in a new tab.</span>
      <div className="self-search-next">
        <p><strong>Found something?</strong> Keep the web address and your own notes in your vault. No image is saved.</p>
        <button type="button" className="primary-button" onClick={onAddByHand}>Add what you found to the vault <span aria-hidden="true">↓</span></button>
      </div>
    </section>
  );
}
