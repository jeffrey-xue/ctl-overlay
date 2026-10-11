import { useEffect, useState } from 'react';
import './UpcomingMatches.css';

const CONFIG_STORAGE_KEY = 'ctl-player-overlay-config';
const FRAME_URL = `${import.meta.env.BASE_URL}tws/twsupcoming.png`;

const readUpcomingMatches = () => {
  const config = JSON.parse(window.localStorage.getItem(CONFIG_STORAGE_KEY) || '{}');
  return Array.isArray(config.matches) ? config.matches : [];
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
          {team?.team && <div className="tws-upcoming-team-name">{team.team}</div>}
        </div>
      );
    })}
  </article>
);

const UpcomingMatches = () => {
  const [matches, setMatches] = useState(readUpcomingMatches);
  const upcomingMatches = matches.filter((match) => match?.team1?.team || match?.team2?.team);

  useEffect(() => {
    const updateMatches = () => setMatches(readUpcomingMatches());
    window.addEventListener('storage', updateMatches);
    return () => window.removeEventListener('storage', updateMatches);
  }, []);

  return (
    <main className="upcoming-page">
      {upcomingMatches.length > 0 && (
        <section className="tws-upcoming-matchups" aria-label="Upcoming matches">
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
