import { useEffect, useState } from 'react';
import { fetchProxied } from '../util/fetchProxied';

const fetchPlayerProfile = async (username) => {
  const encodedUsername = encodeURIComponent(username.toLowerCase());
  const [leagueRes, userRes] = await Promise.all([
    fetchProxied(`https://ch.tetr.io/api/users/${encodedUsername}/summaries/league`),
    fetchProxied(`https://ch.tetr.io/api/users/${encodedUsername}`),
  ]);

  if (!leagueRes.success || !userRes.success) {
    console.error(`Could not load TETR.IO profile data for "${username}".`);
    return { avatarUrl: null, leagueStats: null };
  }

  const user = userRes.data;
  let avatarUrl = null;
  if (user.avatar_revision) {
    avatarUrl = `https://tetr.io/user-content/avatars/${user._id}.jpg?rv=${user.avatar_revision}`;
  } else if (user.role === 'banned') {
    avatarUrl = 'https://tetr.io/res/avatar-banned.png';
  } else if (user.role !== 'anon') {
    avatarUrl = `data:image/svg+xml;base64,${new window.Identicon(window.MD5(user._id), {
      background: [0x08, 0x0a, 0x06, 255],
      margin: 0.15,
      size: 120,
      brightness: 0.48,
      saturation: 0.65,
      format: 'svg',
    }).toString()}`;
  }

  return { avatarUrl, leagueStats: leagueRes.data };
};

const usePlayerProfiles = (teams) => {
  const [profiles, setProfiles] = useState({});
  const usernames = teams
    .flat()
    .map((player) => player?.name?.trim())
    .filter(Boolean);
  const usernamesKey = [...new Set(usernames.map((name) => name.toLowerCase()))].sort().join('|');

  useEffect(() => {
    let isCurrent = true;
    const uniqueUsernames = usernamesKey.split('|').filter(Boolean);
    setProfiles({});

    Promise.all(
      uniqueUsernames.map(async (username) => {
        try {
          return [username.toLowerCase(), await fetchPlayerProfile(username)];
        } catch (error) {
          console.error(`Could not load TETR.IO profile data for "${username}".`, error);
          return [username.toLowerCase(), { avatarUrl: null, leagueStats: null }];
        }
      })
    ).then((entries) => {
      if (isCurrent) setProfiles(Object.fromEntries(entries));
    });

    return () => {
      isCurrent = false;
    };
  }, [usernamesKey]);

  return profiles;
};

export default usePlayerProfiles;
