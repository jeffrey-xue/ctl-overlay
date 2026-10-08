import { useLayoutEffect, useRef, useState } from 'react';
import PlayerAvatar from '../shared/PlayerAvatar';
import LeagueStats from '../shared/LeagueStats';
import buildPlayerPositions from '../shared/buildPlayerPositions';
import TwsUsername from './TwsUsername';
import './TwsOverlay.css';

const TWS_FRAME_URL = `${import.meta.env.BASE_URL}twsavatarframe.png`;
const TWS_FRAME_ASPECT_RATIO = 351 / 395;

const TwsOverlay = ({ teams, scene, selectedPlayerIndices, preset }) => {
  const previouslyFocusedPlayers = useRef([-1, -1]);
  const previousScene = useRef(scene);
  const [isLeavingFocus, setIsLeavingFocus] = useState(false);
  const teamSizes = teams.map((team) => team.length);
  const positions = buildPlayerPositions(scene, teamSizes, selectedPlayerIndices, preset.layout);

  useLayoutEffect(() => {
    if (scene === 'players-chosen') {
      setIsLeavingFocus(false);
      previouslyFocusedPlayers.current = selectedPlayerIndices;
    } else if (previousScene.current === 'players-chosen') {
      setIsLeavingFocus(true);
    }

    previousScene.current = scene;
  }, [scene, selectedPlayerIndices]);

  return (
    <main
      className={`ctl-overlay tws-overlay${scene === 'players-chosen' ? ' tws-overlay--focus-entering' : ''}${isLeavingFocus ? ' tws-overlay--focus-leaving' : ''}`}
      style={{
        ...preset.css,
        '--default-icon-size': `${preset.layout.defaultSize}px`,
        '--tws-roster-avatar-size': `${preset.layout.defaultSize * 0.7}px`,
        '--tws-focused-avatar-size': `${preset.layout.focusedSize * 0.7}px`,
        '--tws-focused-content-width': `${preset.layout.focusedSize * 0.7 * 1.28 * TWS_FRAME_ASPECT_RATIO}px`,
      }}
    >
      {teams.map((team, teamIndex) =>
        team.map((player, playerIndex) => {
          const focused =
            selectedPlayerIndices[teamIndex] === playerIndex && scene === 'players-chosen';
          const wasFocused =
            previouslyFocusedPlayers.current[teamIndex] === playerIndex && !focused;
          const position = positions[teamIndex][playerIndex];
          const focusedPosition = position.width === preset.layout.focusedSize;
          const teamColor = player.teamColor || 'white';
          return (
            <div
              className={`ctl-player-card tws-player-card${focused ? ' tws-player-card--focused' : ''}`}
              key={`${teamIndex}-${playerIndex}`}
              style={position}
              onTransitionEnd={(event) => {
                if (
                  wasFocused &&
                  isLeavingFocus &&
                  event.target === event.currentTarget &&
                  ['top', 'left', 'right'].includes(event.propertyName)
                ) {
                  previouslyFocusedPlayers.current = [-1, -1];
                  setIsLeavingFocus(false);
                }
              }}
            >
              <div
                className={`tws-avatar-frame-container${focusedPosition ? ' tws-avatar-frame-container--focused' : ''}`}
              >
                <img className="tws-avatar-frame" src={TWS_FRAME_URL} />
                <div className="tws-avatar-content">
                  <div
                    className={`tws-avatar-size tws-avatar-size--${focusedPosition ? 'focused' : 'roster'}`}
                  >
                    <PlayerAvatar
                      avatarUrl={player.avatarUrl}
                      teamColor={teamColor}
                      eliminated={player.eliminated}
                      banned={player.banned}
                      banIconPath={preset.banIconPath}
                      teamColorBorder={preset.teamColorBorder}
                    />
                  </div>
                </div>
                <TwsUsername
                  name={player.name}
                  teamColor={teamColor}
                  teamIndex={teamIndex}
                  focused={focused}
                  eliminated={player.eliminated}
                >
                  <LeagueStats
                    leagueStats={player.leagueStats}
                    show={focused}
                    className={
                      teamIndex === 0 ? 'league-stats--left-player' : 'league-stats--right-player'
                    }
                  />
                </TwsUsername>
              </div>
            </div>
          );
        })
      )}
    </main>
  );
};

export default TwsOverlay;
