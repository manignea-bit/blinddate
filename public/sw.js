self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'BlindDate';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    tag: data.tag || 'blinddate',
    renotify: true,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});
