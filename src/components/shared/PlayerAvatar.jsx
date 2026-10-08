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
      {eliminated && (
        <img
          className="player-avatar-eliminated-overlay"
          src={getAssetUrl('tws/twsplayedoverlay.png')}
        />
      )}
      {banned && <img className="player-avatar-ban-icon" src={getAssetUrl(banIconPath)} />}
    </div>
  );
};

export default PlayerAvatar;
