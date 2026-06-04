import { useState } from "react";
import "./MechanismDashboard.css";

const API_BASE_URL = "http://localhost:8080/api";

const AND_SYMBOL = "∧";
const OR_SYMBOL = "∨";

function MechanismDashboard({ numberOfKeys }) {
  const [mode, setMode] = useState("optimal");
  const [currentTerm, setCurrentTerm] = useState([]);
  const [finalMechanism, setFinalMechanism] = useState([]);
  const [error, setError] = useState("");

  function clearError() {
    setError("");
  }

  function addSignalToLine(signalNumber) {
    clearError();

    if (currentTerm.length === 0) {
      setCurrentTerm([
        {
          type: "signal",
          value: signalNumber,
        },
      ]);
      return;
    }

    setCurrentTerm([
      ...currentTerm,
      {
        type: "operator",
        value: AND_SYMBOL,
      },
      {
        type: "signal",
        value: signalNumber,
      },
    ]);
  }

  function cleanLine() {
    setCurrentTerm([]);
    clearError();
  }

  function termToSignalList(term) {
    return term
      .filter((item) => item.type === "signal")
      .map((item) => item.value);
  }

  function normalizeSignalList(signalList) {
    return [...signalList].sort((a, b) => a - b).join(",");
  }

  async function addTermToMechanism() {
    clearError();

    if (currentTerm.length === 0) {
      setError("Cannot add an empty term.");
      return;
    }

    const newTermSignals = termToSignalList(currentTerm);
    const existingTermsSignals = finalMechanism.map((term) =>
      termToSignalList(term)
    );

    const newTermNormalized = normalizeSignalList(newTermSignals);

    const alreadyExists = existingTermsSignals.some(
      (term) => normalizeSignalList(term) === newTermNormalized
    );

    if (alreadyExists) {
      setError("This term already exists in the mechanism.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/mechanism/check-dominance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          existingTerms: existingTermsSignals,
          newTerm: newTermSignals,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.dominated) {
        const dominatingTerm =
          data.dominatingTerm && data.dominatingTerm.length > 0
            ? data.dominatingTerm.map((signal) => `s${signal}`).join(" ∧ ")
            : "an existing term";

        setError(`This term is dominated by ${dominatingTerm}.`);
        return;
      }

      setFinalMechanism([...finalMechanism, currentTerm]);
      setCurrentTerm([]);
    } catch (err) {
      setError(
        "Could not check dominance. Make sure the Java backend is running on port 8080."
      );
      console.error(err);
    }
  }

  function clearFinalMechanism() {
    setFinalMechanism([]);
    clearError();
  }

  function computeMechanism() {
    clearError();

    if (finalMechanism.length === 0) {
      setError("Cannot compute an empty mechanism.");
      return;
    }

    console.log("Mechanism to compute:", finalMechanism);
    setError("Backend computation will be implemented later.");
  }

  function renderTerm(term) {
    if (term.length === 0) {
      return <span className="placeholder-text">Build your term here</span>;
    }

    return term.map((item, index) => (
      <span
        key={`${item.type}-${item.value}-${index}`}
        className={item.type === "signal" ? "term-key" : "term-operator"}
      >
        {item.type === "signal" ? `s${item.value}` : item.value}
      </span>
    ));
  }

  function renderFinalMechanism() {
    if (finalMechanism.length === 0) {
      return <span className="placeholder-text">No manual terms added yet</span>;
    }

    return finalMechanism.map((term, index) => (
      <span key={index} className="final-term-wrapper">
        {index > 0 && <span className="final-or">{OR_SYMBOL}</span>}
        <span className="final-term">{renderTerm(term)}</span>
      </span>
    ));
  }

  return (
    <section className="mechanism-card">
      <div className="mechanism-header">
        <div>
          <h1>Mechanism</h1>
          <p>Choose an optimal mechanism or build one manually.</p>
        </div>

        <div className="mode-toggle">
          <button
            className={mode === "optimal" ? "active" : ""}
            onClick={() => setMode("optimal")}
          >
            Optimal
          </button>

          <button
            className={mode === "manual" ? "active" : ""}
            onClick={() => setMode("manual")}
          >
            Manual
          </button>
        </div>
      </div>

      {mode === "optimal" ? (
        <div className="optimal-box">
          <span className="optimal-label">Optimal mechanism</span>

          <div className="optimal-result">
            Backend optimal mechanism will appear here later
          </div>

          <p>
            Later, this value will be computed by the Java backend according to
            the number of signals.
          </p>
        </div>
      ) : (
        <div className="manual-builder">
          <div className="builder-toolbar">
            {numberOfKeys === 0 ? (
              <span className="no-keys-message">Add signals first</span>
            ) : (
              [...Array(numberOfKeys)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => addSignalToLine(index + 1)}
                >
                  s{index + 1}
                </button>
              ))
            )}

            <button className="clean-button" onClick={cleanLine}>
              Clean
            </button>

            <button className="add-term-button" onClick={addTermToMechanism}>
              Add
            </button>
          </div>

          <div className="manual-layout">
            <div className="mechanism-line-box">
              <h3>Current Term</h3>
              <div className="mechanism-line">{renderTerm(currentTerm)}</div>
            </div>

            <div className="mechanism-line-box">
              <div className="line-box-header">
                <h3>Added Mechanism</h3>

                <div className="line-box-actions">
                  <button
                    className="small-clear-button"
                    onClick={clearFinalMechanism}
                  >
                    Clear
                  </button>

                  <button
                    className="small-compute-button"
                    onClick={computeMechanism}
                  >
                    Compute
                  </button>
                </div>
              </div>

              <div className="mechanism-line final-line">
                {renderFinalMechanism()}
              </div>
            </div>
          </div>

          {error && <div className="mechanism-error">{error}</div>}
        </div>
      )}
    </section>
  );
}

export default MechanismDashboard;