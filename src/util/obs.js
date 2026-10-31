import OBSWebSocket from 'obs-websocket-js';
import { totalMatchupScores } from './matchupScores.mjs';

const obs = new OBSWebSocket();

export async function connectObs(url, password) {
  await obs.connect(url, password); // e.g. 'ws://127.0.0.1:4455'
}

export async function disconnectObs() {
  await obs.disconnect();
}

export function onObsConnectionClosed(callback) {
  obs.on('ConnectionClosed', callback);
  return () => obs.off('ConnectionClosed', callback);
}

export async function setText(inputName, text) {
  await obs.call('SetInputSettings', {
    inputName,
    inputSettings: { text },
  });
}

export async function fixTracker(sourceName, sceneName, positionX) {
  const { sceneItemId } = await obs.call('GetSceneItemId', {
    sceneName,
    sourceName,
  });

  await obs.call('SetSceneItemTransform', {
    sceneName,
    sceneItemId,
    sceneItemTransform: {
      positionX,
    },
  });
}

export async function setBrowserSourceUrl(inputName, url) {
  await obs.call('SetInputSettings', {
    inputName,
    inputSettings: { url },
  });
}

export async function setMatchupScores(matchups) {
  const totals = totalMatchupScores(matchups);

  await Promise.all([
    setText('scoreleft', String(totals.left)),
    setText('scoreright', String(totals.right)),
  ]);
}
