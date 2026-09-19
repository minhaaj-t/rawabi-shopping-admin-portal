import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export function useOpenAddQuery(openAdd: () => void) {
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get("add") !== "1") return;
    openAdd();
    const next = new URLSearchParams(params);
    next.delete("add");
    setParams(next, { replace: true });
    // Open once when arriving from a shortcut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
