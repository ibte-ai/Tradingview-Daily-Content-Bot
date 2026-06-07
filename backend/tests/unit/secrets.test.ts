import { assertNoSecretsExposed, maskSecret, getSafeEnvSummary } from '../../src/utils/secrets';

describe('Secrets Utility', () => {
  describe('assertNoSecretsExposed', () => {
    it('should return safe when no secrets are in the content', () => {
      const result = assertNoSecretsExposed('This is a normal log message');

      expect(result.safe).toBe(true);
      expect(result.exposedKeys).toEqual([]);
    });

    it('should detect exposed API keys', () => {
      const originalKey = process.env.API_SECRET_KEY;
      process.env.API_SECRET_KEY = 'super-secret-api-key-12345678';

      const result = assertNoSecretsExposed(
        'Error response contains super-secret-api-key-12345678 in body'
      );

      expect(result.safe).toBe(false);
      expect(result.exposedKeys).toContain('API_SECRET_KEY');

      process.env.API_SECRET_KEY = originalKey;
    });

    it('should not flag short secrets (less than 8 chars)', () => {
      const originalKey = process.env.API_SECRET_KEY;
      process.env.API_SECRET_KEY = 'short';

      const result = assertNoSecretsExposed('The word short appears here');

      expect(result.safe).toBe(true);

      process.env.API_SECRET_KEY = originalKey;
    });
  });

  describe('maskSecret', () => {
    it('should mask a long secret showing first 4 and last 4', () => {
      const masked = maskSecret('my-super-secret-api-key');

      expect(masked).toBe('my-s...-key');
      expect(masked).not.toContain('super-secret');
    });

    it('should fully mask a short secret', () => {
      const masked = maskSecret('short');

      expect(masked).toBe('****');
    });

    it('should handle empty string', () => {
      const masked = maskSecret('');

      expect(masked).toBe('****');
    });
  });

  describe('getSafeEnvSummary', () => {
    it('should not contain any actual secret values', () => {
      const summary = getSafeEnvSummary();
      const summaryStr = JSON.stringify(summary);

      // Should only contain status indicators, not actual values
      expect(summaryStr).not.toContain(process.env.API_SECRET_KEY);
      expect(summaryStr).not.toContain(process.env.DATABASE_URL);

      // Should contain status indicators
      const values = Object.values(summary);
      for (const value of values) {
        expect(
          value === '✅ configured' ||
          value === '❌ missing' ||
          ['development', 'staging', 'production'].includes(value) ||
          /^\d+$/.test(value) ||
          ['gemini', 'openai'].includes(value)
        ).toBe(true);
      }
    });
  });
});
