import React, { useState, useEffect } from 'react';

export default function HeroBanner({ featuredChannel, onPlay }) {
  const [showBackdrop, setShowBackdrop] = useState(false);

  useEffect(() => {
    // Staggered reveal of backdrop
    setShowBackdrop(false);
    const timer = setTimeout(() => setShowBackdrop(true), 100);
    return () => clearTimeout(timer);
  }, [featuredChannel]);

  if (!featuredChannel) return null;

  return (
    <div className="hero-banner">
      <div className={`hero-backdrop ${showBackdrop ? 'visible' : ''}`}>
        {/* If the channel has a logo, we can use it as a blurred background or side image */}
        {featuredChannel.logo && (
          <img src={featuredChannel.logo} alt="hero bg" className="hero-bg-img" />
        )}
        <div className="hero-gradient" />
      </div>
      
      <div className="hero-content">
        <h1 className="hero-title">{featuredChannel.name}</h1>
        <p className="hero-description">
          {featuredChannel.group || 'Live TV'} • {featuredChannel.url ? 'HD' : 'SD'}
        </p>
        <button 
          className="hero-play-btn focusable card-focused" 
          onClick={() => onPlay(featuredChannel)}
        >
          ▶ Play Now
        </button>
      </div>
    </div>
  );
}
