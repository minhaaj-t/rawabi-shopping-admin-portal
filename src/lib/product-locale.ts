import { adminApi } from "./api";
import { emptyLocale, mergeLocale, type LocaleMap } from "./seo-utils";

export type FeatureRow = {
  title: LocaleMap;
  text: LocaleMap;
};

export function emptyFeatureRow(): FeatureRow {
  return { title: emptyLocale(), text: emptyLocale() };
}

export function mergeFeatureRow(raw?: { title?: unknown; text?: unknown } | null): FeatureRow {
  const title =
    raw?.title && typeof raw.title === "object" && !Array.isArray(raw.title)
      ? mergeLocale(raw.title as Record<string, string>)
      : mergeLocale({ English: String(raw?.title ?? ""), Arabic: "" });
  const text =
    raw?.text && typeof raw.text === "object" && !Array.isArray(raw.text)
      ? mergeLocale(raw.text as Record<string, string>)
      : mergeLocale({ English: String(raw?.text ?? ""), Arabic: "" });
  return { title, text };
}

export async function translateTexts(texts: string[]): Promise<string[]> {
  if (!texts.length) return [];
  const res = await adminApi.translate({ texts, from: "en", to: "ar" });
  return res.translations.map((t) => String(t ?? ""));
}

export async function translateLocaleFields(fields: LocaleMap[]): Promise<LocaleMap[]> {
  const english = fields.map((f) => f.English?.trim() ?? "");
  const hasAny = english.some(Boolean);
  if (!hasAny) return fields;

  const translated = await translateTexts(english);
  return fields.map((field, i) => ({
    ...field,
    Arabic: english[i] ? translated[i] || field.Arabic : field.Arabic,
  }));
}

export async function translateFeatureRows(rows: FeatureRow[]): Promise<FeatureRow[]> {
  const english: string[] = [];
  const slots: Array<{ idx: number; key: "title" | "text" }> = [];

  rows.forEach((row, idx) => {
    const titleEn = row.title.English?.trim() ?? "";
    const textEn = row.text.English?.trim() ?? "";
    if (titleEn) {
      english.push(titleEn);
      slots.push({ idx, key: "title" });
    }
    if (textEn) {
      english.push(textEn);
      slots.push({ idx, key: "text" });
    }
  });

  if (!english.length) return rows;

  const translated = await translateTexts(english);
  const next = rows.map((row) => ({
    title: { ...row.title },
    text: { ...row.text },
  }));

  slots.forEach((slot, i) => {
    next[slot.idx][slot.key] = {
      ...next[slot.idx][slot.key],
      Arabic: translated[i] || next[slot.idx][slot.key].Arabic,
    };
  });

  return next;
}
