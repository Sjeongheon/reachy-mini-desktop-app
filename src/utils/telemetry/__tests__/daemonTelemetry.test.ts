import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../config/daemon', () => ({
  DAEMON_CONFIG: { TIMEOUTS: { COMMAND: 10000 } },
  buildApiUrl: (endpoint: string) => `http://robot${endpoint}`,
  fetchWithTimeout: vi.fn(),
}));

vi.mock('../index', () => ({ isTelemetryEnabled: vi.fn() }));

import { fetchWithTimeout } from '../../../config/daemon';
import { isTelemetryEnabled } from '../index';
import { syncOptOutToDaemon } from '../daemonTelemetry';

const fetchMock = vi.mocked(fetchWithTimeout);
const enabledMock = vi.mocked(isTelemetryEnabled);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
});

describe('syncOptOutToDaemon', () => {
  it('never turns the robot on, even when the app is opted in', async () => {
    enabledMock.mockReturnValue(true);
    await syncOptOutToDaemon();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pushes an opt-out to the daemon', async () => {
    enabledMock.mockReturnValue(false);
    await syncOptOutToDaemon();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://robot/api/telemetry');
    expect(options).toMatchObject({ method: 'PUT', body: JSON.stringify({ enabled: false }) });
  });
});
