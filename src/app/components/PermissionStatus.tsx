export function PermissionStatus({ notification, audio, storage, onTestNotification }: { notification: string; audio: string; storage: string; onTestNotification: () => void }) {
  return <aside className="permission-card"><strong>Browser delivery</strong><span>Keep UpNext open for reminders. Notifications and sound cannot fire after the page is closed.</span><div className="permission-controls"><small>Notifications: {notification} · Audio: {audio} · Storage: {storage}</small><button type="button" className="secondary" onClick={onTestNotification}>Test notification</button></div></aside>;
}
