export type AdapterResult = "success" | "denied" | "unsupported";
export async function requestNotifications(): Promise<AdapterResult> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  return permission === "granted" ? "success" : "denied";
}
export function notify(title: string, body: string): AdapterResult {
  if (!("Notification" in window) || Notification.permission !== "granted") return "denied";
  new Notification(title, { body }); return "success";
}
