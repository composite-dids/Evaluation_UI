import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import KeysDashboard from "./components/KeysDashboard";
import MechanismDashboard from "./components/MechanismDashboard";
import DeployPage from "./components/DeployPage";
import "./style.css";

function App() {
  const [keys, setKeys] = useState([]);

  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");

  if (page === "deploy") {
    return <DeployPage />;
  }

  return (
    <main className="page">
      <KeysDashboard keys={keys} setKeys={setKeys} />
      <MechanismDashboard numberOfKeys={keys.length} signals={keys} />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);