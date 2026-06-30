import { useState, useEffect } from 'react';

export default function ChannelLogo({ name, logo, size = 56 }) {
  const [failed, setFailed] = useState(false);

  // Reset the failure flag whenever the logo URL itself changes (e.g.
  // switching channels in the player view re-renders this component
  // in place rather than remounting it).
  useEffect(() => {
    setFailed(false);
  }, [logo]);

  const showImage = logo && !failed;

  return (
    <div className="channel-logo-wrap" style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={logo}
          alt=""
          className="channel-logo-img"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="channel-logo-fallback-text">
          {(name || '?').trim().slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
