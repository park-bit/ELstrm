import { useState, useRef, useEffect } from 'react';
import { useGridNavigation } from '../hooks/useGridNavigation';

const COLUMNS = 4;

const KIND_LABEL = {
  country: 'Country',
  category: 'Category',
  language: 'Language',
  custom: 'Custom',
};

export default function SourcePicker({
  sources,
  customSources,
  onSelect,
  onAddCustom,
  onRemoveCustom,
  loadingSourceId,
  errorMessage,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [formError, setFormError] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const allCards = [
    ...sources.map((s) => ({ ...s, custom: false })),
    ...customSources.map((s) => ({ ...s, custom: true })),
  ];

  const [focusIndex, move, setFocusIndex] = useGridNavigation(
    allCards.length + 1, // +1 for the "add source" card
    COLUMNS
  );

  function handleKeyDown(e) {
    if (showAddForm) return;
    switch (e.key) {
      case 'ArrowRight':
        move('right');
        break;
      case 'ArrowLeft':
        move('left');
        break;
      case 'ArrowDown':
        move('down');
        break;
      case 'ArrowUp':
        move('up');
        break;
      case 'Enter':
        if (focusIndex === allCards.length) {
          setShowAddForm(true);
        } else {
          onSelect(allCards[focusIndex]);
        }
        break;
      default:
        break;
    }
  }

  function submitCustomSource(e) {
    e.preventDefault();
    const trimmedUrl = draftUrl.trim();
    if (!trimmedUrl) {
      setFormError('Enter a playlist URL.');
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setFormError('URL must start with http:// or https://');
      return;
    }
    onAddCustom({ name: draftName.trim(), url: trimmedUrl });
    setDraftName('');
    setDraftUrl('');
    setFormError('');
    setShowAddForm(false);
    containerRef.current?.focus();
  }

  return (
    <div className="source-picker" ref={containerRef} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="section-header">
        <h1 className="page-title">Choose a source</h1>
        <p className="page-subtitle">
          Free, publicly listed playlists. Add your own M3U URL for anything else.
        </p>
      </div>

      {errorMessage && <div className="banner banner-error">{errorMessage}</div>}

      <div className="grid source-grid">
        {allCards.map((source, index) => (
          <button
            type="button"
            key={source.id}
            className={`card source-card ${focusIndex === index ? 'focused' : ''}`}
            onClick={() => onSelect(source)}
            onMouseEnter={() => setFocusIndex(index)}
          >
            <div className="card-top-row">
              <span className="badge">{KIND_LABEL[source.kind] || 'Source'}</span>
              {source.custom && (
                <span
                  className="card-remove"
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveCustom(source.id);
                  }}
                  aria-label={`Remove ${source.name}`}
                >
                  ✕
                </span>
              )}
            </div>
            <h3 className="card-title">{source.name}</h3>
            <p className="card-subtitle">{source.description || source.url}</p>
            {loadingSourceId === source.id && (
              <div className="card-loading-bar" aria-hidden="true" />
            )}
          </button>
        ))}

        <button
          type="button"
          className={`card source-card add-source-card ${
            focusIndex === allCards.length ? 'focused' : ''
          }`}
          onClick={() => setShowAddForm(true)}
          onMouseEnter={() => setFocusIndex(allCards.length)}
        >
          <span className="add-source-icon" aria-hidden="true">+</span>
          <span className="card-title">Add your own M3U</span>
          <span className="card-subtitle">Paste a playlist URL</span>
        </button>
      </div>

      {showAddForm && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowAddForm(false);
            containerRef.current?.focus();
          }}
        >
          <form
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitCustomSource}
          >
            <h2 className="modal-title">Add a custom playlist</h2>
            <label className="field-label">
              Name (optional)
              <input
                className="text-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="My playlist"
                autoFocus
              />
            </label>
            <label className="field-label">
              M3U / M3U8 URL
              <input
                className="text-input"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="https://example.com/playlist.m3u"
              />
            </label>
            {formError && <p className="field-error">{formError}</p>}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowAddForm(false);
                  containerRef.current?.focus();
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add source
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
