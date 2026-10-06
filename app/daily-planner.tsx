"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  ArrowUpRight,
  Pencil,
  Trash2,
  ClipboardCopy,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import SpecialTasks from "./special-tasks";
import { localDate } from "@/lib/model";
import type { ManagerState } from "@/lib/manager";

export type Task = {
  id: string;
  member_id: string;
  work_date: string;
  original_work_date: string | null;
  title: string;
  category: string;
  quantity: number;
  due_date: string;
  priority: "low" | "normal" | "high";
  status: "todo" | "progress" | "hold" | "ready" | "done" | "deleted";
  estimated_hours: number;
  actual_hours: number;
  notes: string;
  started_at: string | null;
  elapsed_seconds: number;
  submitted_at: string | null;
  delete_requested_at: string | null;
  delete_reason: string;
  version: number;
};
const statusLabels = {
  todo: "To Do",
  progress: "In Progress",
  hold: "On Hold",
  ready: "Done",
  done: "Done",
  deleted: "Deleted",
};
const duration = (seconds: number) => {
  const n = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(n / 3600)).padStart(2, "0")}:${String(Math.floor((n % 3600) / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};
const empty = (date: string) => ({
  work_date: date,
  title: "",
  category: "",
  count: "1",
  due_date: date,
  priority: "normal",
  status: "todo",
  estimated_hours: "",
  notes: "",
});
export default function DailyPlanner({
  data,
  onSubmitTask,
  refreshToken = 0,
  personal = false,
}: {
  data: ManagerState;
  onSubmitTask?: (task: Task) => void;
  refreshToken?: number;
  personal?: boolean;
}) {
  const [clock, setClock] = useState(() => Date.now()),
    [serverOffset, setServerOffset] = useState(0),
    [serverToday, setServerToday] = useState(localDate()),
    [date, setDate] = useState(localDate()),
    [tasks, setTasks] = useState<Task[]>([]),
    [member, setMember] = useState("all"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [formError, setFormError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Task | null>(null),
    [form, setForm] = useState<Record<string, string> | null>(null),
    [deleteTask, setDeleteTask] = useState<Task | null>(null),
    [deleteReason, setDeleteReason] = useState(""),
    [reportMessage, setReportMessage] = useState(""),
    [deletions, setDeletions] = useState<Task[]>([]),
    [eodMode, setEodMode] = useState<"send" | "copy" | null>(null),
    [eodReasons, setEodReasons] = useState<Record<string, string>>({});
  const [sheetState, setSheetState] = useState<
    "idle" | "saving" | "synced" | "pending"
  >("idle");
  async function syncSheet() {
    setSheetState("saving");
    try {
      const r = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-sheet" }),
      });
      const result = (await r.json()) as { status?: string };
      setSheetState(r.ok && result.status === "synced" ? "synced" : "pending");
    } catch {
      setSheetState("pending");
    }
  }
  const creator = data.me.role === "creator" || personal;
  const visiblePeople = data.people.filter((p) => p.role === "creator");
  const goalNames = [
    ...new Set(
      data.plans
        .filter(
          (p) =>
            p.member_id === data.me.id &&
            p.month === form?.work_date.slice(0, 7),
        )
        .map((p) => data.types.find((t) => t.id === p.type_id)?.name)
        .filter((name): name is string => !!name),
    ),
  ].sort((a, b) => a.localeCompare(b));
  const rate = (category: string) => {
    const type = data.types.find((t) => t.name === category),
      plan = data.plans.find(
        (p) =>
          p.member_id === data.me.id &&
          p.month === (form?.work_date || date).slice(0, 7) &&
          p.type_id === type?.id,
      );
    return plan?.hours_per_job ?? null;
  };
  const estimate = (category: string, count: string) => {
    const r = rate(category),
      n = Number(count);
    return r !== null && Number.isFinite(n)
      ? String(Math.round(n * r * 100) / 100)
      : "";
  };
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const requestedAt = Date.now(),
        r = await fetch(
          "/api/daily-tasks?personal=" +
            (personal ? "1" : "0") +
            "&date=" +
            encodeURIComponent(date),
          { cache: "no-store" },
        );
      const receivedAt = Date.now(),
        body = (await r.json()) as {
          tasks: Task[];
          serverNow?: number;
          serverToday?: string;
          error?: string;
        };
      if (!r.ok) throw new Error(body.error || "Could not load tasks.");
      setTasks(body.tasks);
      if (body.serverNow) {
        setServerOffset(
          body.serverNow - Math.round((requestedAt + receivedAt) / 2),
        );
        setClock(receivedAt);
      }
      if (body.serverToday) setServerToday(body.serverToday);
      // Team leads see every pending deletion request, whatever day is selected.
      if (!personal && ["manager", "admin"].includes(data.me.role)) {
        const pending = await fetch("/api/daily-tasks?deletions=1", {
          cache: "no-store",
        });
        if (pending.ok)
          setDeletions(
            ((await pending.json()) as { tasks?: Task[] }).tasks || [],
          );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }
  // The request lifecycle intentionally starts when the selected day changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => {
    void refresh();
  }, [date, refreshToken, personal]);
  // The refresh callback intentionally follows the selected date.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const clockId = window.setInterval(() => setClock(Date.now()), 1000),
      syncId = window.setInterval(() => void refresh(), 30000);
    return () => {
      window.clearInterval(clockId);
      window.clearInterval(syncId);
    };
  }, [date, personal]);
  const authoritativeClock = clock + serverOffset,
    selected = tasks.filter((t) => member === "all" || t.member_id === member),
    shown = selected.filter((t) => t.status !== "deleted"),
    // Approved deletions stay out of the task list and are only reported in the EOD.
    removed = selected.filter((t) => t.status === "deleted"),
    done = shown.filter((t) => ["ready", "done"].includes(t.status)).length,
    progress = shown.filter((t) => t.status === "progress").length,
    hours = shown.reduce(
      (n, t) =>
        n +
        (t.elapsed_seconds +
          (t.started_at
            ? Math.max(
                0,
                (authoritativeClock - Date.parse(t.started_at)) / 1000,
              )
            : 0)) /
          3600,
      0,
    );
  const indiaTime = new Date(authoritativeClock).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    eodDue = creator && date === serverToday && indiaTime >= "17:55";
  function edit(t?: Task) {
    setEditing(t || null);
    if (!t) {
      setForm(empty(date));
      setFormError("");
      return;
    }
    const values = Object.fromEntries(
      Object.entries(t).map(([k, v]) => [k, String(v)]),
    );
    setForm({ ...values, count: String(t.quantity || 1) });
    setFormError("");
  }
  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setFormError("");
    try {
      const r = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || "Could not save task.");
      setForm(null);
      setSheetState("saving");
      await Promise.all([refresh(), syncSheet()]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save task.");
    } finally {
      setBusy(false);
    }
  }
  async function managerAction(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(result.error || "Could not update the deletion request.");
      await Promise.all([refresh(), syncSheet()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the deletion request.");
    } finally {
      setBusy(false);
    }
  }
  async function requestDelete(e: FormEvent) {
    e.preventDefault();
    if (!deleteTask) return;
    await action({
      action: "delete",
      id: deleteTask.id,
      version: deleteTask.version,
      reason: deleteReason,
    });
    setDeleteTask(null);
    setDeleteReason("");
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    void action({
      ...form,
      action: "save",
      id: editing?.id,
      version: editing?.version,
      quantity: Number(form.count || 1),
      estimated_hours: Number(form.estimated_hours || 0),
    });
  }
  function sodReport() {
    const [year, month, day] = date.split("-");
    return `SOD\nDATE: ${day}-${month}-${year}\nName: ${data.me.name}\nTask:\n${shown.map((task, index) => `${index + 1}. ${task.title}${task.notes.trim() ? `\n   Notes: ${task.notes.trim().replace(/\s*\n\s*/g, " ")}` : ""}`).join("\n")}`;
  }
  const finished = (task: Task) =>
      ["ready", "done"].includes(task.status) || !!task.submitted_at,
    eodPending = shown.filter((task) => !finished(task));
  function eodReport(reasons: Record<string, string>) {
    const [year, month, day] = date.split("-"),
      completed = shown.filter(finished);
    return `EOD Status Report – ${day}-${month}-${year}\nName: ${data.me.name}\n\nCompleted Today:\n${completed.length ? completed.map((task) => `* ${task.title}`).join("\n") : "* None"}${eodPending.length ? `\n\nPending / Incomplete from SOD:\n${eodPending.map((task) => `* ${task.title} – ${(reasons[task.id] || "").trim()}`).join("\n")}` : ""}${removed.length ? `\n\nDeleted from SOD:\n${removed.map((task) => `* ${task.title} – Reason: ${task.delete_reason.trim().replace(/\s*\n\s*/g, " ")}`).join("\n")}` : ""}`;
  }
  // Reasons for unfinished work are collected per report and are not stored.
  function startEod(mode: "send" | "copy") {
    if (!eodPending.length) {
      deliverEod(mode, eodReport({}));
      return;
    }
    setEodReasons(
      Object.fromEntries(
        eodPending.map((task) => [
          task.id,
          task.delete_requested_at
            ? `Deletion requested: ${task.delete_reason}`
            : "",
        ]),
      ),
    );
    setEodMode(mode);
  }
  function deliverEod(mode: "send" | "copy", text: string) {
    if (mode === "send") openEodWhatsApp(text);
    else void copyReport("EOD", text);
  }
  function submitEod(e: FormEvent) {
    e.preventDefault();
    if (!eodMode) return;
    deliverEod(eodMode, eodReport(eodReasons));
    setEodMode(null);
  }
  async function copyReport(kind: "SOD" | "EOD", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setReportMessage(
        `${kind} report copied. Paste it into your office group.`,
      );
      window.setTimeout(() => setReportMessage(""), 3500);
    } catch {
      setReportMessage("Could not copy the report. Please try again.");
    }
  }
  function openWhatsApp() {
    window.open(
      `https://web.whatsapp.com/send?text=${encodeURIComponent(sodReport())}`,
      "studio-whatsapp",
      "noopener,noreferrer",
    );
  }
  function openEodWhatsApp(text: string) {
    window.open(
      `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "studio-whatsapp",
      "noopener,noreferrer",
    );
  }
  const name = (id: string) =>
      data.people.find((p) => p.id === id)?.name || "Team member",
    managerView = !creator && ["manager", "admin"].includes(data.me.role);
  return (
    <div className="daily-planner">
      <SpecialTasks data={data} personal={creator} />
      <section className="daily-head">
        <div>
          <div className="eyebrow">Daily work</div>
          <h2>{creator ? "Plan your day" : "Team daily tracker"}</h2>
          <p className="hint">
            {creator
              ? "Add your tasks in the morning. Starting another task pauses the current task automatically."
              : "See the tasks your team has planned and their latest updates."}
          </p>
        </div>
        {creator && (
          <div className="actions">
            <span className="row">
              <button
                className="secondary"
                disabled={!shown.length}
                onClick={openWhatsApp}
              >
                <MessageCircle size={16} />
                Send SOD on WhatsApp
              </button>
              <button
                className="quiet"
                aria-label="Copy SOD report"
                title="Copy SOD report"
                disabled={!shown.length}
                onClick={() => void copyReport("SOD", sodReport())}
              >
                <ClipboardCopy size={16} />
              </button>
            </span>
            <span className="row">
              <button
                className="secondary"
                disabled={!shown.length && !removed.length}
                onClick={() => startEod("send")}
              >
                <MessageCircle size={16} />
                Send EOD on WhatsApp
              </button>
              <button
                className="quiet"
                aria-label="Copy EOD report"
                title="Copy EOD report"
                disabled={!shown.length && !removed.length}
                onClick={() => startEod("copy")}
              >
                <ClipboardCopy size={16} />
              </button>
            </span>
            <button className="primary" onClick={() => edit()}>
              <Plus size={16} />
              Add task
            </button>
          </div>
        )}
      </section>
      {eodDue && (
        <div className="notice" role="status">
          <strong>EOD report due</strong>
          <p>
            It is after 5:55 PM. Review the task statuses, then send the EOD
            report.
          </p>
        </div>
      )}
      {reportMessage && (
        <div className="notice" role="status">
          {reportMessage}
        </div>
      )}
      {sheetState !== "idle" && (
        <div className="notice" role="status">
          {sheetState === "saving"
            ? "Saved to database. Updating Google Sheet…"
            : sheetState === "synced"
              ? "Saved to database and Google Sheet."
              : "Saved to database. Sheet update is pending; automatic retry is active."}
          {sheetState === "pending" && (
            <button className="quiet" onClick={() => void syncSheet()}>
              Retry sheet update
            </button>
          )}
        </div>
      )}
      {managerView && deletions.length > 0 && (
        <section className="work-surface">
          <div className="toolbar">
            <div>
              <h2 className="manager-heading">Deletion requests</h2>
              <p className="hint">
                Tasks your team asked to delete, across all dates.
              </p>
            </div>
            <span className="pill">{deletions.length}</span>
          </div>
          {deletions.map((t) => (
            <div className="notice" key={t.id}>
              <strong>{t.title}</strong>
              <p>
                {name(t.member_id)} · {t.category} · {t.work_date}
                {t.submitted_at ? " · Already submitted" : ""}
              </p>
              <p>Reason: {t.delete_reason}</p>
              <div className="daily-actions">
                {!t.submitted_at && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void managerAction({
                        action: "approve-task-delete",
                        id: t.id,
                        version: t.version,
                      })
                    }
                  >
                    Approve deletion
                  </button>
                )}
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void managerAction({
                      action: "reject-task-delete",
                      id: t.id,
                      version: t.version,
                    })
                  }
                >
                  Reject request
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      <div className="daily-controls">
        <label>
          Work date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        {!creator && (
          <label>
            Team member
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="all">All members</option>
              {visiblePeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && (
        <div role="alert" className="form-error">
          {error}{" "}
          <button className="quiet" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}
      {formError && !form && (
        <div role="alert" className="form-error">
          {formError}
        </div>
      )}
      <div className="daily-summary">
        <article>
          <strong>{shown.length}</strong>
          <span>Total tasks</span>
        </article>
        <article>
          <strong>{done}</strong>
          <span>Work completed</span>
        </article>
        <article>
          <strong>{progress}</strong>
          <span>In progress</span>
        </article>
        <article>
          <strong>{hours.toFixed(1)}</strong>
          <span>Tracked hours</span>
        </article>
        <div className="daily-summary-progress">
          <span>
            {shown.length ? Math.round((done / shown.length) * 100) : 0}%
            complete
          </span>
          <Progress
            value={shown.length ? (done / shown.length) * 100 : 0}
            aria-label="Daily completion"
          />
        </div>
      </div>
      <section className="work-surface">
        <div className="toolbar">
          <h3 className="manager-heading">
            Tasks for{" "}
            {new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
          <span className="hint">
            {loading
              ? "Loading…"
              : `${shown.length} task${shown.length === 1 ? "" : "s"}`}
          </span>
        </div>
        {!loading && shown.length === 0 ? (
          <div className="empty">
            <h3>
              {creator ? "Start with your first task" : "No tasks entered yet"}
            </h3>
            <p>
              {creator
                ? "Add the work you plan to do today."
                : "Choose another date or wait for your team to add their plans."}
            </p>
            {creator && (
              <button className="primary" onClick={() => edit()}>
                Add task
              </button>
            )}
          </div>
        ) : (
          <div className="daily-list">
            {shown.map((t) => (
              <article key={t.id} className="daily-item">
                <div className="daily-item-main">
                  <div className="daily-title">
                    <strong>{t.title}</strong>
                    <span className={"pill " + t.status}>
                      {statusLabels[t.status]}
                    </span>
                  </div>
                  <p className="hint">
                    {!creator && <>{name(t.member_id)} · </>}
                    {t.category} · Due {t.due_date} ·{" "}
                    <span className={"daily-priority " + t.priority}>
                      {t.priority} priority
                    </span>
                  </p>
                  {t.original_work_date &&
                    t.original_work_date !== t.work_date && (
                      <p className="hint">
                        Carried forward from{" "}
                        {new Date(
                          t.original_work_date + "T12:00:00",
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  {t.notes && <p className="daily-notes">{t.notes}</p>}
                  {t.delete_requested_at && (
                    <p className="notice">
                      <strong>Deletion awaiting Team Lead approval</strong>
                      <br />
                      Reason: {t.delete_reason}
                    </p>
                  )}
                </div>
                <div className="daily-hours">
                  <strong>
                    {t.submitted_at ? t.actual_hours.toFixed(2) + " / " : ""}
                    {t.estimated_hours} h
                  </strong>
                  <span>
                    {t.submitted_at
                      ? "actual / estimated"
                      : "estimated; actual on submission"}
                  </span>
                  {(t.started_at || t.elapsed_seconds > 0) && (
                    <span>
                      Tracked{" "}
                      {duration(
                        t.elapsed_seconds +
                          (t.started_at
                            ? Math.max(
                                0,
                                (authoritativeClock -
                                  Date.parse(t.started_at)) /
                                  1000,
                              )
                            : 0),
                      )}
                    </span>
                  )}
                </div>
                {creator && (
                  <div className="daily-actions">
                    {!t.submitted_at &&
                      (!t.delete_requested_at || t.status === "progress") &&
                      t.status !== "done" &&
                      (t.status === "progress" ? (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: "pause",
                              id: t.id,
                              version: t.version,
                            })
                          }
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: "start",
                              id: t.id,
                              version: t.version,
                            })
                          }
                        >
                          {t.status === "ready"
                            ? "Resume work"
                            : t.elapsed_seconds
                              ? "Resume"
                              : "Start work"}
                        </button>
                      ))}
                    {!t.submitted_at &&
                      !t.delete_requested_at &&
                      ["progress", "hold"].includes(t.status) &&
                      (t.started_at || t.elapsed_seconds > 0) && (
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            void action({
                              action: "complete",
                              id: t.id,
                              version: t.version,
                            })
                          }
                        >
                          Mark completed
                        </button>
                      )}
                    {!t.submitted_at &&
                      !t.delete_requested_at &&
                      t.status === "ready" &&
                      onSubmitTask && (
                        <button
                          className="primary"
                          onClick={() => onSubmitTask(t)}
                        >
                          Submit output
                        </button>
                      )}
                    {t.submitted_at &&
                      data.submissions.some(
                        (s) =>
                          s.daily_task_id === t.id && s.status === "review",
                      ) &&
                      onSubmitTask && (
                        <button
                          className="secondary"
                          onClick={() => onSubmitTask(t)}
                        >
                          Edit submission
                        </button>
                      )}
                    {!t.submitted_at && !t.delete_requested_at && (
                      <>
                        <button
                          className="quiet"
                          aria-label={`Edit ${t.title}`}
                          onClick={() => edit(t)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="quiet"
                          aria-label={`Request deletion of ${t.title}`}
                          disabled={busy || !!t.delete_requested_at}
                          onClick={() => {
                            setDeleteTask(t);
                            setDeleteReason("");
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {t.delete_requested_at && (
                      <button
                        className="quiet"
                        disabled={busy}
                        onClick={() =>
                          void action({
                            action: "cancel-delete",
                            id: t.id,
                            version: t.version,
                          })
                        }
                      >
                        Withdraw deletion request
                      </button>
                    )}
                  </div>
                )}
                {managerView && t.delete_requested_at && (
                  <div className="daily-actions">
                    <span className="hint">
                      Deletion requested: {t.delete_reason}
                    </span>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void managerAction({
                          action: "approve-task-delete",
                          id: t.id,
                          version: t.version,
                        })
                      }
                    >
                      Approve deletion
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void managerAction({
                          action: "reject-task-delete",
                          id: t.id,
                          version: t.version,
                        })
                      }
                    >
                      Reject request
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <Dialog
        open={!!form}
        onOpenChange={(v) => {
          if (!v && !busy) setForm(null);
        }}
      >
        <DialogContent className="dialog-body">
          <DialogTitle>
            {editing ? "Edit daily task" : "Add daily task"}
          </DialogTitle>
          <DialogDescription>
            Record your plan and update it as work progresses.
          </DialogDescription>
          {formError && (
            <div role="alert" className="form-error">
              {formError}
            </div>
          )}
          {form && (
            <form className="form daily-form" onSubmit={save}>
              <fieldset disabled={busy} className="submission-form-fields">
                <label>
                  Work date
                  <input
                    required
                    type="date"
                    min={localDate()}
                    disabled={!!editing && editing.work_date < localDate()}
                    value={form.work_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        work_date: e.target.value,
                        category: "",
                      })
                    }
                  />
                </label>
                {editing && editing.work_date < localDate() && (
                  <p className="hint">
                    The date of a past task is locked, but its other details can
                    still be edited.
                  </p>
                )}
                <label>
                  Task name
                  <input
                    required
                    maxLength={160}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Category
                  <select
                    required
                    value={form.category}
                    onChange={(e) => {
                      const category = e.target.value;
                      setForm({
                        ...form,
                        category,
                        count: "1",
                        estimated_hours: estimate(category, "1"),
                      });
                    }}
                  >
                    <option value="" disabled>
                      Select an assigned goal
                    </option>
                    {editing?.category &&
                      !goalNames.includes(editing.category) && (
                        <option value={editing.category}>
                          {editing.category} (previous category)
                        </option>
                      )}
                    {goalNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                {goalNames.length === 0 && (
                  <p className="hint">
                    No goals are assigned for this month. Ask your manager to
                    assign one.
                  </p>
                )}
                {form.category && rate(form.category) !== null && (
                  <label>
                    {form.category === "AI Hours"
                      ? "Number of hours"
                      : "Number of jobs"}
                    <input
                      required
                      type="number"
                      min={form.category === "AI Hours" ? "0.01" : "1"}
                      max="100000"
                      step={form.category === "AI Hours" ? "0.25" : "1"}
                      value={form.count}
                      onChange={(e) => {
                        const count = e.target.value;
                        setForm({
                          ...form,
                          count,
                          estimated_hours: estimate(form.category, count),
                        });
                      }}
                    />
                  </label>
                )}
                <label>
                  Due date
                  <input
                    required
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                      setForm({ ...form, due_date: e.target.value })
                    }
                  />
                </label>
                <div className="daily-form-row">
                  <label>
                    Priority
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm({ ...form, priority: e.target.value })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <p className="hint">
                    Use Start work and Pause in the task list to track active
                    time.
                  </p>
                </div>
                <label>
                  Estimated hours
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="0.01"
                    readOnly={rate(form.category) !== null}
                    value={form.estimated_hours}
                    onChange={(e) =>
                      setForm({ ...form, estimated_hours: e.target.value })
                    }
                  />
                </label>
                {rate(form.category) !== null && (
                  <p className="hint">
                    Automatically calculated at {rate(form.category)} hour
                    {rate(form.category) === 1 ? "" : "s"} per{" "}
                    {form.category === "AI Hours" ? "hour" : "job"}.
                  </p>
                )}
                <p className="hint">
                  Actual hours are calculated when you submit the output.
                </p>
                <label>
                  Notes
                  <textarea
                    maxLength={2000}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setForm(null)}
                  >
                    Cancel
                  </button>
                  <button className="primary" disabled={busy}>
                    {busy ? "Saving…" : "Save task"} <ArrowUpRight size={15} />
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteTask}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleteTask(null);
            setDeleteReason("");
          }
        }}
      >
        <DialogContent className="dialog-body">
          <DialogTitle>Request task deletion</DialogTitle>
          <DialogDescription>
            The task stays visible until your Team Lead approves the request.
          </DialogDescription>
          <form className="form" onSubmit={requestDelete}>
            <label>
              Reason for deletion
              <textarea
                required
                maxLength={1000}
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="Explain why this task should be deleted"
              />
            </label>
            <div className="actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setDeleteTask(null);
                  setDeleteReason("");
                }}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy || !deleteReason.trim()}>
                {busy ? "Submitting…" : "Send deletion request"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!eodMode}
        onOpenChange={(open) => {
          if (!open) setEodMode(null);
        }}
      >
        <DialogContent className="dialog-body">
          <DialogTitle>EOD status report</DialogTitle>
          <DialogDescription>
            Add the reason for delay or current status of each unfinished task.
            These notes go into the report only and are not saved.
          </DialogDescription>
          <form className="form" onSubmit={submitEod}>
            {eodPending.map((task) => (
              <label key={task.id}>
                {task.title}
                <textarea
                  required
                  maxLength={300}
                  value={eodReasons[task.id] || ""}
                  onChange={(event) =>
                    setEodReasons({
                      ...eodReasons,
                      [task.id]: event.target.value,
                    })
                  }
                  placeholder="e.g. 60% done, waiting for assets"
                />
              </label>
            ))}
            <div className="actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEodMode(null)}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={eodPending.some(
                  (task) => !(eodReasons[task.id] || "").trim(),
                )}
              >
                {eodMode === "send" ? "Send EOD on WhatsApp" : "Copy EOD report"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
