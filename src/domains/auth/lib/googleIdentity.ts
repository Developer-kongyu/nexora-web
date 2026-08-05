const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_IDENTITY_SCRIPT_SELECTOR = 'script[data-google-identity-services]';

export interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode: 'popup';
}

interface GoogleButtonConfiguration {
  type: 'standard';
  theme: 'outline';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  logo_alignment: 'left';
  locale: 'zh_CN';
  width: number;
}

export interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (configuration: GoogleIdConfiguration) => void;
      renderButton: (parent: HTMLElement, configuration: GoogleButtonConfiguration) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let scriptPromise: Promise<GoogleIdentityServices> | null = null;
let initializedClientId: string | null = null;
let activeCredentialHandler: ((response: GoogleCredentialResponse) => void) | null = null;

function readLoadedServices(): GoogleIdentityServices | null {
  return window.google?.accounts?.id ? window.google : null;
}

export function loadGoogleIdentityServices(): Promise<GoogleIdentityServices> {
  const loaded = readLoadedServices();
  if (loaded) return Promise.resolve(loaded);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GoogleIdentityServices>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(GOOGLE_IDENTITY_SCRIPT_SELECTOR);
    const script = existing ?? document.createElement('script');

    const handleLoad = () => {
      const services = readLoadedServices();
      if (services) {
        resolve(services);
        return;
      }
      scriptPromise = null;
      reject(new Error('Google Identity Services 加载完成，但浏览器凭据 API 不可用'));
    };
    const handleError = () => {
      scriptPromise = null;
      reject(new Error('Google Identity Services 加载失败，请检查网络或 CSP 配置'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.dataset.googleIdentityServices = 'true';
      document.head.append(script);
    }
  });

  return scriptPromise;
}

export function configureGoogleIdentityServices(
  services: GoogleIdentityServices,
  clientId: string,
  handler: (response: GoogleCredentialResponse) => void,
): () => void {
  activeCredentialHandler = handler;
  if (initializedClientId !== clientId) {
    services.accounts.id.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      callback: (response) => activeCredentialHandler?.(response),
    });
    initializedClientId = clientId;
  }

  return () => {
    if (activeCredentialHandler === handler) activeCredentialHandler = null;
  };
}
