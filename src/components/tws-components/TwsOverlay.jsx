import { useLayoutEffect, useRef, useState } from 'react';
import PlayerAvatar from '../shared/PlayerAvatar';
import LeagueStats from '../shared/LeagueStats';
import buildPlayerPositions from '../shared/buildPlayerPositions';
import TwsUsername from './TwsUsername';
import TwsMatchupHistory from '../shared/MatchupHistory';
import './TwsOverlay.css';

const TWS_FRAME_URL = `${import.meta.env.BASE_URL}tws/twsavatarframe.png`;

const TwsOverlay = ({ teams, scene, selectedPlayerIndices, preset, matchupHistory }) => {
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
      className={`ctl-overlay tws-overlay${scene === 'players-chosen' ? ' tws-overlay--focus-entering' : ''}${isLeavingFocus ? ' tws-overlay--focus-leaving' : ''}${scene === 'game-scene' ? ' tws-overlay--game-scene' : ''}`}
      style={{
        ...preset.css,
        '--default-icon-size': `${preset.layout.defaultSize}px`,
      }}
    >
      {teams.map((team, teamIndex) =>
        team.map((player, playerIndex) => {
          const focused =
            selectedPlayerIndices[teamIndex] === playerIndex && scene === 'players-chosen';
          const wasFocused =
            previouslyFocusedPlayers.current[teamIndex] === playerIndex && !focused;
          const onTop = focused || (wasFocused && isLeavingFocus);
          const teamColor = player.teamColor || 'white';
          return (
            <div
              className="ctl-player-card tws-player-card"
              key={`${teamIndex}-${playerIndex}`}
              style={{
                ...positions[teamIndex][playerIndex],
                zIndex: onTop ? 1 : undefined,
              }}
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
              <div className="tws-frame">
                <div className="tws-frame-stage">
                  <img className="tws-frame-image" src={TWS_FRAME_URL} alt="" />
                  <div className="tws-avatar-slot">
                    <PlayerAvatar
                      avatarUrl={player.avatarUrl}
                      teamColor={teamColor}
                      eliminated={player.eliminated}
                      banned={player.banned}
                      banIconPath={preset.banIconPath}
                      teamColorBorder={preset.teamColorBorder}
                    />
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
            </div>
          );
        })
      )}
      <TwsMatchupHistory matchups={matchupHistory?.matchups} />
    </main>
  );
};

export default TwsOverlay;
