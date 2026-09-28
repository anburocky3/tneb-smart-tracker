interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushEventLike extends Event {
  data: { json(): NotificationPayload } | null;
}

interface NotificationClickEventLike extends Event {
  notification: { data?: { url?: string }; close(): void };
  waitUntil(promise: Promise<unknown>): void;
}

const worker = self as unknown as {
  skipWaiting(): Promise<void>;
  clients: {
    claim(): Promise<void>;
    matchAll(options: {
      type: string;
      includeUncontrolled: boolean;
    }): Promise<
      Array<{
        focus?: () => Promise<unknown>;
        navigate?: (url: string) => Promise<unknown>;
      }>
    >;
    openWindow(url: string): Promise<unknown>;
  };
  registration: {
    showNotification(
      title: string,
      options: Record<string, unknown>,
    ): Promise<void>;
  };
  location: Location;
  addEventListener(type: string, listener: (event: Event) => void): void;
};

worker.addEventListener("install", () => worker.skipWaiting());
worker.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(worker.clients.claim());
});

worker.addEventListener("push", (event) => {
  const pushEvent = event as PushEventLike;
  let payload: NotificationPayload = {
    title: "Minnal EB Tracker",
    body: "You have a new meter update.",
  };

  try {
    if (pushEvent.data) payload = { ...payload, ...pushEvent.data.json() };
  } catch {
    // Keep the fallback notification when a provider sends plain text.
  }

  (event as ExtendableEvent).waitUntil(
    worker.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url || "/" },
      tag: payload.tag || "minnal-update",
    }),
  );
});

worker.addEventListener("notificationclick", (event) => {
  const clickEvent = event as NotificationClickEventLike;
  clickEvent.notification.close();
  clickEvent.waitUntil(
    worker.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const targetUrl = new URL(
          clickEvent.notification.data?.url || "/",
          worker.location.origin,
        ).href;
        const existing = clients.find((client) => client.focus);
        if (existing?.navigate && existing.focus) {
          existing.navigate(targetUrl);
          return existing.focus();
        }
        return worker.clients.openWindow(targetUrl);
      }),
  );
});
