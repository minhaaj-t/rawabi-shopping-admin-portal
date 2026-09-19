import { ChevronRight } from "../lib/icons";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Crumb = { label: string; to?: string };

type Props = {
  crumbs?: Crumb[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function MarketingPageShell({ crumbs, title, subtitle, actions, children }: Props) {
  const trail: Crumb[] = [{ label: "Marketing", to: "/marketing" }, ...(crumbs ?? [])];

  return (
    <div className="page settings-form-page mkt-page">
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
