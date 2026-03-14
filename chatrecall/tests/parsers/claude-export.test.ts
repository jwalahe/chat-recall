import { describe, it, expect } from 'vitest';
import { parseClaudeExport } from '../../src/lib/parsers/claude-export';
import sampleData from '../fixtures/claude-export-sample.json';

describe('parseClaudeExport', () => {
  it('parses sample export into conversations', () => {
    const conversations = parseClaudeExport(sampleData);
    expect(conversations).toHaveLength(2);
  });

  it('groups messages by conversation UUID', () => {
    const conversations = parseClaudeExport(sampleData);

    const authConv = conversations.find((c) => c.title === 'Auth Flow Redesign');
    expect(authConv).toBeDefined();
    expect(authConv!.messages).toHaveLength(2);
    expect(authConv!.externalId).toBe('conv-auth-001');

    const pythonConv = conversations.find((c) => c.title === 'Python Setup Help');
    expect(pythonConv).toBeDefined();
    expect(pythonConv!.messages).toHaveLength(2);
    expect(pythonConv!.externalId).toBe('conv-python-001');
  });

  it('normalizes sender to role', () => {
    const conversations = parseClaudeExport(sampleData);
    const authConv = conversations.find((c) => c.title === 'Auth Flow Redesign')!;

    expect(authConv.messages[0].role).toBe('user');
    expect(authConv.messages[1].role).toBe('assistant');
  });

  it('preserves message content', () => {
    const conversations = parseClaudeExport(sampleData);
    const authConv = conversations.find((c) => c.title === 'Auth Flow Redesign')!;

    expect(authConv.messages[0].content).toBe(
      'I need to redesign the authentication flow for our app'
    );
    expect(authConv.messages[1].content).toContain('JWT tokens');
  });

  it('sets platform to claude', () => {
    const conversations = parseClaudeExport(sampleData);
    expect(conversations.every((c) => c.platform === 'claude')).toBe(true);
  });

  it('sets source to import', () => {
    const conversations = parseClaudeExport(sampleData);
    expect(conversations.every((c) => c.source === 'import')).toBe(true);
  });

  it('parses timestamps correctly', () => {
    const conversations = parseClaudeExport(sampleData);
    const authConv = conversations.find((c) => c.title === 'Auth Flow Redesign')!;

    expect(authConv.createdAt).toBe(Date.parse('2024-03-10T00:00:00.000Z'));
    expect(authConv.messages[0].createdAt).toBe(Date.parse('2024-03-10T00:00:00.000Z'));
  });

  it('extracts model from conversation metadata', () => {
    const conversations = parseClaudeExport(sampleData);
    const authConv = conversations.find((c) => c.title === 'Auth Flow Redesign')!;
    expect(authConv.model).toBe('claude-3-opus-20240229');
  });

  it('sorts messages by created_at', () => {
    const conversations = parseClaudeExport(sampleData);
    const authConv = conversations.find((c) => c.title === 'Auth Flow Redesign')!;

    expect(authConv.messages[0].createdAt).toBeLessThan(authConv.messages[1].createdAt);
  });

  it('computes messageCount', () => {
    const conversations = parseClaudeExport(sampleData);
    expect(conversations.every((c) => c.messageCount === c.messages.length)).toBe(true);
  });

  it('throws on invalid input', () => {
    expect(() => parseClaudeExport('not an array')).toThrow();
    expect(() => parseClaudeExport({})).toThrow();
  });

  it('handles empty array', () => {
    const conversations = parseClaudeExport([]);
    expect(conversations).toHaveLength(0);
  });
});
