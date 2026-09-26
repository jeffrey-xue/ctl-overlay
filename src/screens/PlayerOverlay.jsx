import { useState, useEffect, useMemo } from 'react';
import PlayerIcon from '../components/PlayerIcon';
import createPositions from '../config/Positions';
import { PRESETS } from '../config/presets';
import { useInterval } from '../hooks/useInterval';

const TRACKED_SCENES = ['player-select', 'players-chosen', 'game-scene'];

const isActive = (player) => (player?.name ?? '').trim() !== '';

// Remove trailing empty names on the team
const trimTeam = (team) => {
  let end = team.length;
  while (end > 0 && !isActive(team[end - 1])) end--;
  return team.slice(0, end);
};

const layoutWithFocus = (size, selected, focusedPos, benchPositions) => {
  let benchIndex = 0;
  return Array.from({ length: size }, (_, i) =>
    i === selected ? focusedPos : benchPositions[benchIndex++]
  );
};

const buildPositions = (scene, Positions, teamSizes, selectedPlayerIndices) =>
  teamSizes.map((size, t) => {
    const selected = selectedPlayerIndices[t];
    const hasSelection = selected >= 0 && selected < size;

    switch (scene) {
      case 'players-chosen':
        return hasSelection
          ? layoutWithFocus(
              size,
              selected,
              Positions.FOCUSED_PLAYER_SELECTED_POSITIONS[t],
              Positions.BENCH_PLAYER_SELECTED_POSITIONS[t]
            )
          : Positions.DEFAULT_POSITIONS[t];
      case 'game-scene':
        return hasSelection
          ? layoutWithFocus(
              size,
              selected,
              Positions.FOCUSED_PLAYER_GAME_POSITIONS[t],
              Positions.BENCH_PLAYER_GAME_POSITIONS[t]
            )
          : Positions.ALL_HIDDEN_GAME_POSITIONS[t];
      case 'players-out':
        return Positions.ALL_HIDDEN_GAME_POSITIONS[t];
      default: // "player-select" and the initial "" scene
        return Positions.DEFAULT_POSITIONS[t];
    }
  });

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
  const teamSizes = trimmedData.map((team) => team.length);
  const preset = PRESETS[presetId] ?? PRESETS.ctl;
  const Positions = createPositions(teamSizes, preset.layout);
  const playerPositions = buildPositions(scene, Positions, teamSizes, selectedPlayerIndices);

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
      <main
        style={{
          ...preset.css,
          '--default-icon-size': `${preset.layout.defaultSize}px`,
        }}
      >
        {trimmedData.map((team, teamIndex) =>
          team.map((player, playerIndex) => (
            <PlayerIcon
              teamColor={teamColors[teamIndex]}
              username={player.name}
              key={playerIndex}
              pos={playerPositions[teamIndex][playerIndex]}
              selected={
                selectedPlayerIndices[teamIndex] === playerIndex && scene === 'players-chosen'
              }
              eliminated={player.eliminated}
              banned={player.banned}
              blurb={player.blurb}
              leagueStatsLayout={preset.leagueStatsLayout}
            />
          ))
        )}
      </main>
      {/* Testing buttons that should be off screen. */}
      <button onClick={() => setScene('player-select')}>player select scene</button>
      <button onClick={() => setScene('players-chosen')}>player chosen scene</button>
      <button onClick={() => setScene('game-scene')}>game scene</button>
    </div>
  );
};

export default PlayerOverlay;
