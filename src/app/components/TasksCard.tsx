import { useEffect, useState } from "react";

type GoogleTask = { id: string; title: string; notes?: string; due?: string; list: string; account?: string };

function dueLabel(due?: string) {
  if (!due) return "No due date";
  const date = new Date(due);
  return Number.isNaN(date.getTime()) ? "No due date" : date.toLocaleDateString([], { dateStyle: "medium", timeZone: "UTC" });
}

export function TasksCard() {
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [failedAccountIndices, setFailedAccountIndices] = useState<number[]>([]);
  const state = new URLSearchParams(window.location.search).get("tasks");

  async function sync() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/composio/tasks");
      if (response.status === 401) {
        setConnected(false);
        setFailedAccountIndices([]);
        setTasks([]);
        setStatus(state === "connected" ? "Reconnect Google Tasks to see your tasks." : null);
        return;
      }
      const payload = (await response.json()) as { tasks?: GoogleTask[]; truncated?: boolean; failedAccounts?: number; failedAccountIndices?: number[]; error?: string };
      setFailedAccountIndices(payload.failedAccountIndices ?? []);
      if (!response.ok) {
        setConnected((payload.failedAccountIndices?.length ?? 0) > 0);
        setTasks([]);
        setStatus(payload.error ?? "Google Tasks could not be loaded.");
        return;
      }
      setConnected(true);
      setTasks(payload.tasks ?? []);
      setVisibleCount(30);
      setStatus(payload.failedAccounts ? `${payload.failedAccounts} connected account${payload.failedAccounts === 1 ? "" : "s"} could not be loaded. Remove the failed connection and reconnect it.` : payload.truncated ? "Showing the first 1,000 tasks per account; more are available." : payload.tasks?.length ? null : "No open tasks found in your task lists.");
    } catch {
      setStatus("Google Tasks could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void sync();
  }, [state]);

  async function unlink(index: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/composio/unlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: "tasks", index }) });
      if (!response.ok) throw new Error();
      await sync();
    } catch {
      setStatus("Could not remove the failed connection. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="calendar-card card" aria-labelledby="tasks-title" data-clarity-mask="true">
    <div><p className="eyebrow">YOUR TASKS</p><h2 id="tasks-title">Everything on your list.</h2><p className="muted">Open Google Tasks from every connected account and task list. Read-only. Connect each account in this browser.</p></div>
    {state === "not-configured" && <p className="errors" role="alert">Google Tasks is not configured on this deployment yet.</p>}
    {state === "failed" && <p className="errors" role="alert">Google Tasks connection was not completed. Try again.</p>}
    {connected && <p className="calendar-connected" role="status">Google Tasks connected.</p>}
    {status && <p className="errors" role="alert">{status}</p>}
    <div className="calendar-actions"><a className="button-link" href="/api/composio/tasks-auth">{connected ? "Connect another Google account" : "Connect Google Tasks"}</a>{connected && <button type="button" className="secondary" onClick={() => void sync()} disabled={loading}>{loading ? "Syncing…" : "Sync now"}</button>}{failedAccountIndices.map((index) => <button key={index} type="button" className="secondary" onClick={() => void unlink(index)} disabled={loading}>Remove failed Account {index}</button>)}</div>
    {tasks.length > 0 && <div className="calendar-events">{tasks.slice(0, visibleCount).map((task) => <article key={task.id}><strong>{task.title}</strong><span>{dueLabel(task.due)} · {task.list}{task.account ? ` · ${task.account}` : ""}</span>{task.notes && <span>{task.notes}</span>}</article>)}</div>}
    {tasks.length > visibleCount && <button type="button" className="secondary" onClick={() => setVisibleCount((count) => count + 30)}>Show more tasks</button>}
  </section>;
}
