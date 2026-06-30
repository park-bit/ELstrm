import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';

const PLAYER_STATE = {
  LOADING: 'loading',
  PLAYING: 'playing',
  BUFFERING: 'buffering',
  SWITCHING: 'switching',
  ALL_FAILED: 'all_failed',
};

/**
 * Plays an HLS/IPTV stream with automatic fallback across a channel's
 * list of mirror source URLs. If the active source errors out fatally,
 * the next source in the list is tried automatically; if every source
 * fails, an "all sources failed" state is surfaced instead of a silent
 * black screen.
 */
export default function VideoPlayer({ sources, channelName, onAllSourcesFailed }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const sourceIndexRef = useRef(0);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [state, setState] = useState(PLAYER_STATE.LOADING);

  const safeSources = useMemo(
    () => (Array.isArray(sources) ? sources.filter(Boolean) : []),
    [sources]
  );

  const tryNextSource = useCallback(() => {
    const nextIndex = sourceIndexRef.current + 1;
    if (nextIndex >= safeSources.length) {
      setState(PLAYER_STATE.ALL_FAILED);
      onAllSourcesFailed?.();
      return;
    }
    sourceIndexRef.current = nextIndex;
    setSourceIndex(nextIndex);
    setState(PLAYER_STATE.SWITCHING);
  }, [safeSources.length, onAllSourcesFailed]);

  // Reset to the first source whenever the channel itself changes
  // (sources array identity changes when the user picks a new channel).
  useEffect(() => {
    sourceIndexRef.current = 0;
    setSourceIndex(0);
    setState(PLAYER_STATE.LOADING);
  }, [sources]);

  useEffect(() => {
    const video = videoRef.current;
    const url = safeSources[sourceIndex];
    if (!video || !url) {
      if (safeSources.length === 0) setState(PLAYER_STATE.ALL_FAILED);
      return;
    }

    let cancelled = false;

    const cleanupHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    cleanupHls();
    setState((prev) =>
      prev === PLAYER_STATE.SWITCHING ? PLAYER_STATE.SWITCHING : PLAYER_STATE.LOADING
    );

    const onPlaying = () => {
      if (!cancelled) setState(PLAYER_STATE.PLAYING);
    };
    const onWaiting = () => {
      if (!cancelled) setState((prev) => (prev === PLAYER_STATE.PLAYING ? PLAYER_STATE.BUFFERING : prev));
    };
    const onVideoError = () => {
      if (!cancelled) tryNextSource();
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('error', onVideoError);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, some Smart TVs)
      video.src = url;
      video.addEventListener('loadedmetadata', () => video.play().catch(() => {}));
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        startLevel: -1, // auto quality
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled) return;
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // One retry attempt on network hiccups before giving up on this source
              hls.startLoad();
              setTimeout(() => {
                if (!cancelled) tryNextSource();
              }, 4000);
              break;
            default:
              tryNextSource();
          }
        }
      });

      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      // No playback support at all for this stream type
      tryNextSource();
    }

    return () => {
      cancelled = true;
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('error', onVideoError);
      cleanupHls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceIndex, safeSources, tryNextSource]);

  const totalSources = safeSources.length;
  const showOverlay = state !== PLAYER_STATE.PLAYING;

  return (
    <div className="player-shell">
      <video ref={videoRef} controls playsInline className="player-video" />

      {showOverlay && (
        <div className="player-overlay">
          {state === PLAYER_STATE.ALL_FAILED ? (
            <>
              <div className="player-overlay-icon player-overlay-icon-error">!</div>
              <p className="player-overlay-title">Couldn't play {channelName || 'this channel'}</p>
              <p className="player-overlay-subtitle">
                {totalSources > 1
                  ? `All ${totalSources} sources for this channel are currently unreachable.`
                  : 'This channel has no working source right now.'}
              </p>
            </>
          ) : (
            <>
              <div className="player-spinner" aria-hidden="true" />
              <p className="player-overlay-title">
                {state === PLAYER_STATE.SWITCHING
                  ? `Trying alternate source (${sourceIndex + 1}/${totalSources})…`
                  : state === PLAYER_STATE.BUFFERING
                  ? 'Buffering…'
                  : 'Connecting…'}
              </p>
            </>
          )}
        </div>
      )}

      {state === PLAYER_STATE.PLAYING && (
        <div className="player-live-badge">
          <span className="player-live-dot" />
          LIVE
        </div>
      )}
    </div>
  );
}
