import { useEffect, useState } from 'react';
import TwsUpcomingMatchups from '../components/shared/UpcomingMatchups';
import './UpcomingMatches.css';

const CONFIG_STORAGE_KEY = 'ctl-player-overlay-config';

const readUpcomingMatches = () => {
  const config = JSON.parse(window.localStorage.getItem(CONFIG_STORAGE_KEY) || '{}');
  return Array.isArray(config.matches) ? config.matches : [];
};

const UpcomingMatches = () => {
  const [matches, setMatches] = useState(readUpcomingMatches);

  useEffect(() => {
    const updateMatches = () => setMatches(readUpcomingMatches());
    window.addEventListener('storage', updateMatches);
    return () => window.removeEventListener('storage', updateMatches);
  }, []);

  const hasUpcomingMatches = matches.some((match) => match?.team1?.team || match?.team2?.team);

  return (
    <main className="upcoming-page">
      <h1 className="upcoming-page-title">Upcoming Matches</h1>
      {hasUpcomingMatches ? (
        <TwsUpcomingMatchups matches={matches} />
      ) : (
        <p className="upcoming-page-empty">No upcoming matches available.</p>
      )}
    </main>
  );
};

export default UpcomingMatches;
