import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealtimeProvider } from './RealtimeProvider';

const mocks = vi.hoisted(() => ({
  connect: vi.fn<() => Promise<() => void>>(),
  invalidateQueries: vi.fn(() => Promise.resolve()),
  status: 'authenticated',
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock('@/domains/auth', () => ({
  useAuthStore: (selector: (state: { status: typeof mocks.status }) => unknown) =>
    selector({ status: mocks.status }),
}));

vi.mock('@/domains/notifications', () => ({
  connectNotificationSocket: mocks.connect,
  notificationKeys: { all: ['notifications'] },
}));

function createDeferredConnection() {
  let resolve: ((disconnect: () => void) => void) | undefined;
  const promise = new Promise<() => void>((nextResolve) => {
    resolve = nextResolve;
  });

  return {
    promise,
    resolve(disconnect: () => void) {
      if (!resolve) throw new Error('Deferred connection resolver is unavailable.');
      resolve(disconnect);
    },
  };
}

afterEach(() => {
  mocks.connect.mockReset();
  mocks.invalidateQueries.mockClear();
  mocks.status = 'authenticated';
  vi.restoreAllMocks();
});

describe('RealtimeProvider', () => {
  it('disconnects a connection that resolves after the provider unmounts', async () => {
    const connection = createDeferredConnection();
    const disconnect = vi.fn();
    mocks.connect.mockReturnValue(connection.promise);

    const view = render(
      <RealtimeProvider>
        <span>content</span>
      </RealtimeProvider>,
    );
    view.unmount();

    await act(async () => {
      connection.resolve(disconnect);
      await connection.promise;
    });

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects an established connection when the provider unmounts', async () => {
    const connection = createDeferredConnection();
    const disconnect = vi.fn();
    mocks.connect.mockReturnValue(connection.promise);

    const view = render(
      <RealtimeProvider>
        <span>content</span>
      </RealtimeProvider>,
    );
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));

    await act(async () => {
      connection.resolve(disconnect);
      await connection.promise;
    });
    expect(disconnect).not.toHaveBeenCalled();

    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('does not create a connection for an anonymous session', () => {
    mocks.status = 'anonymous';

    render(
      <RealtimeProvider>
        <span>content</span>
      </RealtimeProvider>,
    );

    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('reports a connection failure while the provider is mounted', async () => {
    const failure = new Error('socket unavailable');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.connect.mockRejectedValue(failure);

    render(
      <RealtimeProvider>
        <span>content</span>
      </RealtimeProvider>,
    );

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'Notification realtime connection failed.',
        failure,
      ),
    );
  });

  it('consumes a late connection failure without logging after unmount', async () => {
    let rejectConnection: ((reason?: unknown) => void) | undefined;
    const connection = new Promise<() => void>((_resolve, reject) => {
      rejectConnection = reject;
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.connect.mockReturnValue(connection);

    const view = render(
      <RealtimeProvider>
        <span>content</span>
      </RealtimeProvider>,
    );
    view.unmount();

    await act(async () => {
      rejectConnection?.(new Error('late failure'));
      await expect(connection).rejects.toThrow('late failure');
    });

    expect(consoleError).not.toHaveBeenCalled();
  });
});
