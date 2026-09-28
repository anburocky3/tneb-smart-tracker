"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export default function PushNotificationPrompt() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canPush =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(canPush);
    if (!canPush) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription));
      })
      .catch((error) => console.error("Service worker setup failed", error));
  }, []);

  const enableNotifications = async () => {
    if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    setSaving(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        ),
      });
      const response = await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("Unable to register this device");
      setEnabled(true);
    } catch (error) {
      console.error("Push notification setup failed", error);
    } finally {
      setSaving(false);
    }
  };

  if (!supported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return null;

  return (
    <button
      type="button"
      onClick={enableNotifications}
      disabled={saving || enabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:cursor-default disabled:opacity-70"
      title="Receive monthly meter and bill updates on this device"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : enabled ? (
        <Check className="h-4 w-4" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {enabled ? "Alerts enabled" : "Enable alerts"}
    </button>
  );
}
