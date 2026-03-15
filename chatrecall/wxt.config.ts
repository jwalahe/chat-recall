import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // Use native chrome.* APIs instead of webextension-polyfill.
  // The polyfill's top-level check (chrome.runtime.id) throws an uncaught
  // "Extension context invalidated" error on orphaned content scripts
  // after the extension is reloaded/updated.
  extensionApi: 'chrome',
  manifest: {
    name: 'ChatRecall',
    description: 'Search and reconnect with your AI chat history',
    permissions: ['storage', 'unlimitedStorage', 'sidePanel'],
    host_permissions: [
      '*://claude.ai/*',
      '*://chatgpt.com/*',
      '*://gemini.google.com/*',
    ],
    action: {
      default_title: 'Open ChatRecall',
    },
    web_accessible_resources: [
      {
        resources: ['claude-interceptor.js', 'chatgpt-interceptor.js'],
        matches: ['*://claude.ai/*', '*://chatgpt.com/*'],
      },
    ],
  },
});
