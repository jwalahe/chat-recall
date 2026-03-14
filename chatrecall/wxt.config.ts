import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
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
