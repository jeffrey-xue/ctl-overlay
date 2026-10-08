const LeagueStats = ({ leagueStats, show, className = '' }) => {
  if (!leagueStats) return null;

  const visibilityClass = show ? 'league-stats--visible' : '';

  return (
    <div className={`league-stats ${visibilityClass} ${className}`.trim()} data-visible={show}>
      <div className={`league-stats-rank ${show ? 'is-visible' : ''}`}>
        <img
          className="league-stats-icon"
          src={`https://tetr.io/res/league-ranks/${leagueStats.rank}.png`}
        />
        <div className="league-stats-rating">
          {leagueStats.tr?.toFixed(0)}
          <span className="league-stats-tr-label">TR</span>
        </div>
      </div>
      <div className={`league-stats-line ${show ? 'is-visible' : ''}`} />
      <div className={`league-stats-details ${show ? 'is-visible' : ''}`}>
        <div>
          <span>{leagueStats.apm?.toFixed(0)}</span> APM
        </div>
        <div>
          <span>{leagueStats.pps?.toFixed(2)}</span> PPS
        </div>
        <div>
          <span>{leagueStats.vs?.toFixed(0)}</span> VS
        </div>
      </div>
    </div>
  );
};

export default LeagueStats;
