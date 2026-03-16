/**
 * SAI Check 7: SQL/Command injection detection.
 * Detects template literals combined with SQL keywords or shell commands.
 * These patterns are REAL and IMPLEMENTED.
 */

import type { Finding } from '../types.js';

/**
 * SQL injection patterns — detect template literals or string concatenation
 * combined with SQL keywords.
 */
const SQL_INJECTION_PATTERNS: { name: string; pattern: RegExp; description: string }[] = [
  {
    name: 'template_literal_sql',
    pattern: /`[^`]*\$\{[^}]+\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b[^`]*`/gi,
    description: 'Template literal with SQL keyword — potential SQL injection',
  },
  {
    name: 'sql_keyword_in_template',
    pattern: /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b[^`]*\$\{[^}]+\}[^`]*`/gi,
    description: 'SQL keyword with template literal interpolation — potential SQL injection',
  },
  {
    name: 'string_concat_sql',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*\+\s*(?:req|request|params|query|body|input|user)/gi,
    description: 'SQL statement with string concatenation from user input',
  },
  {
    name: 'raw_query_interpolation',
    pattern: /\.(?:query|execute|raw)\s*\(\s*`[^`]*\$\{/g,
    description: 'Raw database query with template literal interpolation',
  },
];

/**
 * Command injection patterns — detect template literals or concatenation
 * with shell execution functions.
 */
const COMMAND_INJECTION_PATTERNS: { name: string; pattern: RegExp; description: string }[] = [
  {
    name: 'exec_template_literal',
    pattern: /(?:exec|execSync|spawn|spawnSync|execFile)\s*\(\s*`[^`]*\$\{/g,
    description: 'Shell execution with template literal interpolation — command injection risk',
  },
  {
    name: 'exec_string_concat',
    pattern: /(?:exec|execSync|spawn|spawnSync|execFile)\s*\([^)]*\+\s*(?:req|request|params|query|body|input|user)/gi,
    description: 'Shell execution with string concatenation from user input',
  },
  {
    name: 'eval_usage',
    pattern: /\beval\s*\(\s*(?:req|request|params|query|body|input|user)/gi,
    description: 'eval() with user-controlled input — code injection risk',
  },
];

export function checkSecurityInjection(content: string, path: string): Finding[] {
  const findings: Finding[] = [];
  const allPatterns = [...SQL_INJECTION_PATTERNS, ...COMMAND_INJECTION_PATTERNS];

  for (const { name, pattern, description } of allPatterns) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      findings.push({
        id: `sai-injection-${name}-${path}-${line}`,
        type: 'security',
        severity: 'CRITICAL',
        file: path,
        line,
        description,
        suggestion: 'Use parameterized queries for SQL. Use allowlists for shell commands. Never interpolate user input directly.',
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  return findings;
}
