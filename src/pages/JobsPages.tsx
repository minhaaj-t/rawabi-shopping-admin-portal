import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  ClipboardList,
  Mail,
  Phone,
  Search,
  UserPlus,
  Users,
} from "../lib/icons";
import { adminApi } from "../lib/api";
import { JobsPage as JobOpeningsCrud, CvsPage as ApplicationsCrud } from "./EntityModules";

function JobsShell({
  crumbs,
  title,
  subtitle,
  actions,
  children,
}: {
  crumbs?: Array<{ label: string; to?: string }>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const trail = [{ label: "Jobs", to: "/jobs" }, ...(crumbs ?? [])];

  return (
    <div className="page settings-form-page mkt-page jobs-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            {trail.map((c, i) => {
              const last = i === trail.length - 1;
              return (
                <span key={`${c.label}-${i}`} className="settings-crumb-item">
                  {i > 0 ? <ChevronRight size={14} aria-hidden /> : null}
                  {last || !c.to ? <span>{c.label}</span> : <Link to={c.to}>{c.label}</Link>}
                </span>
              );
            })}
          </p>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

type JobsOverview = Awaited<ReturnType<typeof adminApi.jobsOverview>>;

const JOB_TOOLS = [
  {
    to: "/jobs/openings",
    label: "Job openings",
    desc: "Create, edit, publish, and close career postings.",
    icon: ClipboardList,
  },
  {
    to: "/jobs/applications",
    label: "Applications",
    desc: "Review CVs, applicant details, and application status.",
    icon: Users,
  },
  {
    to: "/jobs/applications?status=0",
    label: "Pending review",
    desc: "Applicants waiting for HR to mark as reviewed.",
    icon: Search,
  },
  {
    to: "/jobs/openings",
    label: "Post a job",
    desc: "Add a new opening with title, dates, and description.",
    icon: UserPlus,
  },
] as const;

export function JobsHubPage() {
  const [data, setData] = useState<JobsOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void adminApi
      .jobsOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const stats = data?.stats;

  return (
    <JobsShell
      title="Jobs"
      subtitle="Hiring tools for Rawabi openings, applications, and CV review."
      actions={
        <div className="page-head-actions">
          <Link className="btn btn-secondary" to="/jobs/applications">
            Applications
          </Link>
          <Link className="btn btn-primary" to="/jobs/openings">
            Manage openings
          </Link>
        </div>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="card-grid customer-stat-grid">
        <article className="stat-card card">
          <h3>Open jobs</h3>
          <strong>{stats?.open_jobs ?? "—"}</strong>
          <p className="stat-amount">{stats?.closed_jobs ?? 0} closed</p>
        </article>
        <article className="stat-card card">
          <h3>Applications</h3>
          <strong>{stats?.applications ?? "—"}</strong>
          <p className="stat-amount">{stats?.applications_30d ?? 0} in last 30 days</p>
        </article>
        <article className="stat-card card">
          <h3>Pending review</h3>
          <strong>{stats?.pending_review ?? "—"}</strong>
          <p className="stat-amount">Needs HR follow-up</p>
        </article>
        <article className="stat-card card">
          <h3>Total postings</h3>
          <strong>{stats?.total_jobs ?? "—"}</strong>
          <p className="stat-amount">All non-deleted jobs</p>
        </article>
      </div>

      <section className="card" style={{ marginTop: 12 }}>
        <h2>Job management tools</h2>
        <div className="settings-tools-grid">
          {JOB_TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={`${t.to}-${t.label}`} className="card settings-tool-card" to={t.to}>
                <header>
                  <h2>
                    <Icon size={16} aria-hidden /> {t.label}
                  </h2>
                </header>
                <p>{t.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="customer-detail-grid" style={{ marginTop: 12 }}>
        <section className="card">
          <h2>Applications by job</h2>
          {(data?.by_job ?? []).length === 0 ? (
            <p className="muted">No applications yet.</p>
          ) : (
            <ul className="customer-activity-list">
              {(data?.by_job ?? []).map((row) => (
                <li key={row.job_title}>
                  <div className="customer-need-head">
                    <Link
                      className="linkish"
                      to={`/jobs/applications?job=${encodeURIComponent(row.job_title)}`}
                    >
                      {row.job_title}
                    </Link>
                    <span className="customer-offer-chip">{row.applications}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Recent applications</h2>
          {(data?.recent_applications ?? []).length === 0 ? (
            <p className="muted">No recent applicants.</p>
          ) : (
            <ul className="customer-activity-list">
              {(data?.recent_applications ?? []).map((a) => (
                <li key={String(a.career_id)}>
                  <div className="customer-need-head">
                    <strong>{String(a.career_name || "—")}</strong>
                    <span className="muted">{String(a.career_created_at ?? "").slice(0, 10)}</span>
                  </div>
                  <p className="muted">
                    {String(a.career_job || "General")} · {String(a.career_email || "—")}
                  </p>
                  <div className="orders-row-actions">
                    {a.career_email ? (
                      <a className="btn btn-secondary btn-sm" href={`mailto:${String(a.career_email)}`}>
                        <Mail size={12} aria-hidden /> Email
                      </a>
                    ) : null}
                    {a.career_mobile ? (
                      <a className="btn btn-secondary btn-sm" href={`tel:${String(a.career_mobile)}`}>
                        <Phone size={12} aria-hidden /> Call
                      </a>
                    ) : null}
                    <Link className="btn btn-green btn-sm" to={`/jobs/applications?id=${a.career_id}`}>
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link className="btn btn-secondary btn-sm" to="/jobs/applications">
            View all applications
          </Link>
        </section>
      </div>
    </JobsShell>
  );
}

export function JobOpeningsPage() {
  return (
    <JobsShell
      crumbs={[{ label: "Job openings" }]}
      title="Job openings"
      subtitle="Publish and manage Rawabi career listings."
    >
      <JobOpeningsCrud embedded />
    </JobsShell>
  );
}

export function JobApplicationsPage() {
  const [params] = useSearchParams();
  const job = params.get("job") ?? "";
  const status = params.get("status") ?? "";
  const openId = params.get("id");

  return (
    <JobsShell
      crumbs={[{ label: "Applications" }]}
      title="Applications"
      subtitle="CVs and applicant details submitted from the careers form."
    >
      <ApplicationsCrud
        embedded
        initialJob={job}
        initialStatus={status}
        initialOpenId={openId ? Number(openId) : undefined}
      />
    </JobsShell>
  );
}
