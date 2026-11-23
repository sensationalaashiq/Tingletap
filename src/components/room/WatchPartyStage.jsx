import React, { useMemo, useState } from 'react';
import { buildWotchlyUrl } from '../../utils/roomModulesConfig';
import {
  WatchPartyStageIcon,
  TheaterExpandIcon,
  SyncReloadIcon,
  ExitWatchIcon,
} from '../icons/LuxuryModuleIcons';
import './WatchPartyStage.css';

const WatchPartyStage = ({
  roomId,
  roomName,
  username,
  expanded = false,
  onToggleExpand,
  chatCollapsedMobile = false,
  onToggleMobileChat,
  onExit,
}) => {
  const [reloadKey, setReloadKey] = useState(0);

  const wotchlySrc = useMemo(
    () => buildWotchlyUrl(roomId, username),
    [roomId, username]
  );

  return (
    <section
      className={`tt-watch-stage${expanded ? ' is-expanded' : ''}`}
      aria-label="Sync Watch Party Theater"
    >
      <div className="tt-watch-bar">
        <div className="tt-watch-title">
          <WatchPartyStageIcon size={16} color="#c084fc" />
          <span>Watch Party</span>
          <span className="tt-watch-room-pill">
            {roomName || roomId}
          </span>
        </div>

        <div className="tt-watch-controls">
          {onToggleMobileChat && (
            <button
              type="button"
              className="tt-watch-ctrl-btn tt-watch-mobile-toggle"
              onClick={onToggleMobileChat}
              title={chatCollapsedMobile ? 'Expand Live Chat' : 'Minimize Live Chat'}
            >
              <span>{chatCollapsedMobile ? 'Show Chat' : 'Hide Chat'}</span>
            </button>
          )}

          <button
            type="button"
            className="tt-watch-ctrl-btn"
            onClick={onToggleExpand}
            title={expanded ? 'Standard View' : 'Theater Expand'}
          >
            <TheaterExpandIcon expanded={expanded} size={13} />
            <span className="tt-watch-ctrl-label">
              {expanded ? 'Standard' : 'Expand'}
            </span>
          </button>

          <button
            type="button"
            className="tt-watch-ctrl-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Sync Reload Stream"
          >
            <SyncReloadIcon size={13} />
            <span className="tt-watch-ctrl-label">Sync Reload</span>
          </button>

          <button
            type="button"
            className="tt-watch-ctrl-btn is-exit"
            onClick={onExit}
            title="Exit Watch Mode"
          >
            <ExitWatchIcon size={13} />
            <span className="tt-watch-ctrl-label">Exit</span>
          </button>
        </div>
      </div>

      <div className="tt-watch-frame-wrap">
        <iframe
          key={`${roomId}-${reloadKey}`}
          src={wotchlySrc}
          className="tt-watch-iframe"
          title={`Tingletap Watch Party - ${roomName || roomId}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-popups-to-escape-sandbox"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
        />
      </div>
    </section>
  );
};

export default React.memo(WatchPartyStage);
