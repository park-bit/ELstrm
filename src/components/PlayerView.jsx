import { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import ChannelLogo from './ChannelLogo';
import { channelKey, isFavorite, toggleFavorite } from '../utils/storage';

export default function PlayerView({ channel, onBack, onFavoriteToggled }) {
  const [fav, setFav] = useState(() => isFavorite(channel));

  useEffect(() => {
    setFav(isFavorite(channel));
    // Re-check whenever the underlying channel identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey(channel)]);

  function handleToggleFavorite() {
    const next = toggleFavorite(channel);
    setFav(next);
    onFavoriteToggled?.(next);
  }

  return (
    <div className="player-page">
      <div className="player-page-header">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to channels
        </button>
        <button
          type="button"
          className={`fav-toggle ${fav ? 'active' : ''}`}
          onClick={handleToggleFavorite}
          aria-pressed={fav}
        >
          {fav ? '★ Favorited' : '☆ Add to favorites'}
        </button>
      </div>

      <div className="player-page-title">
        <ChannelLogo name={channel.name} logo={channel.logo} size={40} />
        <div>
          <h2 className="player-title">{channel.name}</h2>
          <p className="player-subtitle">{channel.group}</p>
        </div>
      </div>

      <div className="video-wrapper">
        <VideoPlayer sources={channel.sources} channelName={channel.name} />
      </div>
    </div>
  );
}
