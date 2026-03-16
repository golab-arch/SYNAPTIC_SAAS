/**
 * SAI Check 6: Hardcoded secrets detection.
 * 7 regex patterns to catch common secret leaks.
 * These patterns are REAL and IMPLEMENTED.
 */

import type { Finding } from '../types.js';

/**
 * 7 patterns for detecting hardcoded secrets.
 * Each pattern looks for variable assignments or string literals
 * that commonly contain API keys, tokens, or passwords.
 */
const SECRET_PATTERNS: { name: string; pattern: RegExp; description: string }[] = [
  {
    name: 'api_key_assignment',
    pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"`][A-Za-z0-9_\-]{20,}['"`]/gi,
    description: 'Hardcoded API key detected',
  },
  {
    name: 'secret_assignment',
    pattern: /(?:secret|client[_-]?secret)\s*[:=]\s*['"`][A-Za-z0-9_\-]{16,}['"`]/gi,
    description: 'Hardcoded secret detected',
  },
  {
    name: 'token_assignment',
    pattern: /(?:access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*['"`][A-Za-z0-9_\-.]{20,}['"`]/gi,
    description: 'Hardcoded token detected',
  },
  {
    name: 'password_assignment',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/gi,
    description: 'Hardcoded password detected',
  },
  {
    name: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    description: 'Private key detected in source code',
  },
  {
    name: 'aws_key',
    pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
    description: 'AWS access key detected',
  },
  {
    name: 'connection_string',
    pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/gi,
    description: 'Database connection string with credentials detected',
  },
];

export function checkSecuritySecrets(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  for (const { name, pattern, description } of SECRET_PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      findings.push({
        id: `sai-secrets-${name}-${path}-${line}`,
        type: 'security',
        severity: 'CRITICAL',
        file: path,
        line,
        description: `${description} (${name})`,
        suggestion: 'Move secret to environment variable or GCP Secret Manager. Never hardcode credentials.',
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  return findings;
}
