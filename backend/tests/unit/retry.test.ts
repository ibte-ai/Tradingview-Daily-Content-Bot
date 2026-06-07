import { withRetry } from '../../src/utils/retry';

describe('Retry Utility', () => {
  it('should return result on first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn, 'test');

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 'test', {
      maxAttempts: 3,
      baseDelayMs: 10,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after all attempts exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

    await expect(
      withRetry(fn, 'test', { maxAttempts: 2, baseDelayMs: 10 })
    ).rejects.toThrow('persistent failure');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable errors when retryableErrors is specified', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('auth error'));

    await expect(
      withRetry(fn, 'test', {
        maxAttempts: 3,
        baseDelayMs: 10,
        retryableErrors: ['timeout', 'network'],
      })
    ).rejects.toThrow('auth error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry retryable errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 'test', {
      maxAttempts: 3,
      baseDelayMs: 10,
      retryableErrors: ['timeout', 'network'],
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should call onRetry callback', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    await withRetry(fn, 'test', {
      maxAttempts: 2,
      baseDelayMs: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should respect maxAttempts option', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));

    await expect(
      withRetry(fn, 'test', { maxAttempts: 5, baseDelayMs: 10 })
    ).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(5);
  });
});
