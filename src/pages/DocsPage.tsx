import { Link } from "react-router-dom";

const LINKS = [
  { to: "/products", title: "Products", desc: "Catalog, SKUs, offers, and drafts." },
  { to: "/orders", title: "Orders", desc: "Track, pick, and deliver customer orders." },
  { to: "/customers", title: "Customers", desc: "Accounts, spend, and order history." },
  { to: "/settings", title: "Settings", desc: "Shop rules, checkout, and storefront." },
  { to: "/marketing", title: "Marketing", desc: "Analytics, ads, SEO, and consent." },
  { to: "/profile", title: "Profile", desc: "Your account, theme, and notification sound." },
];

export function DocsPage() {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Doc</h1>
          <p className="page-sub">Short guides to the admin modules you use most.</p>
        </div>
      </header>
      <div className="card-grid">
        {LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="stat-card" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="muted">{item.to}</span>
            <strong>{item.title}</strong>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {item.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
