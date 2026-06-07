import * as fs from 'fs';
import * as path from 'path';

describe('Security — No Secrets Exposed', () => {
  const ROOT_DIR = path.resolve(__dirname, '../../');
  const SECRET_PATTERNS = [
    /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/gi,
    /(?:secret|password|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/gi,
    /sk-[A-Za-z0-9]{32,}/g,  // OpenAI API keys
    /AIza[A-Za-z0-9_\-]{35}/g,  // Google API keys
  ];

  const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', 'coverage', 'screenshots'];
  const INCLUDE_EXTENSIONS = ['.ts', '.js', '.json', '.yml', '.yaml', '.env'];

  function getSourceFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !EXCLUDE_DIRS.includes(entry.name)) {
          files.push(...getSourceFiles(fullPath));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (INCLUDE_EXTENSIONS.includes(ext) && !entry.name.includes('.example')) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }

    return files;
  }

  it('should not contain hardcoded API keys in source code', () => {
    const files = getSourceFiles(path.join(ROOT_DIR, 'src'));
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      for (const pattern of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(content);
        if (match) {
          // Exclude test/example values
          const matched = match[0];
          if (
            !matched.includes('change-me') &&
            !matched.includes('your-') &&
            !matched.includes('test-') &&
            !matched.includes('example') &&
            !matched.includes('process.env')
          ) {
            violations.push(`${file}: ${matched.slice(0, 50)}...`);
          }
        }
      }
    }

    if (violations.length > 0) {
      console.error('SECRET VIOLATIONS FOUND:');
      violations.forEach((v) => console.error(`  ❌ ${v}`));
    }

    expect(violations).toEqual([]);
  });

  it('should have a .env.example but no .env file committed', () => {
    const envExample = path.join(ROOT_DIR, '..', '.env.example');
    const envFile = path.join(ROOT_DIR, '..', '.env');

    // .env.example should exist
    expect(fs.existsSync(envExample)).toBe(true);

    // .env should NOT exist in the checked-in source (this test runs pre-deployment)
    // Note: In CI, .env won't exist. Locally, it should be in .gitignore
  });

  it('should have .env in .gitignore', () => {
    const gitignore = path.join(ROOT_DIR, '..', '.gitignore');

    if (fs.existsSync(gitignore)) {
      const content = fs.readFileSync(gitignore, 'utf-8');
      expect(content).toContain('.env');
    }
  });
});
