import { useEffect, useState, useRef } from 'react';
import { useShrinkToFit } from '../hooks/useShrinkToFit';
import './UpcomingMatches.css';

const CONFIG_STORAGE_KEY = 'ctl-player-overlay-config';
const FRAME_URL = `${import.meta.env.BASE_URL}tws/twsupcoming.png`;

const MAX_SINGLE_LINE_CHARS = 10; // names longer than this wrap onto two lines

// Split at the space closest to the middle; null if the name is short or one word
const splitName = (name) => {
  if (name.length <= MAX_SINGLE_LINE_CHARS) return null;
  const mid = name.length / 2;
  let best = -1;
  for (let i = 0; i < name.length; i += 1) {
    if (name[i] === ' ' && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) {
      best = i;
    }
  }
  return best === -1 ? null : [name.slice(0, best), name.slice(best + 1)];
};

const readUpcomingMatches = () => {
  const config = JSON.parse(window.localStorage.getItem(CONFIG_STORAGE_KEY) || '{}');
  return Array.isArray(config.matches) ? config.matches : [];
};

const TeamName = ({ name }) => {
  const ref = useRef(null);
  useShrinkToFit(ref, name);
  const lines = splitName(name);
  return (
    <div
      className={`tws-upcoming-team-name${lines ? ' tws-upcoming-team-name--two-line' : ''}`}
      ref={ref}
    >
      {lines ? (
        <>
          {lines[0]}
          <br />
          {lines[1]}
        </>
      ) : (
        name
      )}
    </div>
  );
};

const UpcomingMatchCard = ({ match }) => (
  <article className="tws-upcoming-match-card">
    <img className="tws-upcoming-match-card-frame" src={FRAME_URL} alt="" />
    {match.type && <div className="tws-upcoming-match-type">{match.type}</div>}
    {[match.team1, match.team2].map((team, index) => {
      const side = index === 0 ? 'left' : 'right';
      return (
        <div className={`tws-upcoming-team tws-upcoming-team--${side}`} key={side}>
          <div className="tws-upcoming-seed">
            <span>SEED</span>
            <span>{team?.seed}</span>
          </div>
          {team?.flag && (
            <img className="tws-upcoming-flag" src={team.flag} alt={team.team || ''} />
          )}
          {team?.team && <TeamName name={team.team} />}
        </div>
      );
    })}
    {match.time && (
      <div className="tws-upcoming-time">
        <span>{match.time}</span>
        <span>UTC</span>
      </div>
    )}
  </article>
);

const UpcomingMatches = () => {
  const [matches, setMatches] = useState(readUpcomingMatches);
  const upcomingMatches = matches
    .filter((match) => match?.team1?.team || match?.team2?.team)
    .slice(0, 6);

  const count = upcomingMatches.length;
  const rows = count > 3 ? 2 : 1;
  const cols = Math.ceil(count / rows);
  const layout = { '--cols': cols, '--rows': rows };

  useEffect(() => {
    const updateMatches = () => setMatches(readUpcomingMatches());
    window.addEventListener('storage', updateMatches);
    return () => window.removeEventListener('storage', updateMatches);
  }, []);

  return (
    <main className="upcoming-page">
      {count > 0 && (
        <section className="tws-upcoming-matchups" style={layout} aria-label="Upcoming matches">
          {upcomingMatches.map((match, index) => (
            <UpcomingMatchCard
              key={`${match.team1?.team ?? ''}-${match.team2?.team ?? ''}-${index}`}
              match={match}
            />
          ))}
        </section>
      )}
    </main>
  );
};

export default UpcomingMatches;
