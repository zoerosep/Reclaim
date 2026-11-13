import './engine.css';

// Shows what the Python image-processing engine reported for the image that was
// searched with (POST /api/analyze). Read on this computer; nothing is saved.
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function show(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export default function ImageDetails({ analysis }) {
  if (!analysis) return null;
  if (analysis.status !== 'completed') {
    return <p className="image-details-unavailable">Image details could not be read for this image.</p>;
  }
  const { image_info: info = {}, image_analysis: look = {}, hashes = {}, metadata = {} } = analysis;
  const entries = Object.entries(metadata.metadata || {});
  const hasLocation = entries.some(([key]) => /gps/i.test(key));
  const fingerprints = [['pHash', hashes.phash], ['dHash', hashes.dhash], ['aHash', hashes.ahash]].filter(([, value]) => value);

  return (
    <details className="match-details image-details">
      <summary>About the image you searched with</summary>
      <p>File: {[info.format, info.width && `${info.width} × ${info.height}`, formatBytes(info.size), info.mode].filter(Boolean).join(' • ')}</p>
      {look.file_readable && <p>Brightness: {look.average_brightness} of 255 • Contrast: {look.average_contrast}</p>}
      {fingerprints.length > 0 && (
        <p>Fingerprints: {fingerprints.map(([name, value], index) => <span key={name}>{index ? ' • ' : ''}{name} <code>{value}</code></span>)}</p>
      )}
      <p>
        Metadata: {entries.length ? `${entries.length} field${entries.length === 1 ? '' : 's'} read` : 'none found'}
        {metadata.reader ? ` (${metadata.reader === 'exiftool' ? 'ExifTool' : 'basic reader'})` : ''}
      </p>
      {hasLocation && <p className="image-details-flag">This file contains GPS location fields.</p>}
      {metadata.note && <p>{metadata.note}</p>}
      {entries.length > 0 && (
        <details className="image-metadata">
          <summary>Show metadata fields</summary>
          <dl>
            {entries.map(([key, value]) => (
              <div key={key}><dt>{key}</dt><dd>{show(value)}</dd></div>
            ))}
          </dl>
        </details>
      )}
      <p className="image-details-footnote">Read on this computer by the Python image processor. Not saved.</p>
    </details>
  );
}
