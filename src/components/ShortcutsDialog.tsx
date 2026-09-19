import { X } from "../lib/icons";
import { ACTION_SHORTCUTS, GLOBAL_SHORTCUTS, NAV_SHORTCUTS, type NavShortcut } from "../lib/navShortcuts";
import { ShortcutKbd } from "./ShortcutKbd";

type Props = {
  open: boolean;
  onClose: () => void;
  visibleLabels: string[];
};

export function ShortcutsDialog({ open, onClose, visibleLabels }: Props) {
  if (!open) return null;

  const allowed = new Set(visibleLabels.map((label) => label.toLowerCase()));
  const navRows = NAV_SHORTCUTS.filter((item) => allowed.has(item.label.toLowerCase()));
  const actionRows = ACTION_SHORTCUTS.filter((item) => !item.navGroup || allowed.has(item.navGroup.toLowerCase()));
  const rows: Array<{ heading?: string; items: NavShortcut[] }> = [
    { heading: "General", items: GLOBAL_SHORTCUTS },
    { heading: "Go to", items: navRows },
    { heading: "Create", items: actionRows },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <header className="shortcuts-modal-head">
          <div>
            <h2 id="shortcuts-title">Shortcut keys</h2>
            <p className="muted">Use these from any admin page. They stay off while you type in a field.</p>
          </div>
          <button type="button" className="modal-close-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>
        <div className="shortcuts-modal-body">
          {rows.map((group) =>
            group.items.length ? (
              <section key={group.heading} className="shortcuts-col">
                <h3>{group.heading}</h3>
                <ul className="shortcuts-list">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <ShortcutKbd hint={item.hint} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
