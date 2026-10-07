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

  const trimmedData = playerData.map(trimTeam);
  const profiles = usePlayerProfiles(trimmedData);
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
      } = JSON.parse(localStorage.getItem('ctl-player-overlay-config'));
      setPlayerData((playerData) => newPlayerData ?? playerData);
      setSelectedPlayerIndices((selectedIndices) => newSelectedPlayers ?? selectedIndices);
      setTeamColors((teamColors) => newTeamColors ?? teamColors);
      setPresetId((presetId) => (PRESETS[newPresetId] ? newPresetId : presetId));
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
      />
      {/* Testing buttons that should be off screen. */}
      <button onClick={() => setScene('player-select')}>player select scene</button>
      <button onClick={() => setScene('players-chosen')}>player chosen scene</button>
      <button onClick={() => setScene('game-scene')}>game scene</button>
    </div>
  );
};

export default PlayerOverlay;
