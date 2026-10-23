import { useState } from 'react';

const formatMatchupHistory = (matchups, bans, currentMatch) => {
  const rows = matchups.filter((m) => m.leftPlayer || m.rightPlayer);
  const leftWidth = Math.max(18, ...rows.map((m) => m.leftPlayer.length));
  const rightWidth = Math.max(13, ...rows.map((m) => m.rightPlayer.length));
  const scoreWidth = 11;
  const total = (side) => rows.reduce((sum, m) => sum + Number(m[`${side}Score`] || 0), 0);
  const country = (team) =>
    team.team.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  const banLines = bans
    .map((teamBans, index) => {
      const players = teamBans.filter(Boolean).join(', ');
      return players
        ? `${country(currentMatch[`team${index + 1}`])} bans ${players.toUpperCase()}`
        : '';
    })
    .filter(Boolean);
  const lines = rows.map(
    (m) =>
      `${m.leftPlayer.padEnd(leftWidth)} ${`${m.leftScore || 0} - ${m.rightScore || 0}`.padEnd(scoreWidth)}${m.rightPlayer.padStart(rightWidth)}`
  );

  return `\`\`\`\n${currentMatch.type.replace(/\r?\n/g, ' ')}\n\n${banLines.join('\n')}\n\n${lines.join('\n')}\n\nFinal score: ${country(currentMatch.team1)} (#${currentMatch.team1.seed || 'SEED'}) ${total('left')} - ${total('right')} ${country(currentMatch.team2)} (#${currentMatch.team2.seed || 'SEED'})\n\`\`\``;
};

const MatchupHistoryConfig = ({ value, onChange, teamPlayerNames }) => {
  const [exportStatus, setExportStatus] = useState('');

  const exportHistory = async () => {
    setExportStatus('');
    try {
      const savedConfig = JSON.parse(localStorage.getItem('ctl-player-overlay-config') || '{}');
      const currentMatch = savedConfig.matches?.[0];
      if (!currentMatch) throw new Error('Sync the current match before exporting.');
      const text = formatMatchupHistory(value.matchups, value.bans, currentMatch);
      await navigator.clipboard.writeText(text);
    } catch (error) {
      setExportStatus(error.message || 'Could not export matchup history.');
    }
  };

  const updateMatchup = (gameIndex, field, fieldValue) => {
    const matchups = value.matchups.map((matchup) => ({ ...matchup }));
    matchups[gameIndex][field] = fieldValue;
    onChange({ ...value, matchups });
  };

  return (
    <section className="matchup-history-config">
      <h3>
        Matchups{' '}
        <button type="button" onClick={exportHistory}>
          Copy to Clipboard
        </button>
        {exportStatus && <span role="alert">{exportStatus}</span>}
      </h3>
      <div className="matchup-teams-config">
        {Array.from({ length: 2 }, (_, teamIndex) => {
          const side = teamIndex === 0 ? 'left' : 'right';
          return (
            <div className="matchup-team-config" key={teamIndex}>
              <div className="matchup-team-rows-config">
                {value.matchups.map((matchup, gameIndex) => (
                  <div className="matchup-team-row" key={gameIndex}>
                    <label>
                      <select
                        name={`match-${gameIndex + 1}-${side}-player`}
                        value={matchup[`${side}Player`]}
                        onChange={(event) =>
                          updateMatchup(gameIndex, `${side}Player`, event.target.value)
                        }
                      >
                        <option value="">Game {gameIndex + 1} player</option>
                        {teamPlayerNames[teamIndex].map((name, playerIndex) =>
                          name ? (
                            <option key={`${name}-${playerIndex}`} value={name}>
                              {name}
                            </option>
                          ) : null
                        )}
                      </select>
                    </label>
                    <label>
                      <input
                        type="number"
                        step="any"
                        value={matchup[`${side}Score`]}
                        onChange={(event) =>
                          updateMatchup(gameIndex, `${side}Score`, event.target.value)
                        }
                        placeholder="0"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MatchupHistoryConfig;
