import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import KeysDashboard from "./components/KeysDashboard";
import MechanismDashboard from "./components/MechanismDashboard";
import "./style.css";

function App() {
  const [keys, setKeys] = useState([]);

  return (
    <main className="page">
      <KeysDashboard keys={keys} setKeys={setKeys} />
      <MechanismDashboard numberOfKeys={keys.length} />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);