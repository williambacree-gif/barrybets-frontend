// ═══════════════════════════════════════════════════════════════
// BARRY BETS — SERVICE WORKER
//
// Its whole job is to be awake when the app is not. The phone wakes this
// file, hands it the push, and it draws the notification.
//
// Deliberately no caching: an offline cache on a pool that lives or dies
// by the current week's board is a way to show a man a stale deadline.
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (err) {
    d = { body: event.data ? event.data.text() : '' };
  }

  const title = d.title || 'Barry Bets';
  const options = {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || 'barrybets',
    renotify: true,
    data: { url: d.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  // Focus a window that is already open rather than piling up tabs.
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (c.url.startsWith(self.location.origin)) {
        await c.focus();
        if (c.navigate) { try { await c.navigate(url); } catch (e) { /* focus is enough */ } }
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
