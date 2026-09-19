import { useState } from "react";
import { adminApi } from "../lib/api";
import { markNotificationsSeen, notificationHref } from "../lib/notificationLinks";
import { ResourceListPage } from "../components/ResourceListPage";
import { CheckCheck } from "../lib/icons";

function NotificationComposer() {
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [message, setMessage] = useState("");
  const [messageAr, setMessageAr] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Compose notification (EN + AR)</h3>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <input placeholder="Title (English)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Title (Arabic)" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
        <input
          placeholder="Message (English)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <input
          placeholder="Message (Arabic)"
          dir="rtl"
          value={messageAr}
          onChange={(e) => setMessageAr(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <button
          type="button"
          className="btn btn-green"
          onClick={() =>
            void adminApi
              .createNotification({
                title,
                title_ar: titleAr || undefined,
                message,
                message_ar: messageAr || undefined,
                type: "all",
              })
              .then(() => {
                setMsg("Saved");
                setTitle("");
                setTitleAr("");
                setMessage("");
                setMessageAr("");
              })
              .catch((e) => setMsg(e instanceof Error ? e.message : "Failed"))
          }
        >
          Save
        </button>
      </div>
      {msg ? <p className="muted">{msg}</p> : null}
    </div>
  );
}

function MarkAllReadButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onClick() {
    setBusy(true);
    setMsg("");
    try {
      const res = await adminApi.notifications({ per_page: 50, page: 1 });
      const ids = (res.items ?? [])
        .map((row) => Number((row as { notification_id?: number }).notification_id ?? 0))
        .filter((id) => id > 0);
      if (!ids.length) {
        setMsg("Nothing to mark");
        return;
      }
      markNotificationsSeen(Math.max(...ids));
      setMsg("All marked as read");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="toolbar" style={{ marginBottom: 0, alignItems: "center" }}>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onClick()}>
        <CheckCheck size={14} />
        {busy ? "Marking…" : "Mark all as read"}
      </button>
      {msg ? <span className="muted">{msg}</span> : null}
    </div>
  );
}

export function NotificationsPage() {
  return (
    <ResourceListPage
      title="Notifications"
      prepend={<NotificationComposer />}
      toolbarExtra={<MarkAllReadButton />}
      load={async () => {
        const res = await adminApi.notifications({ per_page: 40 });
        return { items: res.items, total: res.total };
      }}
      rowHref={(row) => notificationHref(row)}
      columns={[
        { key: "notification_id", label: "ID" },
        { key: "notification_title", label: "Title" },
        { key: "notification_type", label: "Type" },
        { key: "notification_msg", label: "Message" },
        { key: "notification_created_at", label: "Created" },
      ]}
    />
  );
}
