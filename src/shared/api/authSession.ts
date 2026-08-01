export interface AuthRefreshContext {
  /**
   * A refresh becomes stale when the user signs out or the local session is
   * explicitly invalidated while the network request is still in flight.
   * Handlers must check this before committing application state.
   */
  isCurrent: () => boolean;
}

type RefreshHandler = (context: AuthRefreshContext) => Promise<string | null>;

let accessToken: string | null = null;
let refreshHandler: RefreshHandler | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let refreshGeneration = 0;
let refreshEnabled = false;

function invalidateRefresh(): void {
  refreshGeneration += 1;
  refreshEnabled = false;
  refreshInFlight = null;
}

export const authSession = {
  getAccessToken: () => accessToken,
  setAccessToken: (token: string) => {
    accessToken = token;
    refreshEnabled = true;
  },
  configureRefresh: (handler: RefreshHandler) => {
    if (refreshHandler !== handler) {
      refreshGeneration += 1;
      refreshInFlight = null;
    }
    refreshHandler = handler;
    refreshEnabled = true;
  },
  unconfigureRefresh: (handler: RefreshHandler) => {
    if (refreshHandler !== handler) return;
    refreshHandler = null;
    invalidateRefresh();
  },
  refresh: (): Promise<string | null> => {
    if (!refreshHandler || !refreshEnabled) return Promise.resolve(null);
    if (refreshInFlight === null) {
      const handler = refreshHandler;
      const generation = refreshGeneration;
      const context: AuthRefreshContext = {
        isCurrent: () => refreshEnabled && generation === refreshGeneration,
      };
      const refreshPromise = handler(context)
        .then((token) => (context.isCurrent() ? token : null))
        .finally(() => {
          if (refreshInFlight === refreshPromise) refreshInFlight = null;
        });
      refreshInFlight = refreshPromise;
    }
    return refreshInFlight;
  },
  invalidateRefresh,
  clear: () => {
    accessToken = null;
    invalidateRefresh();
  },
};
