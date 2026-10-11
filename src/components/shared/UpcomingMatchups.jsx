import './UpcomingMatchups.css';

const FRAME_URL = `${import.meta.env.BASE_URL}tws/twsupcoming.png`;

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

const TwsUpcomingMatchups = ({ matches = [] }) => {
  const upcomingMatches = matches.filter((match) => match?.team1?.team || match?.team2?.team);

  if (upcomingMatches.length === 0) return null;

  return (
    <section className="tws-upcoming-matchups" aria-label="Upcoming matches">
      {upcomingMatches.map((match, index) => (
        <UpcomingMatchCard
          key={`${match.team1?.team ?? ''}-${match.team2?.team ?? ''}-${index}`}
          match={match}
        />
      ))}
    </section>
  );
};

export default TwsUpcomingMatchups;
