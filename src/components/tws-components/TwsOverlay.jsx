import PlayerAvatar from '../shared/PlayerAvatar';
import LeagueStats from '../shared/LeagueStats';
import buildPlayerPositions from '../shared/buildPlayerPositions';
import './TwsOverlay.css';

const TWS_FRAME_URL = `${import.meta.env.BASE_URL}twsavatarframe.png`;

const TwsOverlay = ({ teams, scene, selectedPlayerIndices, preset }) => {
  const teamSizes = teams.map((team) => team.length);
  const positions = buildPlayerPositions(scene, teamSizes, selectedPlayerIndices, preset.layout);

  return (
    <main
      className={`ctl-overlay tws-overlay${preset.animateNames ? ' tws-overlay--animate-names' : ''}`}
      style={{
        ...preset.css,
        '--default-icon-size': `${preset.layout.defaultSize}px`,
      }}
    >
      {teams.map((team, teamIndex) =>
        team.map((player, playerIndex) => {
          const focused =
            selectedPlayerIndices[teamIndex] === playerIndex && scene === 'players-chosen';
          const position = positions[teamIndex][playerIndex];
          const focusedPosition = position.width === preset.layout.focusedSize;
          const teamColor = player.teamColor || 'white';
          return (
            <div
              className="ctl-player-card tws-player-card"
              key={`${teamIndex}-${playerIndex}`}
              style={position}
            >
              <div
                className={`tws-avatar-frame-container${focusedPosition ? ' tws-avatar-frame-container--focused' : ''}`}
              >
                <img className="tws-avatar-frame" src={TWS_FRAME_URL} alt="" aria-hidden="true" />
                <div className="tws-avatar-content">
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
              <div
                className={`ctl-player-name${focused ? ' is-focused' : ''}`}
                style={{ opacity: player.eliminated ? 0.6 : 1 }}
              >
                <svg
                  width="200%"
                  height="200%"
                  viewBox="0 0 1000 75"
                  preserveAspectRatio="xMinYMid meet"
                >
                  <text
                    x="50%"
                    y="50%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize="75"
                    fontWeight="bold"
                    fill={teamColor}
                  >
                    {player.name}
                  </text>
                </svg>
              </div>
              <LeagueStats
                leagueStats={player.leagueStats}
                show={focused}
                className={
                  teamIndex === 0 ? 'league-stats--left-player' : 'league-stats--right-player'
                }
              />
              <div
                className={`ctl-player-blurb${focused ? ' is-focused' : ''}`}
                style={{
                  display: player.blurb ? 'block' : 'none',
                  borderBottom: `solid 5px ${teamColor}`,
                  borderTop: `solid 5px ${teamColor}`,
                }}
              >
                {player.blurb}
              </div>
            </div>
          );
        })
      )}
    </main>
  );
};

export default TwsOverlay;
