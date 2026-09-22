import { useState } from "react";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { RegistrationForm } from "./components/RegistrationForm";
import { FarmerList } from "./components/FarmerList";
import "./App.css";

function App() {
  const { isOnline, manualOverride, toggleManualOffline } = useOnlineStatus();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>OAF Field Officer — Farmer Registration</h1>
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

      <main>
        <RegistrationForm
          isOnline={isOnline}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
        <FarmerList isOnline={isOnline} refreshKey={refreshKey} />
      </main>
    </div>
  );
}

export default App;
