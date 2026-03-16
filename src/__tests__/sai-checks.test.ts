/**
 * SAI Functional Checks — unit tests.
 */

import { describe, it, expect } from 'vitest';
import { checkUnusedImports } from '../engines/sai/checklist/unused-imports.js';
import { checkUnusedFunctions } from '../engines/sai/checklist/unused-functions.js';
import { checkDuplication } from '../engines/sai/checklist/duplication.js';
import { checkConsistency } from '../engines/sai/checklist/consistency.js';
import { checkErrorHandling } from '../engines/sai/checklist/error-handling.js';
import { checkSecuritySecrets } from '../engines/sai/checklist/security-secrets.js';
import { checkSecurityInjection } from '../engines/sai/checklist/security-injection.js';
import { checkFileSize } from '../engines/sai/checklist/file-size.js';
import { SAIEngine } from '../engines/sai/sai-engine.js';
import { DEFAULT_SAI_CHECKLIST } from '../engines/sai/checklist/index.js';
import { InMemorySAIStorage } from '../storage/memory/memory-sai.js';

describe('SAI Checks', () => {
  describe('unused-imports', () => {
    it('should detect unused named imports', () => {
      const content = `import { useState, useEffect } from 'react';\n\nconst x = useState(0);\nconsole.log(x);`;
      const findings = checkUnusedImports(content, 'test.ts');
      expect(findings.length).toBe(1);
      expect(findings[0]!.description).toContain('useEffect');
    });

    it('should NOT flag used imports', () => {
      const content = `import { useState } from 'react';\n\nconst x = useState(0);`;
      const findings = checkUnusedImports(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });

    it('should detect unused default imports', () => {
      const content = `import React from 'react';\nimport Axios from 'axios';\n\nconst x = React.createElement('div');`;
      const findings = checkUnusedImports(content, 'test.ts');
      expect(findings.length).toBe(1);
      expect(findings[0]!.description).toContain('Axios');
    });
  });

  describe('unused-functions', () => {
    it('should detect unused non-exported functions', () => {
      const content = `function helper() { return 1; }\nexport function main() { return 2; }`;
      const findings = checkUnusedFunctions(content, 'test.ts');
      expect(findings.length).toBe(1);
      expect(findings[0]!.description).toContain('helper');
    });

    it('should NOT flag exported functions', () => {
      const content = `export function doSomething() { return 1; }`;
      const findings = checkUnusedFunctions(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });

    it('should NOT flag called functions', () => {
      const content = `function helper() { return 1; }\nconst x = helper();`;
      const findings = checkUnusedFunctions(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });
  });

  describe('duplication', () => {
    it('should detect duplicated blocks', () => {
      const lines = [
        'const a = 1;',
        'const b = 2;',
        'const c = a + b;',
        'console.log(c);',
        '',
        'const a = 1;',
        'const b = 2;',
        'const c = a + b;',
        'console.log(c);',
      ];
      const findings = checkDuplication(lines.join('\n'), 'test.ts');
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0]!.type).toBe('duplication');
    });

    it('should NOT flag non-duplicated code', () => {
      const content = 'const a = 1;\nconst b = 2;\nconst c = 3;';
      const findings = checkDuplication(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });
  });

  describe('consistency', () => {
    it('should detect non-PascalCase classes', () => {
      const content = 'class myClass { }';
      const findings = checkConsistency(content, 'test.ts');
      expect(findings.length).toBe(1);
      expect(findings[0]!.description).toContain('myClass');
    });

    it('should pass PascalCase classes', () => {
      const content = 'class MyClass { }';
      const findings = checkConsistency(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });
  });

  describe('error-handling', () => {
    it('should detect await without try/catch', () => {
      const content = 'async function foo() {\n  const data = await fetch("/api");\n  return data;\n}';
      const findings = checkErrorHandling(content, 'test.ts');
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0]!.type).toBe('error_handling');
    });

    it('should NOT flag await inside try/catch', () => {
      const content = 'async function foo() {\n  try {\n    const data = await fetch("/api");\n    return data;\n  } catch (e) {\n    throw e;\n  }\n}';
      const findings = checkErrorHandling(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });
  });

  describe('security-secrets', () => {
    it('should detect hardcoded API keys', () => {
      const content = `const apiKey = 'sk-1234567890abcdefghijklmnop';`;
      const findings = checkSecuritySecrets(content, 'test.ts');
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0]!.severity).toBe('CRITICAL');
    });

    it('should NOT flag environment variable usage', () => {
      const content = `const apiKey = process.env.API_KEY;`;
      const findings = checkSecuritySecrets(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });

    it('should detect hardcoded passwords', () => {
      const content = `const password = 'supersecretpassword123';`;
      const findings = checkSecuritySecrets(content, 'test.ts');
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('security-injection', () => {
    it('should detect template literal SQL injection', () => {
      const content = 'const q = `SELECT * FROM users WHERE id = ${userId}`;';
      const findings = checkSecurityInjection(content, 'test.ts');
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0]!.severity).toBe('CRITICAL');
    });

    it('should detect eval usage', () => {
      const content = 'const result = eval(userInput);';
      const findings = checkSecurityInjection(content, 'test.ts');
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('file-size', () => {
    it('should flag files over 500 LOC', () => {
      const content = Array(600).fill('const x = 1;').join('\n');
      const findings = checkFileSize(content, 'test.ts');
      expect(findings.length).toBe(1);
      expect(findings[0]!.type).toBe('maintainability');
    });

    it('should pass files under 500 LOC', () => {
      const content = Array(100).fill('const x = 1;').join('\n');
      const findings = checkFileSize(content, 'test.ts');
      expect(findings).toHaveLength(0);
    });
  });
});

describe('SAIEngine', () => {
  it('should run all checks and calculate score', async () => {
    const engine = new SAIEngine();
    await engine.initialize({
      checklist: DEFAULT_SAI_CHECKLIST,
      severityPenalties: { CRITICAL: -25, HIGH: -15, MEDIUM: -10, LOW: -5 },
      passThreshold: 70,
      maxFileSize: 500_000,
      timeout: 5000,
      extensionWhitelist: ['.ts'],
      excludePatterns: ['node_modules'],
      storage: new InMemorySAIStorage(),
    });

    const result = await engine.audit([
      { path: 'clean.ts', content: 'export function hello() { return "world"; }' },
    ]);

    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.passed).toBe(true);
    expect(result.filesAudited).toBe(1);
  });

  it('should detect security issues and lower score', async () => {
    const engine = new SAIEngine();
    await engine.initialize({
      checklist: DEFAULT_SAI_CHECKLIST,
      severityPenalties: { CRITICAL: -25, HIGH: -15, MEDIUM: -10, LOW: -5 },
      passThreshold: 70,
      maxFileSize: 500_000,
      timeout: 5000,
      extensionWhitelist: ['.ts'],
      excludePatterns: [],
      storage: new InMemorySAIStorage(),
    });

    const result = await engine.audit([
      { path: 'bad.ts', content: `const apiKey = 'sk-ant-1234567890abcdefghij';\nexport function main() { return apiKey; }` },
    ]);

    expect(result.score).toBeLessThan(100);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => f.severity === 'CRITICAL')).toBe(true);
  });

  it('should skip non-whitelisted extensions', async () => {
    const engine = new SAIEngine();
    await engine.initialize({
      checklist: DEFAULT_SAI_CHECKLIST,
      severityPenalties: { CRITICAL: -25, HIGH: -15, MEDIUM: -10, LOW: -5 },
      passThreshold: 70,
      maxFileSize: 500_000,
      timeout: 5000,
      extensionWhitelist: ['.ts'],
      excludePatterns: [],
      storage: new InMemorySAIStorage(),
    });

    const result = await engine.audit([
      { path: 'file.md', content: '# Readme' },
    ]);

    expect(result.filesAudited).toBe(0);
    expect(result.filesSkipped).toBe(1);
  });
});
