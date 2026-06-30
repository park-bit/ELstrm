import { useMemo } from 'react';
import ChannelLogo from './ChannelLogo';
import HeroBanner from './HeroBanner';
import { isFavorite } from '../utils/storage';
import { ALL_CATEGORY, FAVORITES_CATEGORY, getVisibleChannels } from '../utils/channelFilters';

export default function ChannelBrowser({
  channels,
  categories,
  selectedCategory,
  onSelectCategory,
  focusArea,
  focusIndex,
  onHoverCategory,
  onHoverChannel,
  onPickChannel,
  searchTerm,
  onSearchChange,
  favoritesVersion, // bump to force re-evaluating isFavorite()
  onBack,
}) {
  const filteredChannels = useMemo(
    () => getVisibleChannels({ channels, selectedCategory, searchTerm }),
    // favoritesVersion forces a recompute after a favorite is toggled, since
    // isFavorite() reads localStorage directly rather than React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, selectedCategory, searchTerm, favoritesVersion]
  );

  const featuredChannel = useMemo(() => {
    return channels.length > 0 ? channels[0] : null;
  }, [channels]);

  return (
    <div className="channel-browser">
      <aside className="category-sidebar">
        <div className="search-wrap">
          <input
            type="search"
            className="text-input search-input"
            placeholder="Search channels…"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <h2 className="sidebar-title">Categories</h2>
        <div className="category-list">
          <CategoryItem
            label={`All channels`}
            count={channels.length}
            active={selectedCategory === ALL_CATEGORY}
            focused={focusArea === 'categories' && focusIndex === 0}
            onClick={() => onSelectCategory(ALL_CATEGORY, 0)}
            onMouseEnter={() => onHoverCategory(0)}
          />
          <CategoryItem
            label="★ Favorites"
            count={channels.filter((c) => isFavorite(c)).length}
            active={selectedCategory === FAVORITES_CATEGORY}
            focused={focusArea === 'categories' && focusIndex === 1}
            onClick={() => onSelectCategory(FAVORITES_CATEGORY, 1)}
            onMouseEnter={() => onHoverCategory(1)}
          />
          {categories.map((category, i) => (
            <CategoryItem
              key={category}
              label={category}
              active={selectedCategory === category}
              focused={focusArea === 'categories' && focusIndex === i + 2}
              onClick={() => onSelectCategory(category, i + 2)}
              onMouseEnter={() => onHoverCategory(i + 2)}
            />
          ))}
        </div>
      </aside>

      <main className="channel-grid-container">
        {selectedCategory === ALL_CATEGORY && !searchTerm && (
          <HeroBanner featuredChannel={featuredChannel} onPlay={(c) => onPickChannel(c, 0)} />
        )}
        <h2 className="page-title channel-grid-heading">
          {selectedCategory === ALL_CATEGORY
            ? 'All channels'
            : selectedCategory === FAVORITES_CATEGORY
            ? 'Favorites'
            : selectedCategory}{' '}
          <span className="count-pill">{filteredChannels.length}</span>
        </h2>

        {filteredChannels.length === 0 ? (
          <EmptyState
            isSearch={Boolean(searchTerm.trim())}
            isFavorites={selectedCategory === FAVORITES_CATEGORY}
          />
        ) : (
          <div className="channel-grid">
            {filteredChannels.map((channel, index) => (
              <button
                type="button"
                key={`${channel.name}-${channel.group}-${index}`}
                className={`channel-card ${
                  focusArea === 'channels' && focusIndex === index ? 'focused' : ''
                }`}
                onClick={() => onPickChannel(channel, index)}
                onMouseEnter={() => onHoverChannel(index)}
              >
                <ChannelLogo name={channel.name} logo={channel.logo} />
                <span className="channel-name">{channel.name}</span>
                {channel.sources.length > 1 && (
                  <span className="mirror-pill" title={`${channel.sources.length} sources available`}>
                    {channel.sources.length} sources
                  </span>
                )}
                {isFavorite(channel) && <span className="fav-indicator">★</span>}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryItem({ label, count, active, focused, onClick, onMouseEnter }) {
  return (
    <button
      type="button"
      className={`category-item ${active ? 'selected' : ''} ${focused ? 'focused' : ''}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <span>{label}</span>
      {typeof count === 'number' && <span className="category-count">{count}</span>}
    </button>
  );
}

function EmptyState({ isSearch, isFavorites }) {
  if (isSearch) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No channels match your search</p>
        <p className="empty-state-subtitle">Try a different name or clear the search box.</p>
      </div>
    );
  }
  if (isFavorites) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No favorites yet</p>
        <p className="empty-state-subtitle">
          Open a channel and press the star button to add it here.
        </p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <p className="empty-state-title">No channels in this category</p>
    </div>
  );
}
