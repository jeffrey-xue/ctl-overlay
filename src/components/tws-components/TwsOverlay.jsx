import PlayerAvatar from '../shared/PlayerAvatar';
import LeagueStats from '../shared/LeagueStats';
import buildPlayerPositions from '../shared/buildPlayerPositions';
import './TwsOverlay.css';

const TwsOverlay = ({ teams, scene, selectedPlayerIndices, preset }) => {
  const teamSizes = teams.map((team) => team.length);
  const positions = buildPlayerPositions(scene, teamSizes, selectedPlayerIndices, preset.layout);

  return (
    <main
      className={`ctl-overlay tws-overlay${preset.animateNames ? ' ctl-overlay--animate-names' : ''}`}
      style={{
        ...preset.css,
        '--default-icon-size': `${preset.layout.defaultSize}px`,
      }}
    >
      {teams.map((team, teamIndex) =>
        team.map((player, playerIndex) => {
          const focused =
            selectedPlayerIndices[teamIndex] === playerIndex && scene === 'players-chosen';
          const teamColor = player.teamColor || 'white';
          return (
            <div
              className="ctl-player-card tws-player-card"
              key={`${teamIndex}-${playerIndex}`}
              style={positions[teamIndex][playerIndex]}
            >
              <PlayerAvatar
                avatarUrl={player.avatarUrl}
                teamColor={teamColor}
                eliminated={player.eliminated}
                banned={player.banned}
                banIconPath={preset.banIconPath}
                iconBorder={preset.iconBorder}
              />
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
