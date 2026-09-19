import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "../lib/icons";

export type Period = "day" | "week" | "month" | "year";

export type PeriodValue = {
  period: Period;
  /** Selected keys: YYYY | YYYY-MM | ISO date | Monday ISO for weeks */
  values: string[];
};

type Props = {
  value: PeriodValue;
  label?: string;
  onChange: (next: PeriodValue) => void;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Monday-start week (matches backend Carbon::MONDAY). */
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - day);
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthKey(y: number, m: number) {
  return `${y}-${pad(m)}`;
}

function keyFor(period: Period, d: Date): string {
  if (period === "year") return String(d.getFullYear());
  if (period === "month") return monthKey(d.getFullYear(), d.getMonth() + 1);
  if (period === "week") return toIso(startOfWeek(d));
  return toIso(d);
}

function compareKeys(period: Period, a: string, b: string): number {
  if (period === "year") return Number(a) - Number(b);
  return a.localeCompare(b);
}

/** Contiguous keys from start→end (inclusive), order-independent. */
function rangeKeys(period: Period, start: string, end: string): string[] {
  const [a, b] = compareKeys(period, start, end) <= 0 ? [start, end] : [end, start];

  if (period === "year") {
    const out: string[] = [];
    for (let y = Number(a); y <= Number(b); y++) out.push(String(y));
    return out;
  }

  if (period === "month") {
    const [ys, ms] = a.split("-").map(Number);
    const [ye, me] = b.split("-").map(Number);
    const out: string[] = [];
    let y = ys;
    let m = ms;
    while (y < ye || (y === ye && m <= me)) {
      out.push(monthKey(y, m));
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      if (out.length > 120) break;
    }
    return out;
  }

  if (period === "week") {
    const out: string[] = [];
    const cur = startOfWeek(parseIso(a));
    const endD = startOfWeek(parseIso(b));
    while (cur.getTime() <= endD.getTime()) {
      out.push(toIso(cur));
      cur.setDate(cur.getDate() + 7);
      if (out.length > 260) break;
    }
    return out;
  }

  const out: string[] = [];
  const cur = parseIso(a);
  const endD = parseIso(b);
  while (cur.getTime() <= endD.getTime()) {
    out.push(toIso(cur));
    cur.setDate(cur.getDate() + 1);
    if (out.length > 400) break;
  }
  return out;
}

function formatSelectionSummary(period: Period, values: string[]): string {
  if (values.length === 0) return "Select…";
  if (period === "year") {
    const sorted = [...values].map(Number).sort((a, b) => a - b);
    if (sorted.length === 1) return String(sorted[0]);
    if (sorted.length <= 3) return sorted.join(", ");
    return `${sorted[0]}–${sorted[sorted.length - 1]} (${sorted.length})`;
  }
  if (period === "month") {
    const labels = [...values]
      .sort()
      .map((v) => {
        const [y, m] = v.split("-").map(Number);
        return `${MONTHS_SHORT[(m || 1) - 1]} ${y}`;
      });
    if (labels.length === 1) return labels[0];
    if (labels.length <= 2) return labels.join(", ");
    return `${labels[0]} +${labels.length - 1}`;
  }
  if (period === "week") {
    if (values.length === 1) {
      const s = startOfWeek(parseIso(values[0]));
      return `Week of ${s.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    }
    return `${values.length} weeks`;
  }
  if (values.length === 1) {
    return parseIso(values[0]).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  return `${values.length} days`;
}

function defaultValues(period: Period, now = new Date()): string[] {
  return [keyFor(period, now)];
}

type DragSession = {
  startKey: string;
  moved: boolean;
  /** Selection before this gesture (for click-toggle). */
  baseline: string[];
};

export function PeriodCalendarPicker({ value, label, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState<Period>(value.period);
  const [draftValues, setDraftValues] = useState<string[]>(value.values);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState(() => {
    const first = value.values[0];
    if (value.period === "year" && first) return new Date(Number(first), 0, 1);
    if (value.period === "month" && first) {
      const [y, m] = first.split("-").map(Number);
      return new Date(y, (m || 1) - 1, 1);
    }
    if (first) return parseIso(first);
    return new Date();
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const draftPeriodRef = useRef(draftPeriod);
  draftPeriodRef.current = draftPeriod;

  useEffect(() => {
    if (!open) return;
    setDraftPeriod(value.period);
    setDraftValues(value.values.length ? value.values : defaultValues(value.period));
    const first = value.values[0];
    if (value.period === "year" && first) setView(new Date(Number(first), 0, 1));
    else if (value.period === "month" && first) {
      const [y, m] = first.split("-").map(Number);
      setView(new Date(y, (m || 1) - 1, 1));
    } else if (first) setView(parseIso(first));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (dragRef.current) return;
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const node = el?.closest?.("[data-period-key]") as HTMLElement | null;
      const key = node?.dataset?.periodKey;
      if (!key || !dragRef.current) return;
      if (key !== dragRef.current.startKey) dragRef.current.moved = true;
      const keys = rangeKeys(draftPeriodRef.current, dragRef.current.startKey, key);
      setDraftValues(keys.length ? keys : [dragRef.current.startKey]);
    };
    const endDrag = () => {
      const session = dragRef.current;
      if (session && !session.moved) {
        setDraftValues(() => {
          const key = session.startKey;
          const prev = session.baseline;
          if (prev.includes(key)) {
            if (prev.length === 1) return prev;
            return prev.filter((k) => k !== key);
          }
          return [...prev, key].sort();
        });
      }
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [dragging]);

  const buttonText = label || formatSelectionSummary(value.period, value.values);

  const beginDrag = (key: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startKey: key,
      moved: false,
      baseline: draftValues,
    };
    setDragging(true);
  };

  const switchMode = (p: Period) => {
    dragRef.current = null;
    setDragging(false);
    setDraftPeriod(p);
    setDraftValues(defaultValues(p, view));
  };

  const commit = (period: Period, values: string[]) => {
    const sorted = [...values].sort();
    onChange({ period, values: sorted.length ? sorted : defaultValues(period) });
    setOpen(false);
  };

  const shiftView = (delta: number) => {
    const next = new Date(view);
    if (draftPeriod === "year") next.setFullYear(next.getFullYear() + delta * 12);
    else if (draftPeriod === "month") next.setFullYear(next.getFullYear() + delta);
    else next.setMonth(next.getMonth() + delta);
    setView(next);
  };

  const dayCells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const yearCells = useMemo(() => {
    const base = Math.floor(view.getFullYear() / 12) * 12;
    return Array.from({ length: 12 }, (_, i) => base + i);
  }, [view]);

  const headerLabel =
    draftPeriod === "year"
      ? `${yearCells[0]} – ${yearCells[11]}`
      : draftPeriod === "month"
        ? String(view.getFullYear())
        : `${MONTHS_SHORT[view.getMonth()]} ${view.getFullYear()}`;

  const cellProps = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => beginDrag(key, e),
  });

  return (
    <div className="period-picker" ref={rootRef}>
      <button
        type="button"
        className={`period-picker-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar size={15} strokeWidth={1.75} />
        <span className="period-picker-kind">{value.period}</span>
        <span className="period-picker-text">{buttonText}</span>
        {value.values.length > 1 ? <span className="period-picker-count">{value.values.length}</span> : null}
      </button>

      {open ? (
        <div className="period-picker-panel" role="dialog" aria-label="Select period">
          <div className="period-picker-modes" role="tablist">
            {([
              ["day", "Day"],
              ["week", "Week"],
              ["month", "Month"],
              ["year", "Year"],
            ] as const).map(([p, lbl]) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={draftPeriod === p}
                className={draftPeriod === p ? "active" : ""}
                onClick={() => switchMode(p)}
              >
                {lbl}
              </button>
            ))}
          </div>

          <p className="period-picker-hint">
            Drag to select a range · click to toggle · {draftValues.length} selected
          </p>

          <div className="period-picker-nav">
            <button type="button" aria-label="Previous" onClick={() => shiftView(-1)}>
              <ChevronLeft size={16} />
            </button>
            <strong>{headerLabel}</strong>
            <button type="button" aria-label="Next" onClick={() => shiftView(1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          {draftPeriod === "day" || draftPeriod === "week" ? (
            <div className={`period-cal${dragging ? " is-dragging" : ""}`}>
              <div className="period-cal-weekdays">
                {WEEKDAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="period-cal-grid">
                {dayCells.map((d) => {
                  const outside = d.getMonth() !== view.getMonth();
                  const isToday = sameDay(d, new Date());
                  const key = keyFor(draftPeriod, d);
                  const isSelected = draftValues.includes(key);
                  const weekStart = startOfWeek(d);
                  const isWeekEdge =
                    draftPeriod === "week" &&
                    isSelected &&
                    (sameDay(d, weekStart) ||
                      sameDay(
                        d,
                        (() => {
                          const e = new Date(weekStart);
                          e.setDate(e.getDate() + 6);
                          return e;
                        })(),
                      ));
                  return (
                    <button
                      key={toIso(d)}
                      type="button"
                      data-period-key={key}
                      className={[
                        "period-cal-day",
                        outside ? "is-out" : "",
                        isToday ? "is-today" : "",
                        isSelected ? "is-selected" : "",
                        draftPeriod === "week" && isSelected ? "is-week" : "",
                        isWeekEdge ? "is-week-edge" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      {...cellProps(key)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {draftPeriod === "month" ? (
            <div className={`period-month-grid${dragging ? " is-dragging" : ""}`}>
              {MONTHS_SHORT.map((m, i) => {
                const key = monthKey(view.getFullYear(), i + 1);
                const active = draftValues.includes(key);
                return (
                  <button
                    key={m}
                    type="button"
                    data-period-key={key}
                    className={active ? "active" : ""}
                    {...cellProps(key)}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          ) : null}

          {draftPeriod === "year" ? (
            <div className={`period-year-grid${dragging ? " is-dragging" : ""}`}>
              {yearCells.map((y) => {
                const key = String(y);
                const active = draftValues.includes(key);
                return (
                  <button
                    key={y}
                    type="button"
                    data-period-key={key}
                    className={active ? "active" : ""}
                    {...cellProps(key)}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="period-picker-footer">
            <button
              type="button"
              className="linkish"
              onClick={() => {
                const t = new Date();
                setView(t);
                setDraftValues(defaultValues(draftPeriod, t));
              }}
            >
              Today
            </button>
            <button type="button" className="linkish" onClick={() => setDraftValues(defaultValues(draftPeriod, view))}>
              Clear
            </button>
            <button type="button" className="btn btn-primary period-apply" onClick={() => commit(draftPeriod, draftValues)}>
              Apply ({draftValues.length})
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function periodParams(value: PeriodValue): Record<string, string | number> {
  return {
    period: value.period,
    values: value.values.join(","),
  };
}

export function initialPeriodValue(now = new Date()): PeriodValue {
  return {
    period: "month",
    values: [monthKey(now.getFullYear(), now.getMonth() + 1)],
  };
}
