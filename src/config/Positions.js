import { PRESETS } from './presets';

const width = 1920;
const height = 1080;

const MAX_TEAM_SIZE = 5;

const createPositions = (
  teamSizes = [MAX_TEAM_SIZE, MAX_TEAM_SIZE],
  layout = PRESETS.ctl.layout
) => {
  const {
    xPadding,
    yPadding,
    focusedXPadding,
    gameSceneXPadding,
    gameSceneYPadding,
    defaultSize,
    focusedSize,
  } = layout;
  const yStart = yPadding;
  const yEnd = yPadding + ((height - yPadding * 2) / MAX_TEAM_SIZE) * (MAX_TEAM_SIZE - 1);
  const spacedYCoords = (n) => {
    if (n <= 0) return [];
    if (n === 1) return [yStart];
    const step = (yEnd - yStart) / (n - 1);
    return Array.from({ length: n }, (_, i) => yStart + step * i);
  };

  const [leftSize, rightSize] = teamSizes;
  const leftBench = leftSize - 1;
  const rightBench = rightSize - 1;

  return {
    DEFAULT_POSITIONS: [
      spacedYCoords(leftSize).map((e) => ({ top: e, left: xPadding })),
      spacedYCoords(rightSize).map((e) => ({ top: e, right: xPadding })),
    ],
    BENCH_PLAYER_SELECTED_POSITIONS: [
      spacedYCoords(leftBench).map((e) => ({ top: e, left: xPadding })),
      spacedYCoords(rightBench).map((e) => ({ top: e, right: xPadding })),
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
      spacedYCoords(leftBench).map((e) => ({ top: e, left: -xPadding - defaultSize })),
      spacedYCoords(rightBench).map((e) => ({ top: e, right: -xPadding - defaultSize })),
    ],
    FOCUSED_PLAYER_GAME_POSITIONS: [
      {
        width: focusedSize,
        height: focusedSize,
        top: height - gameSceneYPadding - focusedSize,
        left: gameSceneXPadding,
      },
      {
        width: focusedSize,
        height: focusedSize,
        top: height - gameSceneYPadding - focusedSize,
        right: gameSceneXPadding,
      },
    ],
    ALL_HIDDEN_GAME_POSITIONS: [
      spacedYCoords(leftSize).map((e) => ({ top: e, left: -xPadding - defaultSize })),
      spacedYCoords(rightSize).map((e) => ({ top: e, right: -xPadding - defaultSize })),
    ],
  };
};

export default createPositions;
