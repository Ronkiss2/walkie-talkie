// Minimal service worker — exists so the app is installable to the home screen.
// Deliberately a network passthrough (no caching) so you always get the latest
// version after a deploy; still lets the browser show the "Install" option.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
