import { useState, useEffect } from 'react';
import { PRESETS } from '../config/presets';
import { useInterval } from '../hooks/useInterval';
import usePlayerProfiles from '../hooks/usePlayerProfiles';

const TRACKED_SCENES = ['player-select', 'players-chosen', 'game-scene'];

const isActive = (player) => (player?.name ?? '').trim() !== '';

// Remove trailing empty names on the team
const trimTeam = (team) => {
  let end = team.length;
  while (end > 0 && !isActive(team[end - 1])) end--;
  return team.slice(0, end);
};

const PlayerOverlay = () => {
  const [playerData, setPlayerData] = useState([
    [{}, {}, {}, {}, {}],
    [{}, {}, {}, {}, {}],
  ]);
  const [selectedPlayerIndices, setSelectedPlayerIndices] = useState([-1, -1]);
  const [teamColors, setTeamColors] = useState(['', '']);
  const [presetId, setPresetId] = useState('ctl');
  const [scene, setScene] = useState('');
  const [matchupHistory, setMatchupHistory] = useState(null);

  const trimmedData = playerData.map(trimTeam);
  const profiles = usePlayerProfiles(trimmedData);
  const matchups = matchupHistory?.matchups ?? [];
  const matchupProfiles = usePlayerProfiles([
    matchups.map((matchup) => ({ name: matchup.leftPlayer })),
    matchups.map((matchup) => ({ name: matchup.rightPlayer })),
  ]);
  const avatarFor = (name) => matchupProfiles[name?.trim().toLowerCase()]?.avatarUrl;
  const matchupHistoryWithAvatars = matchupHistory && {
    ...matchupHistory,
    matchups: matchups.map((matchup) => ({
      ...matchup,
      leftAvatarUrl: avatarFor(matchup.leftPlayer),
      rightAvatarUrl: avatarFor(matchup.rightPlayer),
    })),
  };
  const preset = PRESETS[presetId] ?? PRESETS.ctl;
  const Renderer = preset.Renderer;
  const teams = trimmedData.map((team, teamIndex) =>
    team.map((player) => ({
      ...player,
      teamColor: teamColors[teamIndex],
      ...(profiles[player.name?.trim().toLowerCase()] ?? {}),
    }))
  );

  useInterval(() => {
    // there is no emitted event to send
    if (window.obsstudio) {
      window.obsstudio.getCurrentScene((data) => {
        setScene(TRACKED_SCENES.includes(data.name) ? data.name : 'players-out');
      });
    }
  }, 300);

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
      if (Array.isArray(newMatchupHistory?.matchups)) {
        setMatchupHistory(newMatchupHistory);
      }
      console.log('successfully fetched from localstorage');
    } catch (e) {
      console.log('failed to fetch from localstorage');
    }
  };

  useEffect(() => {
    loadFromLocalStorage();

    const onStorage = () => loadFromLocalStorage();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    console.log('scene:', scene);
  }, [scene]);

  return (
    <div>
      <Renderer
        teams={teams}
        scene={scene}
        selectedPlayerIndices={selectedPlayerIndices}
        preset={preset}
        matchupHistory={matchupHistoryWithAvatars}
      />
      {/* Testing buttons that should be off screen. */}
      <div className="offscreen-controls">
        <button onClick={() => setScene('player-select')}>player select scene</button>
        <button onClick={() => setScene('players-chosen')}>player chosen scene</button>
        <button onClick={() => setScene('game-scene')}>game scene</button>
      </div>
    </div>
  );
};

export default PlayerOverlay;
