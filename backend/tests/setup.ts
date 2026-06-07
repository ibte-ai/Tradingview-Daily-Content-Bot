// Test setup — load env vars for test environment
process.env.NODE_ENV = 'development';
process.env.API_SECRET_KEY = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54322/chartpost';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '4001';
process.env.FRONTEND_URL = 'http://localhost:3000';
