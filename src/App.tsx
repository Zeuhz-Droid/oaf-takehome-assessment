import { useState } from "react";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { RegistrationForm } from "./components/RegistrationForm";
import { FarmerList } from "./components/FarmerList";
import { AdminPortal } from "./components/AdminPortal";
import "./App.css";

type View = "field-officer" | "admin";

function App() {
  const { isOnline, manualOverride, toggleManualOffline } = useOnlineStatus();
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<View>("field-officer");

  return (
    <div className="app">
      <header className="app-header">
        <h1>OAF Farmer Registration</h1>
        <div className="status-bar">
          <span className={isOnline ? "status-online" : "status-offline"}>
            {isOnline ? "🟢 Online" : "🔴 Offline"}
          </span>
          <button onClick={toggleManualOffline}>
            {manualOverride === "force-offline"
              ? "Simulate: go back online"
              : "Simulate: go offline"}
          </button>
        </div>
      </header>

      <nav className="view-tabs">
        <button
          className={view === "field-officer" ? "tab-active" : "tab"}
          onClick={() => setView("field-officer")}
        >
          Field Officer
        </button>
        <button
          className={view === "admin" ? "tab-active" : "tab"}
          onClick={() => setView("admin")}
        >
          Admin Portal
        </button>
      </nav>

      <main>
        {view === "field-officer" ? (
          <>
            <RegistrationForm
              isOnline={isOnline}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
            <FarmerList isOnline={isOnline} refreshKey={refreshKey} />
          </>
        ) : (
          <AdminPortal />
        )}
      </main>
    </div>
  );
}

export default App;
