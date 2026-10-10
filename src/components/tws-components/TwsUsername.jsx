import { useRef } from 'react';
import { useShrinkToFit } from '../../hooks/useShrinkToFit';

const TwsUsername = ({ name, teamColor, teamIndex, focused, eliminated, children }) => {
  const focusedNameRef = useRef(null);
  const username = name?.toUpperCase() ?? '';
  useShrinkToFit(focusedNameRef, username);

  return (
    <div className={`tws-username tws-username--team-${teamIndex}${focused ? ' is-focused' : ''}`}>
      <span className="tws-username-roster" style={{ color: teamColor }}>
        {username}
      </span>
      <div className="tws-focused-panel">
        {children}
        <span className="tws-username-focused" style={{ color: teamColor }} ref={focusedNameRef}>
          {username}
        </span>
      </div>
    </div>
  );
};

export default TwsUsername;
