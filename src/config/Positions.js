const width = 1920;
const height = 1080;

const MAX_TEAM_SIZE = 5;

export const DEFAULT_LAYOUT = {
  xPadding: 30,
  yPadding: 100,
  focusedXPadding: 500,
  gameSceneXPadding: -10,
  gameSceneYPadding: -80,
  gameSize: 350,
  defaultSize: 150,
  focusedSize: 350,
};

const createPositions = (teamSizes = [MAX_TEAM_SIZE, MAX_TEAM_SIZE], layout = DEFAULT_LAYOUT) => {
  const {
    xPadding,
    yPadding,
    leftRosterYStart,
    leftRosterYEnd,
    rightRosterYStart,
    rightRosterYEnd,
    focusedXPadding,
    gameSceneXPadding,
    gameSceneYPadding,
    gameSize,
    defaultSize,
    focusedSize,
  } = layout;
  const defaultYStart = yPadding;
  const defaultYEnd = yPadding + ((height - yPadding * 2) / MAX_TEAM_SIZE) * (MAX_TEAM_SIZE - 1);
  const spacedYCoords = (n, yStart, yEnd) => {
    if (n <= 0) return [];
    if (n === 1) return [yStart];
    const step = (yEnd - yStart) / (n - 1);
    return Array.from({ length: n }, (_, i) => yStart + step * i);
  };

  const [leftSize, rightSize] = teamSizes;
  const leftYStart = leftRosterYStart ?? defaultYStart;
  const leftYEnd = leftRosterYEnd ?? defaultYEnd;
  const rightYStart = rightRosterYStart ?? defaultYStart;
  const rightYEnd = rightRosterYEnd ?? defaultYEnd;
  const leftBench = leftSize - 1;
  const rightBench = rightSize - 1;

  return {
    DEFAULT_POSITIONS: [
      spacedYCoords(leftSize, leftYStart, leftYEnd).map((e) => ({ top: e, left: xPadding })),
      spacedYCoords(rightSize, rightYStart, rightYEnd).map((e) => ({ top: e, right: xPadding })),
    ],
    BENCH_PLAYER_SELECTED_POSITIONS: [
      spacedYCoords(leftBench, leftYStart, leftYEnd).map((e) => ({ top: e, left: xPadding })),
      spacedYCoords(rightBench, rightYStart, rightYEnd).map((e) => ({ top: e, right: xPadding })),
    ],
    FOCUSED_PLAYER_SELECTED_POSITIONS: [
      {
        width: focusedSize,
        height: focusedSize,
        top: height / 2 - focusedSize / 2,
        left: focusedXPadding,
      },
      {
        width: focusedSize,
        height: focusedSize,
        top: height / 2 - focusedSize / 2,
        right: focusedXPadding,
      },
    ],
    BENCH_PLAYER_GAME_POSITIONS: [
      spacedYCoords(leftBench, leftYStart, leftYEnd).map((e) => ({
        top: e,
        left: -xPadding - defaultSize,
      })),
      spacedYCoords(rightBench, rightYStart, rightYEnd).map((e) => ({
        top: e,
        right: -xPadding - defaultSize,
      })),
    ],
    FOCUSED_PLAYER_GAME_POSITIONS: [
      {
        width: gameSize,
        height: gameSize,
        top: height - gameSceneYPadding - gameSize,
        left: gameSceneXPadding,
      },
      {
        width: gameSize,
        height: gameSize,
        top: height - gameSceneYPadding - gameSize,
        right: gameSceneXPadding,
      },
    ],
    ALL_HIDDEN_GAME_POSITIONS: [
      spacedYCoords(leftSize, leftYStart, leftYEnd).map((e) => ({
        top: e,
        left: -xPadding - defaultSize,
      })),
      spacedYCoords(rightSize, rightYStart, rightYEnd).map((e) => ({
        top: e,
        right: -xPadding - defaultSize,
      })),
    ],
  };
};

export default createPositions;
