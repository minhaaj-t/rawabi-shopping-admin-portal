import { ChevronRight } from "../lib/icons";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  section: string;
  sectionTo?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function SettingsPageShell({ section, sectionTo, title, subtitle, actions, children }: Props) {
  return (
    <div className="page settings-form-page">
      <header className="page-head">
        <div>
          <p className="settings-crumb">
            <Link to="/settings">Settings</Link>
            <ChevronRight size={14} aria-hidden />
            {sectionTo ? (
              <>
                <Link to={sectionTo}>{section}</Link>
                <ChevronRight size={14} aria-hidden />
              </>
            ) : null}
            <span>{sectionTo ? title : section}</span>
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

type ToggleProps = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

export function SettingsToggle({ label, hint, checked, onChange }: ToggleProps) {
  return (
    <label className="settings-toggle">
      <span className="settings-toggle-copy">
        <span className="pf-label">{label}</span>
        {hint ? <span className="pf-hint">{hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
