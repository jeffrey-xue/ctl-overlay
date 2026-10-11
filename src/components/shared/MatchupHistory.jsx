import './MatchupHistory.css';

const FRAME_URL = `${import.meta.env.BASE_URL}tws/twsavatarframe_min.png`;
const UNAVAILABLE_URL = `${import.meta.env.BASE_URL}tws/avatarunavailable.png`;
const MAX_MATCHUPS = 5;

const formatScore = (score) => {
  const text = String(score ?? '').trim();
  return text === '' ? '0' : text;
};

// One avatar: minimal frame + avatar when a name is set, "unavailable" frame when it is empty.
const HistoryAvatar = ({ name, avatarUrl }) => {
  if (!name?.trim()) {
    return (
      <div className="tws-history-avatar">
        <img className="tws-history-frame-image" src={UNAVAILABLE_URL} alt="" />
      </div>
    );
  }

  return (
    <div className="tws-history-avatar">
      <img className="tws-history-frame-image" src={FRAME_URL} alt="" />
      <div className="tws-history-avatar-slot">
        {avatarUrl && <img className="tws-history-avatar-image" src={avatarUrl} alt="" />}
      </div>
    </div>
  );
};

const hasName = (name) => Boolean(name?.trim());

const TwsMatchupHistory = ({ matchups = [] }) => {
  const visibleMatchups = matchups
    .filter((m) => hasName(m.leftPlayer) || hasName(m.rightPlayer))
    .slice(0, MAX_MATCHUPS);

  // Nothing to show: skip the container
  if (visibleMatchups.length === 0) return null;

  return (
    <div className="tws-matchup-history">
      {visibleMatchups.map((matchup, index) => (
        <div className="tws-history-column" key={index}>
          <HistoryAvatar name={matchup.leftPlayer} avatarUrl={matchup.leftAvatarUrl} />
          <div className="tws-history-scores">
            <span className="tws-history-score-num">{formatScore(matchup.leftScore)}</span>
            <span className="tws-history-divider">-</span>
            <span className="tws-history-score-num">{formatScore(matchup.rightScore)}</span>
          </div>
          <HistoryAvatar name={matchup.rightPlayer} avatarUrl={matchup.rightAvatarUrl} />
        </div>
      ))}
    </div>
  );
};

export default TwsMatchupHistory;
