import createPositions from '../../config/Positions';

const layoutWithFocus = (size, selected, focusedPos, benchPositions) => {
  let benchIndex = 0;
  return Array.from({ length: size }, (_, index) =>
    index === selected ? focusedPos : benchPositions[benchIndex++]
  );
};

const buildPlayerPositions = (scene, teamSizes, selectedPlayerIndices, layout) => {
  const positions = createPositions(teamSizes, layout);
  return teamSizes.map((size, teamIndex) => {
    const selected = selectedPlayerIndices[teamIndex];
    const hasSelection = selected >= 0 && selected < size;

    switch (scene) {
      case 'players-chosen':
        return hasSelection
          ? layoutWithFocus(
              size,
              selected,
              positions.FOCUSED_PLAYER_SELECTED_POSITIONS[teamIndex],
              positions.BENCH_PLAYER_SELECTED_POSITIONS[teamIndex]
            )
          : positions.DEFAULT_POSITIONS[teamIndex];
      case 'game-scene':
        return hasSelection
          ? layoutWithFocus(
              size,
              selected,
              positions.FOCUSED_PLAYER_GAME_POSITIONS[teamIndex],
              positions.BENCH_PLAYER_GAME_POSITIONS[teamIndex]
            )
          : positions.ALL_HIDDEN_GAME_POSITIONS[teamIndex];
      case 'players-out':
        return positions.ALL_HIDDEN_GAME_POSITIONS[teamIndex];
      default:
        return positions.DEFAULT_POSITIONS[teamIndex];
    }
  });
};

export default buildPlayerPositions;
