type PermissionStatusProps = {
  notification: string;
  audio: string;
  storage: string;
  onTestNotification: () => void;
  onTestSound: () => void;
};

export function PermissionStatus({ notification, audio, storage, onTestNotification, onTestSound }: PermissionStatusProps) {
  return <aside className="permission-card">
    <strong>Browser delivery</strong>
    <span>Keep TinkleMe open for reminders. Notifications and sound cannot fire after the page is closed.</span>
    <div className="permission-controls">
      <small>Notifications: {notification} · Audio: {audio} · Storage: {storage}</small>
      {notification !== "unsupported" && notification !== "denied" && <button type="button" className="secondary permission-button" onClick={onTestNotification}>{notification === "granted" ? "Test notification" : "Enable notifications"}</button>}
      {audio !== "unsupported" && <button type="button" className="secondary permission-button" onClick={onTestSound}>{audio === "ready" ? "Test sound" : audio === "denied" ? "Try sound again" : "Enable sound"}</button>}
      {notification === "denied" && <small className="permission-help">Notifications are blocked. Allow them for this site in your browser settings, then reload.</small>}
      {notification === "unsupported" && <small className="permission-help">This browser does not support notifications.</small>}
      {audio === "denied" && <small className="permission-help">Sound was blocked. Tap Try sound again; check your device volume if you hear nothing.</small>}
      {audio === "unsupported" && <small className="permission-help">This browser does not support reminder sound.</small>}
    </div>
  </aside>;
}
