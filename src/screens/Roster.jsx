import { useEffect, useRef, useState } from 'react';
import usePlayerProfiles from '../hooks/usePlayerProfiles';
import './Roster.css';

const stripImg = `${import.meta.env.BASE_URL}roster_reveal/playerstrip.png`;
const headerImg = `${import.meta.env.BASE_URL}roster_reveal/countryheader.png`;
const rdIcon = `${import.meta.env.BASE_URL}roster_reveal/200rd.png`;
const seedIcon = `${import.meta.env.BASE_URL}roster_reveal/seed.png`;

const ROSTER_SHEET = {
  sheetId: '1wiONK_ZJGG8KtwXAYbPyos_0rrVJZpzknCsn5urEe6U',
  tab: 'current match ',
  lastRow: 12,
  country: { col: 'B', nameRow: 2, seedRow: 3, flagRow: 4 },
  players: {
    firstRow: 2,
    max: 10,
    cols: {
      name: 'E',
      tr: 'G',
      glicko: 'H',
      rd: 'I',
      seeding: 'J',
    },
  },
  refreshMs: 0,
};

const FALLBACK_FLAG = 'https://hatscripts.github.io/circle-flags/flags/xx.svg';
const TETR_IO_ASSET_PROXY = '/tetrio-assets';
const rosterImageUrl = (url) => {
  if (!import.meta.env.DEV || !url?.startsWith('https://tetr.io/')) return url;
  return `${TETR_IO_ASSET_PROXY}/${url.slice('https://tetr.io/'.length)}`;
};
const rankIconUrl = (rank) => rosterImageUrl(`https://tetr.io/res/league-ranks/${rank}.png`);

const letterToIndex = (letters) =>
  letters
    .toUpperCase()
    .split('')
    .reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;

const indexToLetter = (index) => {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

const cellValue = (rows, col, row) => {
  const cell = rows[row - 1]?.c?.[letterToIndex(col)];
  if (!cell || cell.v === null || cell.v === undefined) return null;
  return cell.v;
};

const toText = (v) => (v === null ? '' : String(v).trim());

const toNumber = (v) => {
  if (v === null) return null;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toBool = (v) =>
  v === true ||
  String(v ?? '')
    .trim()
    .toUpperCase() === 'TRUE';

const formatNumber = (value, decimals = 0) =>
  value === null || value === undefined ? '-' : Number(value).toFixed(decimals);

const fetchRosterSheet = async (config) => {
  const { country, players } = config;
  const allCols = [country.col, ...Object.values(players.cols)];
  const lastCol = indexToLetter(Math.max(...allCols.map(letterToIndex)));

  const url =
    `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq` +
    `?tqx=out:json&headers=0&sheet=${encodeURIComponent(config.tab)}` +
    `&range=A1:${lastCol}${config.lastRow}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheet request failed (${res.status})`);
  const text = await res.text();

  const match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
  if (!match)
    throw new Error(
      'Unexpected Google Sheets response (is the sheet shared as "anyone with the link"?)'
    );
  const json = JSON.parse(match[1]);
  if (json.status === 'error') {
    throw new Error(
      json.errors?.map((e) => e.detailed_message || e.message).join('; ') || 'Sheet error'
    );
  }
  const rows = json.table.rows;

  const seedRaw = cellValue(rows, country.col, country.seedRow);
  if (seedRaw === null) {
    console.warn(
      '[TwsRoster] Seed cell came back empty. If it has a value, format that cell as Plain text.'
    );
  }

  const parsedCountry = {
    name: toText(cellValue(rows, country.col, country.nameRow)),
    seed: toText(seedRaw).replace(/^#/, ''),
    flag: toText(cellValue(rows, country.col, country.flagRow)),
  };

  const c = players.cols;
  const parsedPlayers = [];
  for (let i = 0; i < players.max; i += 1) {
    const row = players.firstRow + i;
    const name = toText(cellValue(rows, c.name, row));
    if (!name) continue;
    parsedPlayers.push({
      name,
      tr: toNumber(cellValue(rows, c.tr, row)),
      glicko: toNumber(cellValue(rows, c.glicko, row)),
      rdOver200: toBool(cellValue(rows, c.rd, row)),
      seeding: toBool(cellValue(rows, c.seeding, row)),
    });
  }

  const glickoOf = (p) => p.glicko ?? -Infinity;
  parsedPlayers.sort((a, b) =>
    glickoOf(a) === glickoOf(b) ? 0 : glickoOf(b) > glickoOf(a) ? 1 : -1
  );

  return { country: parsedCountry, players: parsedPlayers };
};

const useRosterSheet = () => {
  const [state, setState] = useState({ status: 'loading', country: null, players: [] });

  useEffect(() => {
    let isCurrent = true;

    const load = async () => {
      try {
        const data = await fetchRosterSheet(ROSTER_SHEET);
        if (isCurrent) setState({ status: 'ready', ...data });
      } catch (error) {
        console.error('Could not load roster sheet.', error);
        if (isCurrent) setState((prev) => ({ ...prev, status: 'error' }));
      }
    };

    load();
    const timer = ROSTER_SHEET.refreshMs > 0 ? setInterval(load, ROSTER_SHEET.refreshMs) : null;

    return () => {
      isCurrent = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return state;
};

const CountryHeader = ({ country }) => {
  const seedText = country.seed ? `#${country.seed}` : '';

  return (
    <div className="rs-header" style={{ backgroundImage: `url(${headerImg})` }}>
      <img
        className="rs-header__flag"
        src={rosterImageUrl(country.flag || FALLBACK_FLAG)}
        alt=""
        onError={(e) => {
          if (e.currentTarget.src !== FALLBACK_FLAG) e.currentTarget.src = FALLBACK_FLAG;
        }}
      />
      <div className="rs-header__name">{country.name}</div>
      <div className="rs-header__seed">{seedText}</div>
    </div>
  );
};

const PlayerStrip = ({ player, profile }) => {
  const rank = profile?.leagueStats?.rank;

  return (
    <div className="rs-strip" style={{ backgroundImage: `url(${stripImg})` }}>
      {player.rdOver200 ? (
        <img className="rs-strip__rd" src={rdIcon} alt="" />
      ) : player.seeding ? (
        <img className="rs-strip__seed" src={seedIcon} alt="" />
      ) : null}

      <div className="rs-strip__tr">{formatNumber(player.tr)}</div>
      <div className="rs-strip__glicko">{formatNumber(player.glicko)}</div>

      <div className="rs-strip__name">{player.name}</div>

      {profile?.avatarUrl && (
        <img className="rs-strip__avatar" src={rosterImageUrl(profile.avatarUrl)} alt="" />
      )}
      {rank && (
        <img
          className="rs-strip__rank"
          src={rankIconUrl(rank)}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
};

const exportStagePng = async (node, fileHandle) => {
  const { toBlob } = await import('html-to-image');
  await document.fonts?.ready;

  const blob = await toBlob(node, { pixelRatio: 1 });
  if (!blob) throw new Error('Could not generate roster PNG.');

  if (fileHandle) {
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'roster.png';
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

const Roster = () => {
  const stageRef = useRef(null);
  const { status, country, players } = useRosterSheet();

  const profiles = usePlayerProfiles([players]);

  const handleExport = async () => {
    if (!stageRef.current) return;
    try {
      const saveHandle = window.showSaveFilePicker
        ? await window.showSaveFilePicker({
            suggestedName: `${country.seed.padStart(2, '0')}-${country.name}-roster.png`,
            types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
          })
        : null;
      await exportStagePng(stageRef.current, saveHandle);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Could not export roster PNG.', error);
    }
  };

  return (
    <>
      {status === 'ready' && (
        <div className="rs-stage" ref={stageRef}>
          <CountryHeader country={country} />
          <div className="rs-roster">
            {players.map((player) => (
              <PlayerStrip
                key={player.name.toLowerCase()}
                player={player}
                profile={profiles[player.name.toLowerCase()]}
              />
            ))}
          </div>
        </div>
      )}
      <button type="button" className="rs-export" onClick={handleExport}>
        Export PNG
      </button>
    </>
  );
};

export default Roster;
