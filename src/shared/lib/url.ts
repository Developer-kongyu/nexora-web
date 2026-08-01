export function canonicalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const explicitScheme = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (explicitScheme && explicitScheme !== 'http' && explicitScheme !== 'https') {
    throw new TypeError('Only HTTP and HTTPS URLs are supported');
  }

  const parsed = new URL(explicitScheme ? trimmed : `https://${trimmed}`);
  const isHttpProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  if (!isHttpProtocol || !parsed.hostname) {
    throw new TypeError('Invalid HTTP URL');
  }

  parsed.hash = '';
  const canonical = parsed.toString();
  return parsed.pathname === '/' && !parsed.search ? canonical.replace(/\/$/, '') : canonical;
}

export function isValidHttpUrlInput(value: string): boolean {
  try {
    canonicalizeHttpUrl(value);
    return true;
  } catch {
    return false;
  }
}

export function getUrlHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}
