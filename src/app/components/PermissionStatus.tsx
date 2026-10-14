export function PermissionStatus({ notification, audio, storage }: { notification: string; audio: string; storage: string }) {
  return <aside className="permission-card"><strong>Browser delivery</strong><span>Keep UpNext open with notification and audio permissions enabled.</span><small>Notifications: {notification} · Audio: {audio} · Storage: {storage}</small></aside>;
}
