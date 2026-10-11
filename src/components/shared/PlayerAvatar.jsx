import './PlayerAvatar.css';

const getAssetUrl = (path) => {
  if (/^(?:[a-z]+:|data:|blob:)/i.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
};

const PlayerAvatar = ({
  avatarUrl,
  teamColor,
  eliminated,
  banned,
  banIconPath,
  teamColorBorder = true,
}) => {
  const style = {
    borderColor: teamColorBorder ? teamColor || 'white' : 'transparent',
  };

  return (
    <div className="player-avatar">
      {avatarUrl ? (
        <img className="player-avatar-image" src={avatarUrl} style={style} />
      ) : (
        <div className="player-avatar-image" style={style} />
      )}
      <img
        className={`player-avatar-eliminated-overlay${eliminated ? ' is-played' : ''}`}
        src={getAssetUrl('tws/twsplayedoverlay.png')}
      />
      <img
        className={`player-avatar-ban-icon${banned ? ' is-banned' : ''}`}
        src={getAssetUrl(banIconPath)}
      />
    </div>
  );
};

export default PlayerAvatar;
