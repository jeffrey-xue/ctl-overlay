const MatchupHistoryConfig = ({ value, onChange, teamPlayerNames }) => {
  const updateBan = (teamIndex, banIndex, name) => {
    const bans = value.bans.map((teamBans) => [...teamBans]);
    bans[teamIndex][banIndex] = name;
    onChange({ ...value, bans });
  };

  const updateMatchup = (gameIndex, field, fieldValue) => {
    const matchups = value.matchups.map((matchup) => ({ ...matchup }));
    matchups[gameIndex][field] = fieldValue;
    onChange({ ...value, matchups });
  };

  return (
    <section className="matchup-history-config">
      <h3>Previous Matchups</h3>
      <div className="matchup-teams-config">
        {value.bans.map((teamBans, teamIndex) => {
          const side = teamIndex === 0 ? 'left' : 'right';
          return (
            <div className="matchup-team-config" key={teamIndex}>
              {/* <div className="matchup-team-bans-config">
                {teamBans.map((ban, banIndex) => (
                  <label key={banIndex}>
                    Ban {banIndex + 1}
                    <select
                      name={`ban-team-${teamIndex + 1}-${banIndex + 1}`}
                      value={ban}
                      onChange={(event) => updateBan(teamIndex, banIndex, event.target.value)}
                    >
                      <option value="">Select player</option>
                      {teamPlayerNames[teamIndex].map((name, playerIndex) =>
                        name ? (
                          <option key={`${name}-${playerIndex}`} value={name}>
                            {name}
                          </option>
                        ) : null
                      )}
                    </select>
                  </label>
                ))}
              </div> */}
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
