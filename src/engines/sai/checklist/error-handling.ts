/**
 * SAI Check 5: Error handling presence.
 * Detects async functions without try/catch or .catch().
 * 100% deterministic — regex-based analysis.
 */

import type { Finding } from '../types.js';

/**
 * Strategy:
 * 1. Find all async function/method bodies
 * 2. Check if they contain 'await' statements
 * 3. If they do, verify there's a try/catch wrapping the await
 * 4. Also check for Promise chains without .catch()
 */
export function checkErrorHandling(content: string, path: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split('\n');

  // Check for 'await' outside try/catch blocks
  // Simple heuristic: track try/catch nesting depth per line
  let tryDepth = 0;
  let braceDepth = 0;
  const tryStack: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Track braces
    for (const ch of line) {
      if (ch === '{') {
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        // If we're closing a try block
        if (tryStack.length > 0 && tryStack[tryStack.length - 1] === braceDepth) {
          tryStack.pop();
          tryDepth--;
        }
      }
    }

    // Detect try blocks
    if (/\btry\s*\{/.test(trimmed)) {
      tryDepth++;
      tryStack.push(braceDepth - 1); // The brace we just opened
    }

    // Detect catch blocks (maintain depth)
    if (/\bcatch\s*\(/.test(trimmed)) {
      // catch follows try — depth already tracked
    }

    // Check for await without try/catch
    if (/\bawait\b/.test(trimmed) && tryDepth === 0) {
      // Skip if line is in a comment
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
      // Skip if it's inside .catch() chain
      if (/\.catch\s*\(/.test(trimmed)) continue;

      findings.push({
        id: `sai-error-handling-${path}-${i + 1}`,
        type: 'error_handling',
        severity: 'HIGH',
        file: path,
        line: i + 1,
        description: `'await' without try/catch at line ${i + 1}`,
        suggestion: 'Wrap await calls in try/catch or use .catch() for error handling.',
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  // Check for Promise.all/race/any without catch
  const promiseAllRe = /Promise\.(?:all|race|any|allSettled)\s*\([^)]*\)(?![\s\S]*?\.catch)/g;
  let match: RegExpExecArray | null;
  promiseAllRe.lastIndex = 0;
  while ((match = promiseAllRe.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    // Only flag if not inside try/catch (rough check: no 'try' in preceding 5 lines)
    const precedingLines = lines.slice(Math.max(0, lineNum - 6), lineNum - 1).join(' ');
    if (!/\btry\b/.test(precedingLines)) {
      findings.push({
        id: `sai-error-handling-promise-${path}-${lineNum}`,
        type: 'error_handling',
        severity: 'HIGH',
        file: path,
        line: lineNum,
        description: `Promise combinator without error handling at line ${lineNum}`,
        suggestion: 'Add .catch() or wrap in try/catch.',
        status: 'OPEN',
        detectedInCycle: 0,
      });
    }
  }

  return findings;
}
