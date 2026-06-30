import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import SettingsView from './components/SettingsView';
import ChannelBrowser from './components/ChannelBrowser';
import PlayerView from './components/PlayerView';
import { useGridNavigation } from './hooks/useGridNavigation';
import { fetchUnifiedPlaylist, ApiError } from './utils/api';
import { ALL_CATEGORY, getVisibleChannels } from './utils/channelFilters';
import {
  getCustomSources,
  getLastWatched,
  setLastWatched,
} from './utils/storage';

const CHANNEL_GRID_COLUMNS = 4;

function App() {
  const [view, setView] = useState('loading'); // 'loading' | 'channels' | 'player' | 'settings'
  const [customSources, setCustomSources] = useState(() => getCustomSources());
  const [sourceError, setSourceError] = useState('');

  const [channels, setChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoritesVersion, setFavoritesVersion] = useState(0);

  const [activeChannel, setActiveChannel] = useState(null);
  const [continueWatching, setContinueWatching] = useState(() => getLastWatched());

  // focusArea: 'categories' | 'channels' | 'sidebar'
  const [focusArea, setFocusArea] = useState('sidebar');
  const [categoryFocusIndex, setCategoryFocusIndex] = useState(0);
  const [sidebarFocused, setSidebarFocused] = useState(true);

  const visibleChannelCount = useMemo(
    () => getVisibleChannels({ channels, selectedCategory, searchTerm }).length,
    // favoritesVersion forces a recompute after a favorite is toggled, since
    // isFavorite() reads localStorage directly rather than React state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, selectedCategory, searchTerm, favoritesVersion]
  );
  const [channelFocusIndex, moveChannelFocus, setChannelFocusIndex] = useGridNavigation(
    visibleChannelCount,
    CHANNEL_GRID_COLUMNS
  );
  const totalCategoryItems = categories.length + 2; // All + Favorites + each category
  const [, moveCategoryFocus] = useGridNavigation(totalCategoryItems, 1);

  useEffect(() => {
    async function loadUnified() {
      try {
        const data = await fetchUnifiedPlaylist(customSources);
        setChannels(data.channels);
        setCategories(data.categories);
        setView('channels');
        setFocusArea('categories');
        setCategoryFocusIndex(0);
        setChannelFocusIndex(0);
      } catch (err) {
        setSourceError(
          err instanceof ApiError ? err.message : 'Failed to load unified playlist'
        );
      }
    }
    loadUnified();
  }, [customSources, setChannelFocusIndex]);

  function handleSelectCategory(category, index) {
    setSelectedCategory(category);
    setCategoryFocusIndex(index);
    setFocusArea('categories');
    setChannelFocusIndex(0);
  }

  function openChannel(channel) {
    setActiveChannel(channel);
    setLastWatched(channel, null);
    setContinueWatching(getLastWatched());
    setView('player');
  }

  function handlePickChannel(channel, index) {
    setChannelFocusIndex(index);
    openChannel(channel);
  }

  async function handleResumeLastWatched() {
    if (!continueWatching) return;
    const { channel } = continueWatching;
    openChannel(channel);
  }

  function handleExitPlayer() {
    setActiveChannel(null);
    setView('channels');
    setFocusArea('channels');
  }

  const handleKeyDown = useCallback(
    (e) => {
      const target = e.target;
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isTypingTarget) return;

      if (view === 'channels') {
        if (focusArea === 'sidebar') {
          if (e.key === 'ArrowRight') {
            setFocusArea('categories');
          }
          // handle up/down within sidebar later
        } else if (focusArea === 'categories') {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            moveCategoryFocus(e.key === 'ArrowDown' ? 'down' : 'up');
          }
          if (e.key === 'ArrowRight') {
            setFocusArea('channels');
          }
          if (e.key === 'ArrowLeft') {
            setFocusArea('sidebar');
          }
          if (e.key === 'Backspace' || e.key === 'Escape') {
            // no longer switch to 'sources', maybe just exit or do nothing
          }
        } else if (focusArea === 'channels') {
          if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            const hitEdge = moveChannelFocus(
              { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' }[e.key]
            );
            // If moved left but we are on the left edge, go back to categories
            // wait, moveChannelFocus doesn't return edge hit currently. Let's just handle Escape to go back
          }
          if (e.key === 'Backspace' || e.key === 'Escape') {
            setFocusArea('categories');
          }
        }
      } else if (view === 'player') {
        if (e.key === 'Backspace' || e.key === 'Escape') {
          handleExitPlayer();
        }
      }
    },
    [view, focusArea, moveCategoryFocus, moveChannelFocus]
  );

  // Channel grid Enter key needs the current focused channel; uses the
  // same shared filter logic as ChannelBrowser so focus index and the
  // rendered grid can never disagree about what's selected.
  useEffect(() => {
    function onEnter(e) {
      if (e.key !== 'Enter') return;
      const target = e.target;
      const isTypingTarget =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isTypingTarget) return;
      if (view !== 'channels' || focusArea !== 'channels') return;
      const visible = getVisibleChannels({ channels, selectedCategory, searchTerm });
      const channel = visible[channelFocusIndex];
      if (channel) openChannel(channel);
    }
    window.addEventListener('keydown', onEnter);
    return () => window.removeEventListener('keydown', onEnter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, focusArea, channels, selectedCategory, searchTerm, favoritesVersion, channelFocusIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="dashboard dashboard-with-sidebar">
      <Sidebar 
        isFocused={focusArea === 'sidebar'} 
        onFocus={() => setFocusArea('sidebar')} 
        currentView={view} 
        onNavigate={(v) => {
          setView(v);
          setFocusArea('channels'); // Or wherever appropriate
        }} 
      />

      <main className="main-content">
        {view === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '20px' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-strong)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h2>Loading Channels...</h2>
            {sourceError && <p className="banner banner-error">{sourceError}</p>}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {view === 'channels' && (
          <ChannelBrowser
            channels={channels}
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            focusArea={focusArea}
            focusIndex={focusArea === 'categories' ? categoryFocusIndex : channelFocusIndex}
            onHoverCategory={(i) => {
              setFocusArea('categories');
              setCategoryFocusIndex(i);
            }}
            onHoverChannel={(i) => {
              setFocusArea('channels');
              setChannelFocusIndex(i);
            }}
            onPickChannel={handlePickChannel}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            favoritesVersion={favoritesVersion}
            onBack={() => setView('sources')}
          />
        )}

        {view === 'player' && activeChannel && (
          <PlayerView
            channel={activeChannel}
            onBack={handleExitPlayer}
            onFavoriteToggled={() => setFavoritesVersion((v) => v + 1)}
          />
        )}

        {view === 'settings' && (
          <SettingsView 
            onClearDefault={() => {
              setView('sources');
            }}
          />
        )}
      </main>
    </div>
  );
}

function ContinueWatchingBanner({ channel, onResume }) {
  return (
    <button type="button" className="continue-watching" onClick={onResume}>
      <span className="continue-watching-label">Continue watching</span>
      <span className="continue-watching-name">{channel.name}</span>
      <span className="continue-watching-cta">Resume ▶</span>
    </button>
  );
}

function BrandMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 3H3C1.89543 3 1 3.89543 1 5V15C1 16.1046 1.89543 17 3 17H8V21H16V17H21C22.1046 17 23 16.1046 23 15V5C23 3.89543 22.1046 3 21 3Z"
        stroke="#a78bfa"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21V17M14 21V17"
        stroke="#a78bfa"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default App;
