import { useEffect, useState } from 'react';
import { PRESETS } from '../config/presets';
import MatchupHistoryConfig from '../components/shared/MatchupHistoryConfig';
import { connectObs, disconnectObs, setMatchupScores } from '../util/obs';

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

const matchupHistoryForRoster = (history, playerData) => {
  const teamNames = playerData.map(
    (team) => new Set(team.map((player) => player.name?.trim().toLowerCase()).filter(Boolean))
  );

  return {
    ...history,
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

const PlayerOverlayConfig = () => {
  const [playerData, setPlayerData] = useState([
    [{}, {}, {}, {}, {}],
    [{}, {}, {}, {}, {}],
  ]);
  const [selectedPlayerIndices, setSelectedPlayerIndices] = useState([-1, -1]);
  const [teamColors, setTeamColors] = useState(['', '']);
  const [presetId, setPresetId] = useState('tws');

  const [showPlayerBlurbs, setShowPlayerBlurbs] = useState({ 0: false, 1: false });
  const [matchupHistory, setMatchupHistory] = useState(createEmptyMatchupHistory);
  const [obsConnection, setObsConnection] = useState({
    ip: '127.0.0.1',
    port: '4455',
    status: 'disconnected',
    error: '',
  });
  const portNumber = Number(obsConnection.port);
  const validObsPort = Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;

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
    newPlayers[teamIndex][playerIndex] = {
      ...newPlayers[teamIndex][playerIndex],
      name,
    };
    setPlayerData(newPlayers);
    setMatchupHistory((history) => matchupHistoryForRoster(history, newPlayers));
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

  const banPlayer = (teamIndex, playerIndex, banned) => {
    const newPlayers = [...playerData].map((e) => [...e]);
    newPlayers[teamIndex][playerIndex] = {
      ...newPlayers[teamIndex][playerIndex],
      banned,
    };
    setPlayerData(newPlayers);
  };

  const setSelectedPlayer = (teamIndex, playerIndex) => {
    const newSelectedPlayers = [...selectedPlayerIndices];
    newSelectedPlayers[teamIndex] = playerIndex;
    setSelectedPlayerIndices(newSelectedPlayers);
  };

  const createTeamColorInputOnChange = (teamIndex, color) => {
    const newTeamColors = [...teamColors];
    newTeamColors[teamIndex] = color;
    setTeamColors(newTeamColors);
  };

  const saveToLocalStorage = () => {
    window.localStorage.setItem(
      'ctl-player-overlay-config',
      JSON.stringify({
        playerData,
        selectedPlayerIndices,
        teamColors,
        presetId,
        matchupHistory,
      })
    );
    console.log('saved');
  };

  const loadFromLocalStorage = () => {
    try {
      const {
        playerData: newPlayerData,
        selectedPlayerIndices: newSelectedPlayers,
        teamColors: newTeamColors,
        presetId: newPresetId,
        matchupHistory: newMatchupHistory,
      } = JSON.parse(localStorage.getItem('ctl-player-overlay-config'));
      setPlayerData((playerData) => newPlayerData ?? playerData);
      setSelectedPlayerIndices((selectedIndices) => newSelectedPlayers ?? selectedIndices);
      setTeamColors((teamColors) => newTeamColors ?? teamColors);
      setPresetId((presetId) => (PRESETS[newPresetId] ? newPresetId : presetId));
      if (
        newPlayerData &&
        newMatchupHistory?.bans?.length === 2 &&
        newMatchupHistory?.matchups?.length === 5
      ) {
        setMatchupHistory(matchupHistoryForRoster(newMatchupHistory, newPlayerData));
      }
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
      <div className="player-config">
        {playerData.map((players, teamIndex) => (
          <div className={`player-col player-col-team-${teamIndex + 1}`}>
            <h3>Team {teamIndex + 1}</h3>
            <div className={`player-row player-row-header player-row-team-${teamIndex + 1}`}>
              <span className="player-row-checkbox-label">E</span>
              <span className="player-row-checkbox-label">B</span>
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
                  type="checkbox"
                  onChange={(e) => banPlayer(teamIndex, playerIndex, e.target.checked)}
                  name={`team${teamIndex}-banned`}
                  checked={player.banned ?? false}
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

            <button
              onClick={() =>
                setShowPlayerBlurbs((showBlurbs) => ({
                  ...showBlurbs,
                  [teamIndex]: !showBlurbs[teamIndex],
                }))
              }
            >
              {showPlayerBlurbs[teamIndex] ? 'Hide' : 'Show'} player blurbs
            </button>
            {showPlayerBlurbs[teamIndex] &&
              players.map((player, playerIndex) => (
                <input
                  onChange={(e) => changePlayerBlurb(teamIndex, playerIndex, e.target.value)}
                  value={player?.blurb ?? ''}
                  placeholder={`Team ${teamIndex + 1} Player ${playerIndex + 1} blurb`}
                  className="player-row-text-input"
                />
              ))}

            <span>Team Color Hex:</span>
            <input
              placeholder={`Team ${teamIndex + 1} Color Hex`}
              value={teamColors[teamIndex]}
              onChange={(e) => createTeamColorInputOnChange(teamIndex, e.target.value)}
            />
          </div>
        ))}
      </div>
      <MatchupHistoryConfig
        value={matchupHistory}
        onChange={setMatchupHistory}
        teamPlayerNames={playerData.map((team) => team.map((player) => player.name?.trim() ?? ''))}
      />
      <button className="save-button" onClick={saveToLocalStorage}>
        Save
      </button>
    </div>
  );
};

export default PlayerOverlayConfig;
