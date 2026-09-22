import { useEffect, useState, useCallback } from "react";

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [manualOverride, setManualOverride] = useState<
    "auto" | "force-offline"
  >("auto");

  useEffect(() => {
    const goOnline = () => setBrowserOnline(true);
    const goOffline = () => setBrowserOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const isOnline = manualOverride === "force-offline" ? false : browserOnline;

  const toggleManualOffline = useCallback(() => {
    setManualOverride((prev) => (prev === "auto" ? "force-offline" : "auto"));
  }, []);

  return { isOnline, manualOverride, toggleManualOffline };
}
