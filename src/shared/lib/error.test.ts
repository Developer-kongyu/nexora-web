import { createAbortError, getErrorMessage, toError } from './error';

describe('getErrorMessage', () => {
  it('returns the message from an Error instance', () => {
    expect(getErrorMessage(new Error('保存失败'), '默认提示')).toBe('保存失败');
  });

  it('uses the fallback for empty Error messages', () => {
    expect(getErrorMessage(new Error('   '), '默认提示')).toBe('默认提示');
  });

  it('uses the fallback for unknown thrown values', () => {
    expect(getErrorMessage({ reason: 'offline' }, '默认提示')).toBe('默认提示');
  });
});

describe('toError', () => {
  it('preserves an existing Error instance', () => {
    const error = new Error('请求失败');
    expect(toError(error, '默认提示')).toBe(error);
  });

  it('normalizes unknown rejection values while preserving the cause', () => {
    const cause = { reason: 'offline' };
    const error = toError(cause, '请求失败');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('请求失败');
    expect(error.cause).toBe(cause);
  });
});

describe('createAbortError', () => {
  it('creates a standards-compatible abort reason', () => {
    const error = createAbortError('操作已取消');

    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe('AbortError');
    expect(error.message).toBe('操作已取消');
  });
});
