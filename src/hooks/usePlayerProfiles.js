import { useEffect, useState } from 'react';
import { fetchProxied } from '../util/fetchProxied';

const TR_CACHE_KEY = 'ctl-player-tr-cache-v1';
const profileRequests = new Map();

const readTRCache = () => {
  try {
    const cache = JSON.parse(localStorage.getItem(TR_CACHE_KEY) || '{}');
    return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {};
  } catch (error) {
    console.error('Could not read cached TETR.IO TR values.', error);
    return {};
  }
};

const writeCachedTR = (username, tr) => {
  try {
    const cache = readTRCache();
    cache[username] = tr;
    localStorage.setItem(TR_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Could not save cached TETR.IO TR value.', error);
  }
};

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

const loadPlayerProfile = (username) => {
  const key = username.toLowerCase();
  const existingRequest = profileRequests.get(key);
  if (existingRequest) return existingRequest;

  const request = fetchPlayerProfile(username)
    .then((profile) => {
      if (Number.isFinite(profile.leagueStats?.tr)) {
        writeCachedTR(key, profile.leagueStats.tr);
      }
      return profile;
    })
    .finally(() => profileRequests.delete(key));
  profileRequests.set(key, request);
  return request;
};

const usePlayerProfiles = (teams) => {
  const [profiles, setProfiles] = useState({});
  const rosterKey = JSON.stringify(
    teams.map((team) => team.map((player) => player?.name?.trim().toLowerCase() ?? ''))
  );

  useEffect(() => {
    let isCurrent = true;
    const uniqueUsernames = [...new Set(JSON.parse(rosterKey).flat().filter(Boolean))].sort();
    const cache = readTRCache();
    const cachedProfiles = Object.fromEntries(
      uniqueUsernames.flatMap((username) => {
        const tr = cache[username];
        return Number.isFinite(tr)
          ? [[username, { avatarUrl: null, leagueStats: { tr } }]]
          : [];
      })
    );
    setProfiles(cachedProfiles);

    Promise.all(
      uniqueUsernames.map(async (username) => {
        const cachedProfile = cachedProfiles[username];

        try {
          const profile = await loadPlayerProfile(username);
          return [
            username,
            profile.leagueStats?.tr == null && cachedProfile
              ? { ...profile, leagueStats: cachedProfile.leagueStats }
              : profile,
          ];
        } catch (error) {
          console.error(`Could not load TETR.IO profile data for "${username}".`, error);
          return [username, cachedProfile ?? { avatarUrl: null, leagueStats: null }];
        }
      })
    ).then((entries) => {
      if (isCurrent) setProfiles(Object.fromEntries(entries));
    });

    return () => {
      isCurrent = false;
    };
  }, [rosterKey]);

  return profiles;
};

export default usePlayerProfiles;
