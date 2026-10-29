import { useEffect, useRef, useState } from 'react';
import { connectObs, disconnectObs, onObsConnectionClosed } from '../util/obs';

const SETTINGS_KEY = 'ctl-obs-connection';
const RETRY_DELAY_MS = 3000;
const DEFAULT_SETTINGS = { ip: '127.0.0.1', port: '4455', enabled: false };

const readSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch (error) {
    console.error('Could not read saved OBS connection settings.', error);
    return DEFAULT_SETTINGS;
  }
};

const useObsConnection = () => {
  const [settings, setSettings] = useState(readSettings);
  const [status, setStatus] = useState('disconnected');
  const [attempt, setAttempt] = useState(0);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Could not save OBS connection settings.', error);
    }
  }, [settings]);

  useEffect(
    () =>
      onObsConnectionClosed(() => {
        if (statusRef.current !== 'connected') return;
        setStatus('disconnected');
        setAttempt((count) => count + 1);
      }),
    []
  );

  useEffect(() => {
    if (!settings.enabled) return;

    let cancelled = false;
    let retryTimeout;
    setStatus('connecting');
    connectObs(`ws://${settings.ip.trim()}:${settings.port.trim()}`)
      .then(() => {
        if (cancelled) {
          disconnectObs().catch(() => {});
          return;
        }
        setStatus('connected');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('retrying');
        console.error('Could not connect to OBS.', error);
        retryTimeout = setTimeout(() => setAttempt((count) => count + 1), RETRY_DELAY_MS);
      });

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
    };
  }, [settings.enabled, attempt]);

  const updateSettings = (changes) => setSettings((current) => ({ ...current, ...changes }));

  const connect = () => updateSettings({ enabled: true });

  const disconnect = async () => {
    updateSettings({ enabled: false });
    try {
      if (statusRef.current === 'connected') await disconnectObs();
    } catch (error) {
      console.error('Could not disconnect from OBS.', error);
    }
    setStatus('disconnected');
  };

  return { settings, updateSettings, status, connect, disconnect };
};

export default useObsConnection;
