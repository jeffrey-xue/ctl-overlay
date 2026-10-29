import { setText, setBrowserSourceUrl, fixTracker } from './obs';

// Mastersheet: https://docs.google.com/spreadsheets/d/1wiONK_ZJGG8KtwXAYbPyos_0rrVJZpzknCsn5urEe6U/
const SPREADSHEET_ID = '1wiONK_ZJGG8KtwXAYbPyos_0rrVJZpzknCsn5urEe6U';
const SHEET_NAME = 'schedule';
export const MIN_START_ROW = 5;
const MATCH_COUNT = 9;
const MATCH_DELAY_MS = 60 * 60 * 1000; // 1 hour
const DATE_PATTERN = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),\d+)?\)$/;

const cellText = (cell) => {
  const value = String(cell?.v ?? cell?.f ?? '').trim();
  return value.startsWith('#') ? '' : value;
};

const pad = (n) => String(n).padStart(2, '0');

// "Date(2026,9,29,13,0,0)" -> { date: "10-29", time: "13:00" }
const parseDateTime = (text) => {
  const parts = DATE_PATTERN.exec(text);
  if (!parts) return { date: '', time: '' };

  const [, , month, day, hours, minutes] = parts;
  return {
    date: `${pad(Number(month) + 1)}-${pad(day)}`,
    time: hours === undefined ? '' : `${pad(hours)}:${pad(minutes)}`,
  };
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

const toTimestamp = (text) => {
  const parts = DATE_PATTERN.exec(text);
  if (!parts) return NaN;
  const [, year, month, day, hours = 0, minutes = 0] = parts;
  return Date.UTC(year, month, day, hours, minutes);
};

export async function guessStartRow(now = Date.now()) {
  const table = await fetchTable({ range: `A${MIN_START_ROW}:A`, headers: '0' });
  const index = table.rows.findIndex(
    (row) => toTimestamp(cellText(row.c?.[0])) >= now - MATCH_DELAY_MS
  );
  return index === -1 ? null : MIN_START_ROW + index;
}

export async function syncGoogleSheet(startRow = MIN_START_ROW) {
  const firstRow = Math.max(MIN_START_ROW, Math.floor(Number(startRow)) || MIN_START_ROW);
  const range = `A${firstRow}:J${firstRow + MATCH_COUNT - 1}`;
  const matchTable = await fetchTable({ range, headers: '0' });

  const matches = Array.from({ length: MATCH_COUNT }, (_, row) => {
    const cells = Array.from({ length: 10 }, (_, col) => cellText(matchTable.rows[row]?.c?.[col]));
    const { date, time } = parseDateTime(cells[0]);
    return {
      date,
      time,
      type: cells[1]
        .split('|')
        .map((part) => part.trim())
        .join('\n')
        .toUpperCase(),
      team1: parseTeam(cells.slice(2, 6)),
      team2: parseTeam(cells.slice(6)),
    };
  });

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
    fixTracker('righttracker', 'player-select', 1921),
    fixTracker('righttracker', 'players-chosen', 1921),

    // Missing seeds and title generation
  ]);
}
