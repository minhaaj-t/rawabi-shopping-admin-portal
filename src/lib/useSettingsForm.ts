import { useEffect, useState, type FormEvent } from "react";

export function useSettingsForm<T>(
  load: () => Promise<T>,
  save: (body: Record<string, unknown>) => Promise<T>,
  toBody: (form: T) => Record<string, unknown>,
) {
  const [form, setForm] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void load()
      .then(setForm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load settings"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const saved = await save(toBody(form));
      setForm(saved);
      setMsg("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return { form, setForm, busy, msg, error, onSubmit };
}
