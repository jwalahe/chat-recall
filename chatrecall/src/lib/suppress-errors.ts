/**
 * Suppress "Extension context invalidated" errors in content scripts.
 *
 * After an extension reload/update, orphaned content scripts on existing
 * pages can no longer communicate with the service worker.  The WXT runtime
 * (and Chrome internals) may throw or reject promises with this error.
 * The errors are harmless — the new extension instance injects fresh
 * content scripts — but they pollute the Extensions error panel.
 *
 * Call this once, early in the content script's main() function.
 */
export function suppressContextInvalidatedErrors(): void {
  const isContextError = (msg: string | undefined): boolean =>
    !!msg && msg.includes('Extension context invalidated');

  // Catch synchronous throws that bubble up as uncaught errors
  self.addEventListener('error', (event) => {
    if (isContextError(event.message)) {
      event.preventDefault();
    }
  });

  // Catch rejected promises from async chrome.* API calls
  self.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg =
      typeof reason === 'string'
        ? reason
        : reason instanceof Error
          ? reason.message
          : String(reason);
    if (isContextError(msg)) {
      event.preventDefault();
    }
  });
}
