import { Languages } from "../lib/icons";

const LANGS = ["English", "Arabic"] as const;

export type ProductLang = (typeof LANGS)[number];

type Props = {
  lang: ProductLang;
  onLangChange: (lang: ProductLang) => void;
  /** Hide auto-translate when the section should stay simple. */
  showTranslate?: boolean;
  onTranslate?: () => void | Promise<void>;
  translating?: boolean;
  disabled?: boolean;
};

export function PfLocaleBar({
  lang,
  onLangChange,
  showTranslate = false,
  onTranslate,
  translating = false,
  disabled = false,
}: Props) {
  return (
    <div className="pf-lang-bar">
      <div className="tabs">
        {LANGS.map((l) => (
          <button key={l} type="button" className={lang === l ? "active" : ""} onClick={() => onLangChange(l)}>
            {l}
          </button>
        ))}
      </div>
      {showTranslate && onTranslate ? (
        <button
          type="button"
          className="btn btn-secondary pf-translate-btn"
          disabled={disabled || translating}
          onClick={() => void onTranslate()}
        >
          <Languages size={14} />
          {translating ? "Translating…" : "Translate to Arabic"}
        </button>
      ) : null}
    </div>
  );
}
