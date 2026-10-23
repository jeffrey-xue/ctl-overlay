import { useEffect, useState } from 'react';
import { PRESETS } from '../config/presets';
import MatchupHistoryConfig from '../components/shared/MatchupHistoryConfig';
import { connectObs, disconnectObs, setMatchupScores } from '../util/obs';
import {
  MIN_START_ROW,
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
  const [playerData, setPlayerData] = useState([
    [{}, {}, {}, {}, {}],
    [{}, {}, {}, {}, {}],
  ]);
  const [selectedPlayerIndices, setSelectedPlayerIndices] = useState([-1, -1]);
  const [teamColors, setTeamColors] = useState(['', '']);
  const [presetId, setPresetId] = useState('tws');
  const [showBans, setShowBans] = useState(true);

  const [showPlayerBlurbs, setShowPlayerBlurbs] = useState({ 0: false, 1: false });
  const [matchupHistory, setMatchupHistory] = useState(createEmptyMatchupHistory);
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [obsConnection, setObsConnection] = useState({
    ip: '127.0.0.1',
    port: '4455',
    status: 'disconnected',
    error: '',
  });
  const [startRow, setStartRow] = useState(String(MIN_START_ROW));
  const portNumber = Number(obsConnection.port);
  const validObsPort = Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;
  const currentSnapshot = configSnapshot({
    playerData,
    selectedPlayerIndices,
    teamColors,
    presetId,
    showBans,
    matchupHistory,
  });

  const toggleObsConnection = async () => {
    setObsConnection((connection) => ({ ...connection, error: '' }));

    if (obsConnection.status === 'connected') {
      try {
        await disconnectObs();
        setObsConnection((connection) => ({ ...connection, status: 'disconnected' }));
      } catch (error) {
        setObsConnection((connection) => ({
          ...connection,
          error: error.message || 'Could not disconnect from OBS.',
        }));
      }
      return;
    }

    setObsConnection((connection) => ({ ...connection, status: 'connecting' }));
    try {
      await connectObs(`ws://${obsConnection.ip.trim()}:${obsConnection.port.trim()}`);
      setObsConnection((connection) => ({ ...connection, status: 'connected' }));
    } catch (error) {
      setObsConnection((connection) => ({
        ...connection,
        status: 'disconnected',
        error: error.message || 'Could not connect to OBS.',
      }));
    }
  };

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
      } = JSON.parse(localStorage.getItem('ctl-player-overlay-config'));
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
    if (obsConnection.status !== 'connected') return;

    setMatchupScores(matchupHistory.matchups).catch((error) => {
      setObsConnection((connection) => ({
        ...connection,
        error: error.message || 'Could not update OBS scores.',
      }));
    });
  }, [obsConnection.status, matchupHistory.matchups]);

  return (
    <div className="config-container">
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
      <div className="obs-connection">
        <label>
          IP address
          <input
            type="text"
            value={obsConnection.ip}
            onChange={(event) =>
              setObsConnection((connection) => ({ ...connection, ip: event.target.value }))
            }
            placeholder="127.0.0.1"
            disabled={obsConnection.status === 'connected' || obsConnection.status === 'connecting'}
          />
        </label>
        <label>
          Port
          <input
            type="number"
            min="1"
            max="65535"
            value={obsConnection.port}
            onChange={(event) =>
              setObsConnection((connection) => ({ ...connection, port: event.target.value }))
            }
            placeholder="4455"
            disabled={obsConnection.status === 'connected' || obsConnection.status === 'connecting'}
          />
        </label>
        <button
          type="button"
          onClick={toggleObsConnection}
          disabled={
            obsConnection.status === 'connecting' || !obsConnection.ip.trim() || !validObsPort
          }
        >
          {obsConnection.status === 'connecting'
            ? 'Connecting…'
            : obsConnection.status === 'connected'
              ? 'Disconnect'
              : 'Connect to OBS'}
        </button>
        <span className="obs-connection-status">
          {obsConnection.status === 'connected'
            ? 'Connected'
            : obsConnection.status === 'connecting'
              ? 'Connecting…'
              : 'Disconnected'}
          <br />
          {obsConnection.error && (
            <span className="obs-connection-error">{obsConnection.error}</span>
          )}
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
          <div className={`player-col player-col-team-${teamIndex + 1}`}>
            <h3>Team {teamIndex + 1}</h3>
            <div className={`player-row player-row-header player-row-team-${teamIndex + 1}`}>
              <span className="player-row-checkbox-label">E</span>
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
                <input
                  onChange={(e) => changePlayerName(teamIndex, playerIndex, e.target.value)}
                  value={player?.name ?? ''}
                  placeholder={`Team ${teamIndex + 1} Player ${playerIndex + 1} name`}
                  className="player-row-text-input"
                />
                <input
                  type="radio"
                  onChange={(e) => setSelectedPlayer(teamIndex, playerIndex)}
                  name={`team${teamIndex}`}
                  checked={selectedPlayerIndices[teamIndex] === playerIndex}
                />
              </div>
            ))}

            <button
              style={{
                marginTop: 5,
                marginBottom: 5,
              }}
              onClick={() => setSelectedPlayer(teamIndex, -1)}
            >
              Clear Selected Player
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
      <label className="hide-ban-icons">
        Hide ban icons:
        <input
          type="checkbox"
          checked={!showBans}
          onChange={(event) => setShowBans(!event.target.checked)}
        />
      </label>
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
