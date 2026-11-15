import { useMemo, useRef, useState } from 'react';
import { load as loadYaml } from 'js-yaml';
import usePlayerProfiles from '../hooks/usePlayerProfiles';
import weekbreakYaml from '../data/weekbreak.yaml?raw';
import './MatchSummary.css';

const templateImg = `${import.meta.env.BASE_URL}match_summary/matchhighlight.png`;

const FALLBACK_FLAG = 'https://hatscripts.github.io/circle-flags/flags/xx.svg';
const TETR_IO_ASSET_PROXY = '/tetrio-assets';
const rosterImageUrl = (url) => {
  if (!import.meta.env.DEV || !url?.startsWith('https://tetr.io/')) return url;
  return `${TETR_IO_ASSET_PROXY}/${url.slice('https://tetr.io/'.length)}`;
};
const rankIconUrl = (rank) => rosterImageUrl(`https://tetr.io/res/league-ranks/${rank}.png`);

const MATCHES = loadYaml(weekbreakYaml).matches;

/* ───────────────────────── export helpers ───────────────────────── */

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// e.g. 01-week2-group-h-norway-vs-spain.png
const matchFileName = (match, index) =>
  `${String(index + 1).padStart(2, '0')}-week${match.week}-group-${slug(match.group)}-` +
  `${slug(match.left.country)}-vs-${slug(match.right.country)}.png`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

// Resolves true when predicate() turns true, false if it times out.
const waitFor = async (predicate, timeoutMs = 30000) => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) return false;
    await sleep(100);
  }
  return true;
};

const waitForImages = (node) =>
  Promise.all(
    [...node.querySelectorAll('img')].map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
    )
  );

const renderStageBlob = async (node) => {
  const { toBlob } = await import('html-to-image');
  await document.fonts?.ready;
  await waitForImages(node);

  const blob = await toBlob(node, { pixelRatio: 1 });
  if (!blob) throw new Error('Could not generate PNG.');
  return blob;
};

const writeToHandle = async (fileHandle, blob) => {
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = name;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ───────────────────────── pieces ───────────────────────── */

const TeamHeader = ({ side, team }) => (
  <div className={`ms-team ms-team--${side}`}>
    <img
      className="ms-team__flag"
      src={rosterImageUrl(team.flag || FALLBACK_FLAG)}
      alt=""
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_FLAG) e.currentTarget.src = FALLBACK_FLAG;
      }}
    />
    <div className="ms-team__name">{team.country}</div>
    <div className="ms-team__score">{team.score}</div>
  </div>
);

const PlayerCell = ({ side, name, profile }) => {
  const rank = profile?.leagueStats?.rank;

  return (
    <div className={`ms-player ms-player--${side}`}>
      {profile?.avatarUrl && (
        <img className="ms-player__avatar" src={rosterImageUrl(profile.avatarUrl)} alt="" />
      )}
      {rank && (
        <img
          className="ms-player__rank"
          src={rankIconUrl(rank)}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="ms-player__name">{name}</div>
    </div>
  );
};

// A bought counterpick: final scores with the original score as a superscript between them,
// e.g.  6 ⁷⁻⁴ 7  in a white box over the row's centre.
const CounterpickScore = ({ game }) => {
  const [origLeft, origRight] = game.counterpick.original_score;

  return (
    <div className="ms-counterpick">
      <span className="ms-counterpick__score">{game.left.score}</span>
      <span className="ms-counterpick__original">
        {origLeft} - {origRight}
      </span>
      <span className="ms-counterpick__score">{game.right.score}</span>
    </div>
  );
};

/* ───────────────────────── page ───────────────────────── */

/**
 * One fixed 1920x1080 stage showing one match at a time. Use Prev/Next to look at a match,
 * "Export PNG" for the one on screen, or "Export all" to write one PNG per match.
 * Profiles are fetched per match (10 players) so TETR.IO is never hit with every player at once.
 */
const MatchSummary = () => {
  const stageRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const match = MATCHES[index];

  const teams = useMemo(
    () => [
      match.games.map((g) => ({ name: g.left.player })),
      match.games.map((g) => ({ name: g.right.player })),
    ],
    [match]
  );
  const profiles = usePlayerProfiles(teams);

  // usePlayerProfiles stores an entry for every player, even when a lookup fails.
  const ready = teams.flat().every((p) => profiles[p.name.trim().toLowerCase()]);

  // Latest values for the async export loop, which outlives individual renders.
  const live = useRef({ index, ready });
  live.current = { index, ready };

  const handleExportOne = async () => {
    if (!stageRef.current || busy) return;
    setBusy(true);
    try {
      const name = matchFileName(match, index);
      const handle = window.showSaveFilePicker
        ? await window.showSaveFilePicker({
            suggestedName: name,
            types: [{ description: 'PNG image', accept: { 'image/png': ['.png'] } }],
          })
        : null;
      const blob = await renderStageBlob(stageRef.current);
      if (handle) await writeToHandle(handle, blob);
      else downloadBlob(blob, name);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Could not export match PNG.', error);
    } finally {
      setBusy(false);
    }
  };

  const handleExportAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Pick a folder once (Chromium); otherwise fall back to one download per match.
      const dir = window.showDirectoryPicker
        ? await window.showDirectoryPicker({ mode: 'readwrite' })
        : null;

      for (let i = 0; i < MATCHES.length; i += 1) {
        setIndex(i);
        const loaded = await waitFor(() => live.current.index === i && live.current.ready);
        if (!loaded)
          console.warn(`Match ${i + 1}: profiles did not finish loading, exporting anyway.`);
        await nextFrame(); // let layout and text-fit settle

        const name = matchFileName(MATCHES[i], i);
        const blob = await renderStageBlob(stageRef.current);
        if (dir) {
          const fileHandle = await dir.getFileHandle(name, { create: true });
          await writeToHandle(fileHandle, blob);
        } else {
          downloadBlob(blob, name);
          await sleep(300);
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Could not export match PNGs.', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="ms-stage" ref={stageRef} style={{ backgroundImage: `url(${templateImg})` }}>
        <TeamHeader side="left" team={match.left} />
        <TeamHeader side="right" team={match.right} />

        {match.games.map((game, i) => (
          <div
            className={`ms-row${game.counterpick ? ' ms-row--counterpick' : ''}`}
            key={`${game.left.player}-${game.right.player}-${i}`}
          >
            <PlayerCell
              side="left"
              name={game.left.player}
              profile={profiles[game.left.player.toLowerCase()]}
            />
            <PlayerCell
              side="right"
              name={game.right.player}
              profile={profiles[game.right.player.toLowerCase()]}
            />
            {game.counterpick ? (
              <CounterpickScore game={game} />
            ) : (
              <>
                <div className="ms-score ms-score--left">{game.left.score}</div>
                <div className="ms-score ms-score--right">{game.right.score}</div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="ms-controls">
        <button type="button" disabled={busy || index === 0} onClick={() => setIndex(index - 1)}>
          Prev
        </button>
        <span className="ms-controls__count">
          {index + 1} / {MATCHES.length}
        </span>
        <button
          type="button"
          disabled={busy || index === MATCHES.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Next
        </button>
        <button type="button" disabled={busy} onClick={handleExportOne}>
          Export PNG
        </button>
        <button type="button" disabled={busy} onClick={handleExportAll}>
          Export all
        </button>
      </div>
    </>
  );
};

export default MatchSummary;
