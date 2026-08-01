export function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.trim();
  return message || fallback;
}

export function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  return new Error(fallback, { cause: error });
}

export function createAbortError(message: string): DOMException {
  return new DOMException(message, 'AbortError');
}
