/**
 * Mirror the app's telemetry choice onto the connected daemon, which sends
 * its own anonymous usage data (reachy_mini#1472). Kept out of `index.ts`:
 * the store imports that module, and `config/daemon` imports the store.
 */
import { DAEMON_CONFIG, buildApiUrl, fetchWithTimeout } from '../../config/daemon';
import { isTelemetryEnabled } from './index';

/** Best effort: daemons older than the telemetry API answer 404. */
export async function setDaemonTelemetry(enabled: boolean): Promise<void> {
  try {
    const response = await fetchWithTimeout(
      buildApiUrl('/api/telemetry'),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      },
      DAEMON_CONFIG.TIMEOUTS.COMMAND,
      { label: `${enabled ? 'Enable' : 'Disable'} daemon telemetry` }
    );
    if (!response.ok && response.status !== 404) {
      console.warn(`[Telemetry] Daemon refused the choice: ${response.status}`);
    }
  } catch (error) {
    console.warn('[Telemetry] Could not reach the daemon:', error);
  }
}

/**
 * Carry an earlier opt-out over to a daemon we just connected to. Never push
 * "on": the robot may have been opted out from another client.
 */
export async function syncOptOutToDaemon(): Promise<void> {
  if (isTelemetryEnabled()) return;
  await setDaemonTelemetry(false);
}
