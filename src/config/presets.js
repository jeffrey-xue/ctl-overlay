const defaultPreset = {
  css: {
    '--player-transition': '2s cubic-bezier(0.9, 0, 0.1, 1)',
    '--fade-transition': '0.4s',
    '--detail-transition': '1s',
  },
  layout: {
    xPadding: 30,
    yPadding: 100,
    focusedXPadding: 500,
    gameSceneXPadding: -10,
    gameSceneYPadding: -80,
    defaultSize: 150,
    focusedSize: 350,
  },
};

export const PRESETS = {
  ctl: {
    ...defaultPreset,
    label: 'Collegiate Tetris League',
  },
  one_vs_one: {
    ...defaultPreset,
    label: '1 vs 1',
    css: {
      '--player-transition': '0s',
      '--fade-transition': '0s',
      '--detail-transition': '0s',
    },
  },
};
