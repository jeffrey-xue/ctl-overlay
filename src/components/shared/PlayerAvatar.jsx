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
    opacity: eliminated ? 0.3 : 1,
  };

  return (
    <div className="player-avatar">
      {avatarUrl ? (
        <img className="player-avatar-image" alt="Player avatar" src={avatarUrl} style={style} />
      ) : (
        <div className="player-avatar-image" style={style} />
      )}
      {banned && (
        <img className="player-avatar-ban-icon" src={getAssetUrl(banIconPath)} alt="Banned" />
      )}
    </div>
  );
};

export default PlayerAvatar;
