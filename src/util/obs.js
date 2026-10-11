import OBSWebSocket from 'obs-websocket-js';

const obs = new OBSWebSocket();

export async function connectObs(url, password) {
  await obs.connect(url, password); // e.g. 'ws://127.0.0.1:4455'
}

export async function disconnectObs() {
  await obs.disconnect();
}

export async function setText(inputName, text) {
  await obs.call('SetInputSettings', {
    inputName,
    inputSettings: { text },
  });
}

export async function setBrowserSourceUrl(inputName, url) {
  await obs.call('SetInputSettings', {
    inputName,
    inputSettings: { url },
  });
}

export async function setMatchupScores(matchups) {
  const totals = matchups.reduce(
    (result, matchup) => {
      const leftScore = Number(matchup.leftScore);
      const rightScore = Number(matchup.rightScore);
      result.left += Number.isFinite(leftScore) ? leftScore : 0;
      result.right += Number.isFinite(rightScore) ? rightScore : 0;
      return result;
    },
    { left: 0, right: 0 }
  );

  await Promise.all([
    setText('scoreleft', String(totals.left)),
    setText('scoreright', String(totals.right)),
  ]);
}
