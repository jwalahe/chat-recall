import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'ChatRecall',
    description: 'Search and reconnect with your AI chat history',
    permissions: ['storage', 'unlimitedStorage', 'sidePanel', 'offscreen'],
    host_permissions: [
      '*://claude.ai/*',
      '*://chatgpt.com/*',
      '*://gemini.google.com/*',
    ],
    side_panel: {
      default_path: 'sidepanel/index.html',
    },
    action: {
      default_title: 'Open ChatRecall',
    },
  },
});
