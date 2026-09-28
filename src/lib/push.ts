import webpush from "web-push";

let vapidConfigured = false;

function configureWebPush() {
  if (vapidConfigured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  if (!configureWebPush()) return false;
  await webpush.sendNotification(subscription, JSON.stringify(payload));
  return true;
}
