import { describe, it, expect } from 'vitest';
import { parseChatGPTExport } from '../../src/lib/parsers/chatgpt-export';
import sampleData from '../fixtures/chatgpt-export-sample.json';

describe('parseChatGPTExport', () => {
  it('parses sample export into conversations', () => {
    const conversations = parseChatGPTExport(sampleData);
    expect(conversations).toHaveLength(2);
  });

  it('linearizes tree-based mapping correctly', () => {
    const conversations = parseChatGPTExport(sampleData);
    const dbConv = conversations.find((c) => c.title === 'Database Migration Plan');
    expect(dbConv).toBeDefined();

    // Should have 3 messages (system message filtered out)
    // user -> assistant -> user
    expect(dbConv!.messages).toHaveLength(3);
    expect(dbConv!.messages[0].role).toBe('user');
    expect(dbConv!.messages[1].role).toBe('assistant');
    expect(dbConv!.messages[2].role).toBe('user');
  });

  it('filters out system messages', () => {
    const conversations = parseChatGPTExport(sampleData);
    const dbConv = conversations.find((c) => c.title === 'Database Migration Plan')!;

    const systemMessages = dbConv.messages.filter((m) => m.role === 'system');
    expect(systemMessages).toHaveLength(0);
  });

  it('preserves message content from parts array', () => {
    const conversations = parseChatGPTExport(sampleData);
    const dbConv = conversations.find((c) => c.title === 'Database Migration Plan')!;

    expect(dbConv.messages[0].content).toBe(
      'I need to migrate from PostgreSQL 12 to 16. What should I watch out for?'
    );
    expect(dbConv.messages[1].content).toContain('Breaking changes');
  });

  it('sets platform to chatgpt', () => {
    const conversations = parseChatGPTExport(sampleData);
    expect(conversations.every((c) => c.platform === 'chatgpt')).toBe(true);
  });

  it('extracts model from metadata', () => {
    const conversations = parseChatGPTExport(sampleData);
    const dbConv = conversations.find((c) => c.title === 'Database Migration Plan')!;
    expect(dbConv.model).toBe('gpt-4');
  });

  it('handles conversations with different models', () => {
    const conversations = parseChatGPTExport(sampleData);
    const reactConv = conversations.find((c) => c.title === 'React Hooks Question')!;
    expect(reactConv.model).toBe('gpt-4o');
  });

  it('converts Unix timestamps to milliseconds', () => {
    const conversations = parseChatGPTExport(sampleData);
    const dbConv = conversations.find((c) => c.title === 'Database Migration Plan')!;

    // create_time in fixture is 1710100060.0 (seconds)
    expect(dbConv.messages[0].createdAt).toBe(1710100060.0 * 1000);
  });

  it('preserves conversation external ID', () => {
    const conversations = parseChatGPTExport(sampleData);
    const dbConv = conversations.find((c) => c.title === 'Database Migration Plan')!;
    expect(dbConv.externalId).toBe('conv-db-001');
  });

  it('follows current_node path for active branch', () => {
    const conversations = parseChatGPTExport(sampleData);
    const reactConv = conversations.find((c) => c.title === 'React Hooks Question')!;

    // current_node is node-r003 (3rd message)
    // Should have user -> assistant -> user (no system)
    expect(reactConv.messages).toHaveLength(3);
    expect(reactConv.messages[2].content).toBe('Can you show me an example?');
  });

  it('throws on invalid input', () => {
    expect(() => parseChatGPTExport('not an array')).toThrow();
    expect(() => parseChatGPTExport({})).toThrow();
  });

  it('handles empty array', () => {
    const conversations = parseChatGPTExport([]);
    expect(conversations).toHaveLength(0);
  });

  it('skips conversations without mapping', () => {
    const data = [{ title: 'No mapping', conversation_id: 'x' }];
    const conversations = parseChatGPTExport(data);
    expect(conversations).toHaveLength(0);
  });
});
