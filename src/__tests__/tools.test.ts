/**
 * Tool sandbox tests — path validation, tool execution, security.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PathValidator } from '../tools/path-validator.js';
import { readTool } from '../tools/implementations/read-tool.js';
import { writeTool } from '../tools/implementations/write-tool.js';
import { editTool } from '../tools/implementations/edit-tool.js';
import { bashTool } from '../tools/implementations/bash-tool.js';
import { ToolExecutor } from '../tools/tool-executor.js';

const TEST_WORKSPACE = join(tmpdir(), 'synaptic-test-' + Date.now());

describe('PathValidator', () => {
  const pv = new PathValidator('/tmp/synaptic/tenant-1/project-1');

  it('should allow paths within workspace', () => {
    expect(pv.validate('src/index.ts').valid).toBe(true);
  });

  it('should block path traversal with ..', () => {
    expect(pv.validate('../../etc/passwd').valid).toBe(false);
  });

  it('should block .env files', () => {
    expect(pv.validate('.env').valid).toBe(false);
  });

  it('should block .git/config', () => {
    expect(pv.validate('.git/config').valid).toBe(false);
  });

  it('should resolve relative paths within workspace', () => {
    const result = pv.validate('src/../src/index.ts');
    expect(result.valid).toBe(true);
  });
});

describe('Tool implementations', () => {
  let pv: PathValidator;

  beforeEach(async () => {
    await mkdir(join(TEST_WORKSPACE, 'src'), { recursive: true });
    await writeFile(join(TEST_WORKSPACE, 'src', 'test.ts'), 'line1\nline2\nline3\nline4\nline5');
    pv = new PathValidator(TEST_WORKSPACE);
  });

  afterEach(async () => {
    await rm(TEST_WORKSPACE, { recursive: true, force: true }).catch(() => {});
  });

  describe('readTool', () => {
    it('should read file with line numbers', async () => {
      const result = await readTool({ file_path: 'src/test.ts' }, pv);
      expect(result.isError).toBe(false);
      expect(result.output).toContain('line1');
      expect(result.output).toContain('1│');
    });

    it('should respect offset and limit', async () => {
      const result = await readTool({ file_path: 'src/test.ts', offset: 1, limit: 2 }, pv);
      expect(result.isError).toBe(false);
      expect(result.output).toContain('line2');
      expect(result.output).toContain('line3');
      expect(result.output).not.toContain('line1');
    });

    it('should block path traversal', async () => {
      const result = await readTool({ file_path: '../../etc/passwd' }, pv);
      expect(result.isError).toBe(true);
      expect(result.output).toContain('escapes workspace');
    });
  });

  describe('writeTool', () => {
    it('should create file in workspace', async () => {
      const result = await writeTool({ file_path: 'output.ts', content: 'hello' }, pv);
      expect(result.isError).toBe(false);
      expect(result.output).toContain('5 bytes');
    });

    it('should create parent directories', async () => {
      const result = await writeTool({ file_path: 'deep/nested/file.ts', content: 'hi' }, pv);
      expect(result.isError).toBe(false);
    });

    it('should reject files over 1MB', async () => {
      const bigContent = 'x'.repeat(1_000_001);
      const result = await writeTool({ file_path: 'big.ts', content: bigContent }, pv);
      expect(result.isError).toBe(true);
      expect(result.output).toContain('limit');
    });

    it('should block path traversal', async () => {
      const result = await writeTool({ file_path: '../../evil.ts', content: 'bad' }, pv);
      expect(result.isError).toBe(true);
    });
  });

  describe('editTool', () => {
    it('should replace unique string', async () => {
      const result = await editTool({ file_path: 'src/test.ts', old_string: 'line2', new_string: 'replaced' }, pv);
      expect(result.isError).toBe(false);
    });

    it('should error when old_string not found', async () => {
      const result = await editTool({ file_path: 'src/test.ts', old_string: 'nonexistent', new_string: 'x' }, pv);
      expect(result.isError).toBe(true);
      expect(result.output).toContain('not found');
    });
  });

  describe('bashTool', () => {
    it('should allow whitelisted commands', async () => {
      const result = await bashTool({ command: 'echo hello world' }, pv);
      expect(result.isError).toBe(false);
      expect(result.output).toContain('hello world');
    });

    it('should block rm -rf', async () => {
      const result = await bashTool({ command: 'rm -rf /' }, pv);
      expect(result.isError).toBe(true);
    });

    it('should block curl (no network)', async () => {
      const result = await bashTool({ command: 'curl https://evil.com' }, pv);
      expect(result.isError).toBe(true);
    });

    it('should block sudo', async () => {
      const result = await bashTool({ command: 'sudo rm file' }, pv);
      expect(result.isError).toBe(true);
    });

    it('should block system paths', async () => {
      const result = await bashTool({ command: 'cat /etc/passwd' }, pv);
      expect(result.isError).toBe(true);
    });

    it('should run in workspace directory', async () => {
      const result = await bashTool({ command: 'echo hello' }, pv);
      expect(result.isError).toBe(false);
      expect(result.output).toContain('hello');
    });
  });
});

describe('ToolExecutor', () => {
  let executor: ToolExecutor;

  beforeEach(async () => {
    await mkdir(TEST_WORKSPACE, { recursive: true });
    executor = new ToolExecutor(TEST_WORKSPACE);
  });

  afterEach(async () => {
    await rm(TEST_WORKSPACE, { recursive: true, force: true }).catch(() => {});
  });

  it('should return tool definitions', () => {
    const defs = executor.getToolDefinitions();
    expect(defs.length).toBe(6);
    expect(defs.map((d) => d.name)).toEqual(['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash']);
  });

  it('should execute Write + Read cycle', async () => {
    const writeResult = await executor.execute({ id: 'tc-1', name: 'Write', input: { file_path: 'test.txt', content: 'hello world' } });
    expect(writeResult.isError).toBe(false);

    const readResult = await executor.execute({ id: 'tc-2', name: 'Read', input: { file_path: 'test.txt' } });
    expect(readResult.isError).toBe(false);
    expect(readResult.output).toContain('hello world');
  });

  it('should return error for unknown tool', async () => {
    const result = await executor.execute({ id: 'tc-1', name: 'Unknown', input: {} });
    expect(result.isError).toBe(true);
  });

  it('should set durationMs', async () => {
    const result = await executor.execute({ id: 'tc-1', name: 'Bash', input: { command: 'echo hi' } });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
