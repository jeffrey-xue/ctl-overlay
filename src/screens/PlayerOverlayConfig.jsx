import { useEffect, useState } from 'react';
import { PRESETS } from '../config/presets';
import MatchupHistoryConfig from '../components/shared/MatchupHistoryConfig';
import { setMatchupScores } from '../util/obs';
import useObsConnection from '../hooks/useObsConnection';
import {
  MIN_START_ROW,
  guessStartRow,
  sendMatchesToObs,
  syncGoogleSheet as syncGoogleSheetData,
} from '../util/googleSheets';

const createEmptyMatchupHistory = () => ({
  bans: [
    ['', ''],
    ['', ''],
  ],
  matchups: Array.from({ length: 5 }, () => ({
    leftPlayer: '',
    leftScore: '',
    rightScore: '',
    rightPlayer: '',
  })),
});

const createEmptyPlayerData = () => [
  [{}, {}, {}, {}, {}],
  [{}, {}, {}, {}, {}],
];

const normalizeStartRow = (value) => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(MIN_START_ROW, parsed) : MIN_START_ROW;
};

const samePlayerName = (left, right) =>
  (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();

const applyBanState = (players, bans) =>
  players.map((team, teamIndex) =>
    team.map((player) => ({
      ...player,
      banned: bans[teamIndex].some((name) => name && samePlayerName(name, player.name)),
    }))
  );

const matchupHistoryForRoster = (history, playerData) => {
  const teamNames = playerData.map(
    (team) => new Set(team.map((player) => player.name?.trim().toLowerCase()).filter(Boolean))
  );

  return {
    ...history,
    bans: history.bans.map((teamBans, teamIndex) =>
      teamBans.map((ban) => (teamNames[teamIndex].has(ban?.trim().toLowerCase()) ? ban : ''))
    ),
    matchups: history.matchups.map((matchup) => ({
      ...matchup,
      leftPlayer: teamNames[0].has(matchup.leftPlayer?.trim().toLowerCase())
        ? matchup.leftPlayer
        : '',
      rightPlayer: teamNames[1].has(matchup.rightPlayer?.trim().toLowerCase())
        ? matchup.rightPlayer
        : '',
    })),
  };
};

const addPlayerBansToHistory = (history, playerData) => ({
  ...history,
  bans: history.bans.map((teamBans, teamIndex) => {
    const bans = [...teamBans];
    playerData[teamIndex].forEach((player) => {
      const name = player.name?.trim();
      if (!player.banned || !name || bans.some((ban) => samePlayerName(ban, name))) return;
      const emptySlot = bans.indexOf('');
      if (emptySlot === -1) bans.push(name);
      else bans[emptySlot] = name;
    });
    return bans;
  }),
});

const teamFromRoster = (team, roster) =>
  team.map((_, playerIndex) => {
    const name = roster[playerIndex];
    if (!name) return {};
    return { ...team.find((player) => samePlayerName(player.name, name)), name };
  });

const configSnapshot = ({
  playerData,
  selectedPlayerIndices,
  teamColors,
  presetId,
  showBans,
  matchupHistory,
}) =>
  JSON.stringify({
    playerData,
    selectedPlayerIndices,
    teamColors,
    presetId,
    showBans,
    matchupHistory,
  });

const PlayerOverlayConfig = () => {
  const [playerData, setPlayerData] = useState(createEmptyPlayerData);
  const [selectedPlayerIndices, setSelectedPlayerIndices] = useState([-1, -1]);
  const [teamColors, setTeamColors] = useState(['', '']);
  const [presetId, setPresetId] = useState('tws');
  const [showBans, setShowBans] = useState(true);

  const [showPlayerBlurbs, setShowPlayerBlurbs] = useState({ 0: false, 1: false });
  const [playerImports, setPlayerImports] = useState(['', '']);
  const [playerImportErrors, setPlayerImportErrors] = useState(['', '']);
  const [importTeamIndex, setImportTeamIndex] = useState(null);
  const [matchupHistory, setMatchupHistory] = useState(createEmptyMatchupHistory);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [gameScores, setGameScores] = useState(['', '']);
  const [syncedTeams, setSyncedTeams] = useState([null, null]);
  const obsConnection = useObsConnection();
  const obsSettings = obsConnection.settings;
  const [startRow, setStartRow] = useState(String(MIN_START_ROW));
  const portNumber = Number(obsSettings.port);
  const validObsPort = Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;
  const rosterPools = syncedTeams.map((team) => team?.roster ?? []);
  const currentSnapshot = configSnapshot({
    playerData,
    selectedPlayerIndices,
    teamColors,
    presetId,
    showBans,
    matchupHistory,
  });

  const changePlayerName = (teamIndex, playerIndex, name) => {
    const newPlayers = [...playerData].map((e) => [...e]);
    const oldName = newPlayers[teamIndex][playerIndex].name?.trim();
    newPlayers[teamIndex][playerIndex] = {
      ...newPlayers[teamIndex][playerIndex],
      name,
    };
    const history = matchupHistoryForRoster(
      {
        ...matchupHistory,
        bans: matchupHistory.bans.map((teamBans, index) =>
          index === teamIndex
            ? teamBans.map((ban) => (oldName && samePlayerName(ban, oldName) ? name.trim() : ban))
            : teamBans
        ),
      },
      newPlayers
    );
    setPlayerData(applyBanState(newPlayers, history.bans));
    setMatchupHistory(history);
  };

  const closePlayerImport = (teamIndex) => {
    setPlayerImports((imports) =>
      imports.map((value, index) => (index === teamIndex ? '' : value))
    );
    setPlayerImportErrors((errors) =>
      errors.map((error, index) => (index === teamIndex ? '' : error))
    );
    setImportTeamIndex(null);
  };

  const importPlayers = (teamIndex) => {
    const names = playerImports[teamIndex]
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length > playerData[teamIndex].length) {
      setPlayerImportErrors((errors) =>
        errors.map((error, index) =>
          index === teamIndex
            ? `Enter no more than ${playerData[teamIndex].length} player names.`
            : error
        )
      );
      return;
    }

    const newPlayers = playerData.map((team, index) =>
      index === teamIndex
        ? team.map((player, playerIndex) => ({
            ...player,
            name: names[playerIndex] ?? '',
          }))
        : team
    );
    const history = matchupHistoryForRoster(matchupHistory, newPlayers);
    setPlayerData(applyBanState(newPlayers, history.bans));
    setMatchupHistory(history);
    closePlayerImport(teamIndex);
  };

  const changePlayerBlurb = (teamIndex, playerIndex, blurb) => {
    const newPlayers = [...playerData].map((e) => [...e]);
    newPlayers[teamIndex][playerIndex] = {
      ...newPlayers[teamIndex][playerIndex],
      blurb,
    };
    setPlayerData(newPlayers);
  };

  const eliminatePlayer = (teamIndex, playerIndex, eliminated) => {
    const newPlayers = [...playerData].map((e) => [...e]);
    newPlayers[teamIndex][playerIndex] = {
      ...newPlayers[teamIndex][playerIndex],
      eliminated,
    };
    setPlayerData(newPlayers);
  };

  const updateBanSelection = (teamIndex, banIndex, name) => {
    const bans = matchupHistory.bans.map((teamBans, index) =>
      index === teamIndex ? teamBans.map((ban, slot) => (slot === banIndex ? name : ban)) : teamBans
    );
    setMatchupHistory((history) => ({ ...history, bans }));
    setPlayerData((players) => applyBanState(players, bans));
  };

  const setSelectedPlayer = (teamIndex, playerIndex) => {
    const newSelectedPlayers = [...selectedPlayerIndices];
    newSelectedPlayers[teamIndex] = playerIndex;
    setSelectedPlayerIndices(newSelectedPlayers);
  };

  const selectedNames = selectedPlayerIndices.map(
    (playerIndex, teamIndex) => playerData[teamIndex][playerIndex]?.name?.trim() ?? ''
  );
  const emptyMatchupRow = matchupHistory.matchups.findIndex(
    (matchup) => !matchup.leftPlayer && !matchup.rightPlayer
  );
  const canRecordGame = selectedNames.every(Boolean) && emptyMatchupRow !== -1;

  const recordGame = () => {
    if (!canRecordGame) return;
    setMatchupHistory((history) => ({
      ...history,
      matchups: history.matchups.map((matchup, index) =>
        index === emptyMatchupRow
          ? {
              leftPlayer: selectedNames[0],
              leftScore: gameScores[0],
              rightScore: gameScores[1],
              rightPlayer: selectedNames[1],
            }
          : matchup
      ),
    }));
    setPlayerData((players) =>
      players.map((team, teamIndex) =>
        team.map((player, playerIndex) =>
          playerIndex === selectedPlayerIndices[teamIndex]
            ? { ...player, eliminated: true }
            : player
        )
      )
    );
    setSelectedPlayerIndices([-1, -1]);
    setGameScores(['', '']);
  };

  const saveToLocalStorage = () => {
    const savedConfig = JSON.parse(
      window.localStorage.getItem('ctl-player-overlay-config') || '{}'
    );
    const config = {
      playerData,
      selectedPlayerIndices,
      teamColors,
      presetId,
      showBans,
      matchupHistory,
    };
    window.localStorage.setItem(
      'ctl-player-overlay-config',
      JSON.stringify({ ...savedConfig, ...config })
    );
    setSavedSnapshot(configSnapshot(config));
    console.log('saved');
  };

  const resetToDefaults = async () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setConfirmingReset(false);
    setPlayerData(createEmptyPlayerData());
    setSelectedPlayerIndices([-1, -1]);
    setTeamColors(['', '']);
    setShowBans(true);
    setShowPlayerBlurbs({ 0: false, 1: false });
    setMatchupHistory(createEmptyMatchupHistory());
    try {
      const row = await guessStartRow();
      setStartRow(String(row ?? MIN_START_ROW));
    } catch (error) {
      console.error('Could not guess the next match row.', error);
    }
  };

  const fillRostersFromMatch = (match, previousMatch) => {
    const teams = [match.team1, match.team2];
    const previousTeams = [previousMatch?.team1, previousMatch?.team2];
    setSyncedTeams(teams);

    const newPlayers = playerData.map((team, teamIndex) => {
      const { team: teamName, roster } = teams[teamIndex];
      if (roster.length === 0 || teamName === previousTeams[teamIndex]?.team) return team;
      return teamFromRoster(team, roster.length <= team.length ? roster : []);
    });

    setSelectedPlayerIndices((selected) =>
      selected.map((playerIndex, teamIndex) => {
        const name = playerData[teamIndex][playerIndex]?.name;
        return name ? newPlayers[teamIndex].findIndex((p) => samePlayerName(p.name, name)) : -1;
      })
    );
    const history = matchupHistoryForRoster(matchupHistory, newPlayers);
    setPlayerData(applyBanState(newPlayers, history.bans));
    setMatchupHistory(history);
  };

  const togglePoolPlayer = (teamIndex, name) => {
    const team = playerData[teamIndex];
    const slot = team.findIndex((player) => samePlayerName(player.name, name));
    if (slot !== -1) {
      changePlayerName(teamIndex, slot, '');
      return;
    }
    const emptySlot = team.findIndex((player) => !player.name?.trim());
    if (emptySlot !== -1) changePlayerName(teamIndex, emptySlot, name);
  };

  const handleGoogleSheetSync = async () => {
    const row = normalizeStartRow(startRow);
    setStartRow(String(row));
    setSyncStatus('syncing');
    try {
      const matches = await syncGoogleSheetData(row);
      const savedConfig = JSON.parse(
        window.localStorage.getItem('ctl-player-overlay-config') || '{}'
      );
      window.localStorage.setItem(
        'ctl-player-overlay-config',
        JSON.stringify({ ...savedConfig, matches })
      );

      fillRostersFromMatch(matches[0], savedConfig.matches?.[0]);

      if (obsConnection.status === 'connected') {
        await sendMatchesToObs(matches);
      }
      setSyncStatus('success');
    } catch (error) {
      console.error('Google Sheets sync failed:', error);
      setSyncStatus('failure');
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const {
        playerData: newPlayerData,
        selectedPlayerIndices: newSelectedPlayers,
        teamColors: newTeamColors,
        presetId: newPresetId,
        showBans: newShowBans,
        matchupHistory: newMatchupHistory,
        matches,
      } = JSON.parse(localStorage.getItem('ctl-player-overlay-config'));
      if (matches?.[0]) setSyncedTeams([matches[0].team1, matches[0].team2]);
      const loadedPlayerData = newPlayerData ?? playerData;
      const loadedSelectedPlayers = newSelectedPlayers ?? selectedPlayerIndices;
      const loadedTeamColors = newTeamColors ?? teamColors;
      const loadedPresetId = PRESETS[newPresetId] ? newPresetId : presetId;
      const loadedShowBans = newShowBans ?? true;
      const hasSavedMatchupHistory =
        newPlayerData &&
        newMatchupHistory?.bans?.length === 2 &&
        newMatchupHistory?.matchups?.length === 5;
      const loadedHistory = hasSavedMatchupHistory
        ? addPlayerBansToHistory(
            matchupHistoryForRoster(newMatchupHistory, newPlayerData),
            newPlayerData
          )
        : matchupHistory;
      const loadedPlayers = hasSavedMatchupHistory
        ? applyBanState(loadedPlayerData, loadedHistory.bans)
        : loadedPlayerData;
      setPlayerData(loadedPlayers);
      setSelectedPlayerIndices(loadedSelectedPlayers);
      setTeamColors(loadedTeamColors);
      setPresetId(loadedPresetId);
      setShowBans(loadedShowBans);
      setMatchupHistory(loadedHistory);
      setSavedSnapshot(
        configSnapshot({
          playerData: loadedPlayers,
          selectedPlayerIndices: loadedSelectedPlayers,
          teamColors: loadedTeamColors,
          presetId: loadedPresetId,
          showBans: loadedShowBans,
          matchupHistory: loadedHistory,
        })
      );
      console.log('successfully fetched from localstorage');
    } catch (e) {
      console.log('failed to fetch from localstorage');
    }
  };

  useEffect(loadFromLocalStorage, []);

  useEffect(() => {
    guessStartRow()
      .then((row) => {
        if (row === null) return;
        setStartRow((current) => (current === String(MIN_START_ROW) ? String(row) : current));
      })
      .catch((error) => console.error('Could not guess the next match row.', error));
  }, []);

  useEffect(() => {
    if (!confirmingReset) return;
    const timeout = setTimeout(() => setConfirmingReset(false), 3000);
    return () => clearTimeout(timeout);
  }, [confirmingReset]);

  useEffect(() => {
    if (obsConnection.status !== 'connected') return;

    setMatchupScores([
      ...matchupHistory.matchups,
      { leftScore: gameScores[0], rightScore: gameScores[1] },
    ]).catch((error) => {
      console.error('Could not update OBS scores.', error);
    });
  }, [obsConnection.status, matchupHistory.matchups, gameScores]);

  return (
    <div className="config-container">
      <div className="config-header">
        <label className="layout-dropdown">
          Current Layout:{' '}
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {Object.entries(PRESETS).map(([id, preset]) => (
              <option key={id} value={id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={resetToDefaults}>
          {confirmingReset ? 'Click again to reset' : 'Reset to Defaults'}
        </button>
      </div>
      <div className="obs-connection">
        <label>
          IP address
          <input
            type="text"
            value={obsSettings.ip}
            onChange={(event) => obsConnection.updateSettings({ ip: event.target.value })}
            placeholder="127.0.0.1"
            disabled={obsSettings.enabled}
          />
        </label>
        <label>
          Port
          <input
            type="number"
            min="1"
            max="65535"
            value={obsSettings.port}
            onChange={(event) => obsConnection.updateSettings({ port: event.target.value })}
            placeholder="4455"
            disabled={obsSettings.enabled}
          />
        </label>
        <button
          type="button"
          onClick={obsSettings.enabled ? obsConnection.disconnect : obsConnection.connect}
          disabled={!obsSettings.enabled && (!obsSettings.ip.trim() || !validObsPort)}
        >
          {obsConnection.status === 'connected'
            ? 'Disconnect'
            : obsSettings.enabled
              ? 'Stop Connecting'
              : 'Connect to OBS'}
        </button>
        <span className="obs-connection-status">
          {
            {
              connected: 'Connected',
              connecting: 'Connecting…',
              retrying: 'Retrying…',
              disconnected: 'Disconnected',
            }[obsConnection.status]
          }
        </span>
      </div>
      <div className="google-sheets-sync">
        <button type="button" onClick={handleGoogleSheetSync} disabled={syncStatus === 'syncing'}>
          {syncStatus === 'syncing' ? 'Syncing…' : 'Sync Production Spreadsheet'}
        </button>
        <label className="google-sheets-start-row">
          Start row
          <input
            type="number"
            min={MIN_START_ROW}
            step="1"
            value={startRow}
            onChange={(event) => setStartRow(event.target.value)}
            onBlur={() => setStartRow(String(normalizeStartRow(startRow)))}
            disabled={syncStatus === 'syncing'}
          />
        </label>
        {syncStatus === 'success' && (
          <span>
            Sheet synced
            {obsConnection.status !== 'connected' && ' (OBS not connected; data not sent)'}
          </span>
        )}
        {syncStatus === 'failure' && <span className="obs-connection-error">Sync failed</span>}
      </div>
      <div className="player-config">
        {playerData.map((players, teamIndex) => (
          <div className={`player-col player-col-team-${teamIndex + 1}`} key={teamIndex}>
            <h3>
              Team {teamIndex + 1}
              {syncedTeams[teamIndex]?.team && ` (${syncedTeams[teamIndex].team})`}
            </h3>
            <div className={`player-row player-row-header player-row-team-${teamIndex + 1}`}>
              <span className="player-row-checkbox-label">E</span>
              <span className="player-slot-number"></span>
              <span className="player-row-header-spacer"></span>
              <span className="player-row-checkbox-label">S</span>
            </div>
            {players.map((player, playerIndex) => (
              <div
                className={`player-row player-row-team-${teamIndex + 1}`}
                key={`${playerIndex} ${teamIndex}`}
              >
                <input
                  type="checkbox"
                  onChange={(e) => eliminatePlayer(teamIndex, playerIndex, e.target.checked)}
                  name={`team${teamIndex}`}
                  checked={player.eliminated ?? false}
                />
                <span className="player-slot-number">{playerIndex + 1}</span>
                <input
                  onChange={(e) => changePlayerName(teamIndex, playerIndex, e.target.value)}
                  value={player?.name ?? ''}
                  placeholder={`Team ${teamIndex + 1} Player ${playerIndex + 1} name`}
                  className="player-row-text-input"
                  list={`roster-pool-${teamIndex}`}
                />
                <input
                  type="radio"
                  onChange={(e) => setSelectedPlayer(teamIndex, playerIndex)}
                  name={`team${teamIndex}`}
                  checked={selectedPlayerIndices[teamIndex] === playerIndex}
                />
              </div>
            ))}

            <datalist id={`roster-pool-${teamIndex}`}>
              {rosterPools[teamIndex].map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {rosterPools[teamIndex].length > 0 && (
              <div className="roster-pool">
                {rosterPools[teamIndex].map((name) => {
                  const slot = players.findIndex((player) => samePlayerName(player.name, name));
                  const picked = slot !== -1;
                  return (
                    <button
                      type="button"
                      key={name}
                      className={`roster-pool-player${picked ? ' roster-pool-player--picked' : ''}`}
                      onClick={() => togglePoolPlayer(teamIndex, name)}
                      disabled={!picked && players.every((player) => player.name?.trim())}
                    >
                      {picked && <span className="player-slot-number">{slot + 1}</span>}
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              style={{
                marginTop: 5,
                marginBottom: 5,
              }}
              onClick={() => setSelectedPlayer(teamIndex, -1)}
            >
              Clear Selected Player
            </button>
            <button
              className="player-import-trigger"
              type="button"
              onClick={() => setImportTeamIndex(teamIndex)}
            >
              Import Players
            </button>

            {/* <button
              onClick={() =>
                setShowPlayerBlurbs((showBlurbs) => ({
                  ...showBlurbs,
                  [teamIndex]: !showBlurbs[teamIndex],
                }))
              }
            >
              {showPlayerBlurbs[teamIndex] ? 'Hide' : 'Show'} player blurbs
            </button> */}
            {showPlayerBlurbs[teamIndex] &&
              players.map((player, playerIndex) => (
                <input
                  key={playerIndex}
                  onChange={(e) => changePlayerBlurb(teamIndex, playerIndex, e.target.value)}
                  value={player?.blurb ?? ''}
                  placeholder={`Team ${teamIndex + 1} Player ${playerIndex + 1} blurb`}
                  className="player-row-text-input"
                />
              ))}

            <div className="matchup-team-bans-config">
              {matchupHistory.bans[teamIndex].map((ban, banIndex) => (
                <label key={banIndex}>
                  Ban {banIndex + 1}
                  <select
                    name={`ban-team-${teamIndex + 1}-${banIndex + 1}`}
                    value={ban}
                    onChange={(event) =>
                      updateBanSelection(teamIndex, banIndex, event.target.value)
                    }
                  >
                    <option value="">Select player</option>
                    {playerData[teamIndex].map((player, playerIndex) =>
                      player.name ? (
                        <option key={`${player.name}-${playerIndex}`} value={player.name}>
                          {player.name}
                        </option>
                      ) : null
                    )}
                  </select>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {importTeamIndex !== null && (
        <dialog
          className="player-import-dialog"
          ref={(dialog) => {
            if (dialog && !dialog.open) dialog.showModal();
          }}
          onCancel={() => closePlayerImport(importTeamIndex)}
        >
          <form
            className="player-import"
            onSubmit={(event) => {
              event.preventDefault();
              importPlayers(importTeamIndex);
            }}
          >
            <h3>Import Team {importTeamIndex + 1} Players</h3>
            <label htmlFor={`player-import-${importTeamIndex}`}>
              Enter one player name per line
            </label>
            <textarea
              id={`player-import-${importTeamIndex}`}
              rows="8"
              autoFocus
              value={playerImports[importTeamIndex]}
              onChange={(event) => {
                const value = event.target.value;
                setPlayerImports((imports) =>
                  imports.map((current, index) => (index === importTeamIndex ? value : current))
                );
                setPlayerImportErrors((errors) =>
                  errors.map((error, index) => (index === importTeamIndex ? '' : error))
                );
              }}
            />
            {playerImportErrors[importTeamIndex] && (
              <span className="obs-connection-error">{playerImportErrors[importTeamIndex]}</span>
            )}
            <div className="player-import-actions">
              <button type="button" onClick={() => closePlayerImport(importTeamIndex)}>
                Cancel
              </button>
              <button type="submit">Import Team {importTeamIndex + 1}</button>
            </div>
          </form>
        </dialog>
      )}
      <label className="hide-ban-icons">
        Hide ban icons:
        <input
          type="checkbox"
          checked={!showBans}
          onChange={(event) => setShowBans(!event.target.checked)}
        />
      </label>
      <div className="record-game">
        <span>{selectedNames[0] || 'Select Team 1 player'}</span>
        {gameScores.map((score, teamIndex) => (
          <input
            key={teamIndex}
            type="number"
            step="any"
            placeholder="0"
            value={score}
            onChange={(event) =>
              setGameScores((scores) =>
                scores.map((current, index) => (index === teamIndex ? event.target.value : current))
              )
            }
          />
        ))}
        <span>{selectedNames[1] || 'Select Team 2 player'}</span>
        <button type="button" onClick={recordGame} disabled={!canRecordGame}>
          {emptyMatchupRow === -1 ? 'Matchups full' : `Record Game ${emptyMatchupRow + 1}`}
        </button>
      </div>
      <MatchupHistoryConfig
        value={matchupHistory}
        onChange={setMatchupHistory}
        teamPlayerNames={playerData.map((team) => team.map((player) => player.name?.trim() ?? ''))}
      />
      <button className="save-button" onClick={saveToLocalStorage}>
        {savedSnapshot !== null && currentSnapshot !== savedSnapshot
          ? 'Save (new unsaved changes)'
          : 'Save'}
      </button>
    </div>
  );
};

export default PlayerOverlayConfig;
