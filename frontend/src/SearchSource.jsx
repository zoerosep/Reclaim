import './engine.css';

// Lets the person choose where a search looks: the bundled sample library, or the
// Unsplash test collection provided by the Python image-processing engine.
// The Unsplash option is only usable when the backend reports it is set up.
const CATEGORY_LABELS = {
  nature: 'Nature', landscape: 'Landscape', architecture: 'Architecture', flowers: 'Flowers',
  food: 'Food', technology: 'Technology', portrait: 'Portrait', animals: 'Animals',
};

export default function SearchSource({ health, source, onSourceChange, category, onCategoryChange, disabled }) {
  const unsplash = health?.unsplash;
  const ready = Boolean(unsplash?.available);
  const categories = unsplash?.categories?.length ? unsplash.categories : Object.keys(CATEGORY_LABELS);
  const notReadyReason = !health ? ''
    : !unsplash ? 'Update the Python backend to use the Unsplash test photos.'
    : unsplash.reason;

  return (
    <div className="source-settings">
      <label htmlFor="search-source">Where should we look?</label>
      <select id="search-source" value={ready ? source : 'local'} disabled={disabled} onChange={event => onSourceChange(event.target.value)}>
        <option value="local">Sample image library</option>
        <option value="unsplash" disabled={!ready}>Unsplash test photos{ready ? '' : ' (not set up yet)'}</option>
      </select>
      {ready && source === 'unsplash' && (
        <>
          <label htmlFor="unsplash-category">Photo category</label>
          <select id="unsplash-category" value={category} disabled={disabled} onChange={event => onCategoryChange(event.target.value)}>
            {categories.map(value => <option key={value} value={value}>{CATEGORY_LABELS[value] || value}</option>)}
          </select>
          <small>Your image is compared with the top Unsplash photos in this category. Your image stays on this computer; only the category word is sent to Unsplash.</small>
        </>
      )}
      {!ready && notReadyReason && <small>Unsplash test photos are off: {notReadyReason}</small>}
    </div>
  );
}
