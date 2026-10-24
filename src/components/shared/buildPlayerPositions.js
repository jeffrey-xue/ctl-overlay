import createPositions from '../../config/Positions';

const sortPlayerIndicesByTR = (team) =>
  team
    .map((player, index) => ({ index, tr: player.leagueStats?.tr }))
    .sort((a, b) => {
      const aTR = Number.isFinite(a.tr) ? a.tr : -Infinity;
      const bTR = Number.isFinite(b.tr) ? b.tr : -Infinity;
      return bTR - aTR || a.index - b.index;
    })
    .map(({ index }) => index);

const positionsForSortedPlayers = (size, sortedIndices, positions) => {
  const playerPositions = Array(size);
  sortedIndices.forEach((playerIndex, positionIndex) => {
    playerPositions[playerIndex] = positions[positionIndex];
  });
  return playerPositions;
};

const positionsWithFocus = (size, selected, sortedIndices, focusedPosition, benchPositions) => {
  const playerPositions = Array(size);
  playerPositions[selected] = focusedPosition;
  sortedIndices
    .filter((index) => index !== selected)
    .forEach((playerIndex, positionIndex) => {
      playerPositions[playerIndex] = benchPositions[positionIndex];
    });
  return playerPositions;
};

const buildPlayerPositions = (scene, teams, selectedPlayerIndices, layout) => {
  const teamSizes = teams.map((team) => team.length);
  const positions = createPositions(teamSizes, layout);
  return teamSizes.map((size, teamIndex) => {
    const selected = selectedPlayerIndices[teamIndex];
    const hasSelection = selected >= 0 && selected < size;
    const sortedIndices = sortPlayerIndicesByTR(teams[teamIndex]);

    switch (scene) {
      case 'players-chosen':
        if (hasSelection) {
          return positionsWithFocus(
            size,
            selected,
            sortedIndices,
            positions.FOCUSED_PLAYER_SELECTED_POSITIONS[teamIndex],
            positions.BENCH_PLAYER_SELECTED_POSITIONS[teamIndex]
          );
        }
        return positionsForSortedPlayers(
          size,
          sortedIndices,
          positions.DEFAULT_POSITIONS[teamIndex]
        );
      case 'game-scene':
        if (hasSelection) {
          return positionsWithFocus(
            size,
            selected,
            sortedIndices,
            positions.FOCUSED_PLAYER_GAME_POSITIONS[teamIndex],
            positions.BENCH_PLAYER_GAME_POSITIONS[teamIndex]
          );
        }
        return positions.ALL_HIDDEN_GAME_POSITIONS[teamIndex];
      case 'title-screen':
      case 'players-out':
        return positions.ALL_HIDDEN_GAME_POSITIONS[teamIndex];
      default:
        return positionsForSortedPlayers(
          size,
          sortedIndices,
          positions.DEFAULT_POSITIONS[teamIndex]
        );
    }
  });
};

export default buildPlayerPositions;
