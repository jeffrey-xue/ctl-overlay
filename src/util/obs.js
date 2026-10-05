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
