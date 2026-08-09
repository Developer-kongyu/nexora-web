const PENDING_PRIMARY_EMAIL_STORAGE_KEY = 'nexora.pending-primary-email';

interface PendingPrimaryEmailRecord {
  email: string;
  expiresAt: string | null;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function rememberPendingPrimaryEmail(input: PendingPrimaryEmailRecord): void {
  try {
    getStorage()?.setItem(PENDING_PRIMARY_EMAIL_STORAGE_KEY, JSON.stringify(input));
  } catch {
    // 浏览器禁用存储时，验证页仍允许用户手动输入目标邮箱。
  }
}

export function readPendingPrimaryEmail(): string {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(PENDING_PRIMARY_EMAIL_STORAGE_KEY);
    if (!storage || !raw) return '';
    const parsed = JSON.parse(raw) as Partial<PendingPrimaryEmailRecord>;
    if (typeof parsed.email !== 'string' || !parsed.email.trim()) {
      storage.removeItem(PENDING_PRIMARY_EMAIL_STORAGE_KEY);
      return '';
    }
    if (
      parsed.expiresAt !== null &&
      parsed.expiresAt !== undefined &&
      (typeof parsed.expiresAt !== 'string' || Date.parse(parsed.expiresAt) <= Date.now())
    ) {
      storage.removeItem(PENDING_PRIMARY_EMAIL_STORAGE_KEY);
      return '';
    }
    return parsed.email.trim();
  } catch {
    return '';
  }
}

export function clearPendingPrimaryEmail(): void {
  try {
    getStorage()?.removeItem(PENDING_PRIMARY_EMAIL_STORAGE_KEY);
  } catch {
    // 清理失败不覆盖后端已经提交的邮箱身份变更结果。
  }
}
