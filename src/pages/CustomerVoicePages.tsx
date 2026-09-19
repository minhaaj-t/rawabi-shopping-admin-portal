import { Link } from "react-router-dom";
import { ResourceListPage } from "../components/ResourceListPage";
import { adminApi } from "../lib/api";
import { ChevronRight, Star } from "../lib/icons";

const REVIEW_COLUMNS = [
  { key: "cr_id", label: "ID" },
  { key: "ec_store_name", label: "Store" },
  { key: "username", label: "Customer" },
  { key: "cr_feel", label: "Feel" },
  { key: "cr_problems", label: "Problems" },
  { key: "cr_created", label: "Created" },
];

export function CustomerFeedbacksPage() {
  return (
    <ResourceListPage
      title="Customer feedbacks"
      searchPlaceholder="Search by store or customer…"
      load={async (q) => {
        const rows = await adminApi.reportStoreReviews();
        const needle = q.trim().toLowerCase();
        const items = needle
          ? rows.filter((row) =>
              [row.ec_store_name, row.username, row.cr_feel, row.cr_problems]
                .map((v) => String(v ?? "").toLowerCase())
                .some((v) => v.includes(needle)),
            )
          : rows;
        return { items, total: items.length };
      }}
      columns={REVIEW_COLUMNS}
    />
  );
}

export function SuggestionsPage() {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Suggestions</h1>
          <p className="page-sub">
            Suggestions from the storefront contact form are managed in Contact forms.
          </p>
        </div>
        <Link className="btn btn-primary" to="/contacts">
          Open contact forms
        </Link>
      </header>
      <section className="card" style={{ padding: 20 }}>
        <p className="muted" style={{ margin: 0 }}>
          Use <Link to="/contacts">Help center → Contact forms</Link> to search, triage, reply via support chat,
          and archive customer messages.
        </p>
      </section>
    </div>
  );
}

export function CustomerVoiceReportsPage() {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Feedback and Reports</h1>
        <p className="page-sub">Customer feedbacks, suggestions, and store review reports.</p>
      </header>

      <section className="settings-section card">
        <div className="settings-section-head">
          <span className="settings-section-icon" aria-hidden>
            <Star size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h2>Voice reports</h2>
            <p>Open customer feedback lists and review reports from Help center.</p>
          </div>
        </div>
        <ul className="settings-link-list">
          <li>
            <Link to="/support/feedback/reviews" className="settings-link-row">
              <span>
                <strong>Customer feedbacks</strong>
                <small>Store reviews from customers</small>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          </li>
          <li>
            <Link to="/support/feedback/suggestions" className="settings-link-row">
              <span>
                <strong>Suggestions</strong>
                <small>Contact form messages from customers</small>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          </li>
          <li>
            <Link to="/reports/store-reviews" className="settings-link-row">
              <span>
                <strong>Store reviews report</strong>
                <small>Full dated report under Reports</small>
              </span>
              <ChevronRight size={16} aria-hidden />
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
