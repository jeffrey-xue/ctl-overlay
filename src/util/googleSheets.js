import { setText, setBrowserSourceUrl } from './obs';

const SPREADSHEET_ID = '1wiONK_ZJGG8KtwXAYbPyos_0rrVJZpzknCsn5urEe6U';
const SHEET_NAME = 'schedule';
const CONFIG_STORAGE_KEY = 'ctl-player-overlay-config';
const MATCHES_RANGE = 'B3:J11';
const MATCH_COUNT = 9;

export const googleSheetData = { matches: [] };

const cellText = (cell) => {
  const value = String(cell?.v ?? cell?.f ?? '').trim();
  return value.startsWith('#') ? '' : value;
};

const parseTeam = ([team, seed, roster, flag]) => ({
  team: team.toUpperCase(),
  seed,
  roster: roster
    .split(',')
    .map((player) => player.trim())
    .filter(Boolean),
  flag,
});

async function fetchTable(extraParams = {}) {
  const params = new URLSearchParams({ tqx: 'out:json', sheet: SHEET_NAME, ...extraParams });
  const response = await fetch(
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?${params}`
  );
  if (!response.ok) {
    throw new Error(`Google Sheets request failed with status ${response.status}.`);
  }

  const body = await response.text();
  const { table, errors } = JSON.parse(body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1));
  if (!table) throw new Error(errors?.[0]?.detailed_message || 'Google Sheets returned no data.');

  return table;
}

export async function syncGoogleSheet() {
  const matchTable = await fetchTable({ range: MATCHES_RANGE, headers: '0' });

  const matches = Array.from({ length: MATCH_COUNT }, (_, row) => {
    const cells = Array.from({ length: 9 }, (_, col) => cellText(matchTable.rows[row]?.c?.[col]));
    return {
      type: cells[0]
        .split('|')
        .map((part) => part.trim())
        .join('\n')
        .toUpperCase(),
      team1: parseTeam(cells.slice(1, 5)),
      team2: parseTeam(cells.slice(5)),
    };
  });

  googleSheetData.matches.splice(0, Infinity, ...matches);

  const savedConfig = JSON.parse(window.localStorage.getItem(CONFIG_STORAGE_KEY) || '{}');
  window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ ...savedConfig, matches }));

  return matches;
}

export async function sendMatchesToObs(matches) {
  const { type, team1, team2 } = matches[0];

  await Promise.all([
    setText('teamnameleft', team1.team),
    setText('teamnameright', team2.team),
    setText('footer-primary', `${team1.team} [${team1.seed}] vs ${team2.team} [${team2.seed}]`),
    setText('footer-secondary', type),
    setBrowserSourceUrl('crestL', team1.flag),
    setBrowserSourceUrl('crestR', team2.flag),
    // Missing seeds and title generation
  ]);
}
