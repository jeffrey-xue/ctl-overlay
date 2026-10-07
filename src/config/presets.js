import CtlOverlay from '../components/ctl-components/CtlOverlay';
import TwsOverlay from '../components/tws-components/TwsOverlay';
import OneVsOneOverlay from '../components/1v1/OneVsOneOverlay';
import { DEFAULT_LAYOUT } from './Positions';

const defaultPreset = {
  css: {
    '--player-transition': '2s cubic-bezier(0.9, 0, 0.1, 1)',
    '--fade-transition': '0.4s',
    '--detail-transition': '1s',
  },
  layout: DEFAULT_LAYOUT,
  teamColorBorder: true,
  banIconPath: 'Banned_Icon.png',
  animateNames: false,
};

export const PRESETS = {
  ctl: {
    ...defaultPreset,
    label: 'Collegiate Tetris League',
    Renderer: CtlOverlay,
  },
  tws: {
    ...defaultPreset,
    label: 'TETR.IO World Series',
    Renderer: TwsOverlay,
    teamColorBorder: false,
    animateNames: true,
    banIconPath: 'twsavatarban.png',
    layout: {
      ...defaultPreset.layout,
      leftRosterYStart: 160,
      leftRosterYEnd: 920,
      rightRosterYStart: 80,
      rightRosterYEnd: 840,
    },
  },
  one_vs_one: {
    ...defaultPreset,
    label: '1 vs 1',
    Renderer: OneVsOneOverlay,
    css: {
      '--player-transition': '0s',
      '--fade-transition': '0s',
      '--detail-transition': '0s',
    },
    layout: {
      ...defaultPreset.layout,
      focusedXPadding: 100,
    },
  },
};
