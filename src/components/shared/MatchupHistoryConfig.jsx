import { useState } from 'react';
import { getMatchupScores } from '../../util/matchupScores.js';
import { formatMatchupHistory } from '../../util/formatMatchupHistory.mjs';

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
        <span style={{textAlign: "right", right: "13px", position: "absolute", title:"Toggle Purchase Counterpick"}}>C</span>
      </h3>
      <p id="counterpick-help" className="counterpick-help">
      </p>
      <div className="matchup-rows-config">
        {value.matchups.map((matchup, gameIndex) => {
          const { canCounterpick } = getMatchupScores(matchup);
          return (
            <div className="matchup-config-row" key={gameIndex}>
              <div className="matchup-teams-config">
                {['left', 'right'].map((side, teamIndex) => (
                  <div className="matchup-team-row" key={side}>
                    <select
                      aria-label={`Game ${gameIndex + 1} Team ${teamIndex + 1} player`}
                      name={`match-${gameIndex + 1}-${side}-player`}
                      value={matchup[`${side}Player`]}
                      onChange={(event) =>
                        updateMatchup(gameIndex, `${side}Player`, event.target.value)
                      }
                    >
                      <option value="">Game {gameIndex + 1} player</option>
                      {teamPlayerNames[teamIndex].map((name, playerIndex) =>
                        name ? (
                          <option key={playerIndex} value={name}>
                            {name}
                          </option>
                        ) : null
                      )}
                    </select>
                    <input
                      aria-label={`Game ${gameIndex + 1} Team ${teamIndex + 1} original score`}
                      type="number"
                      step="any"
                      value={matchup[`${side}Score`]}
                      onChange={(event) =>
                        updateMatchup(gameIndex, `${side}Score`, event.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <label className="counterpick-control">
                <input
                  type="checkbox"
                  aria-label={`Game ${gameIndex + 1} counterpick bought`}
                  aria-describedby="counterpick-help"
                  checked={matchup.counterpickBought ?? false}
                  disabled={!canCounterpick && !matchup.counterpickBought}
                  onChange={(event) =>
                    updateMatchup(gameIndex, 'counterpickBought', event.target.checked)
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MatchupHistoryConfig;
