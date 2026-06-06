import { useState } from "react";
import "./MechanismDashboard.css";

const API_BASE_URL = "https://evaluation-ui-backend.onrender.com";

const AND_SYMBOL = "∧";
const OR_SYMBOL = "∨";

function MechanismDashboard({ numberOfKeys, signals }) {
  const [mode, setMode] = useState("optimal");
  const [currentTerm, setCurrentTerm] = useState([]);
  const [finalMechanism, setFinalMechanism] = useState([]);
  const [error, setError] = useState("");

  const [optimalResult, setOptimalResult] = useState(null);
  const [optimalLoading, setOptimalLoading] = useState(false);

  const [manualResult, setManualResult] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);

  function clearError() {
    setError("");
  }

  function addSignalToLine(signalNumber) {
    clearError();

    if (currentTerm.length === 0) {
      setCurrentTerm([{ type: "signal", value: signalNumber }]);
      return;
    }

    setCurrentTerm([
      ...currentTerm,
      { type: "operator", value: AND_SYMBOL },
      { type: "signal", value: signalNumber },
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

  function signalsPayload() {
    return signals.map((signal) => ({
      notComplete: Number(signal.notCompleteness) || 0,
      notSybilProof: Number(signal.notSybilProof) || 0,
    }));
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
      setManualResult(null);
    } catch (err) {
      setError("Could not check dominance. Make sure the deployed backend is live.");
      console.error(err);
    }
  }

  function clearFinalMechanism() {
    setFinalMechanism([]);
    setManualResult(null);
    clearError();
  }

  async function computeManualMechanism() {
    clearError();

    if (!signals || signals.length === 0) {
      setManualResult(null);
      setError("Add at least one signal before computing the mechanism.");
      return;
    }

    if (finalMechanism.length === 0) {
      setManualResult(null);
      setError("Cannot compute an empty mechanism.");
      return;
    }

    setManualLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/mechanism/manual/compute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signals: signalsPayload(),
          terms: finalMechanism.map((term) => termToSignalList(term)),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Backend returned status ${response.status}`);
      }

      setManualResult(data);
    } catch (err) {
      setManualResult(null);
      setError(err.message || "Could not compute manual mechanism.");
      console.error(err);
    } finally {
      setManualLoading(false);
    }
  }

  async function loadOptimalMechanism() {
    clearError();

    if (!signals || signals.length === 0) {
      setOptimalResult(null);
      setError("Add at least one signal before computing the optimal mechanism.");
      return;
    }

    setOptimalLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/mechanism/optimal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signals: signalsPayload(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Backend returned status ${response.status}`);
      }

      setOptimalResult(data);
    } catch (err) {
      setOptimalResult(null);
      setError(err.message || "Could not compute optimal mechanism.");
      console.error(err);
    } finally {
      setOptimalLoading(false);
    }
  }

  function openDeployPage(result, terms) {
    clearError();

    if (deploying) {
      return;
    }

    if (!result) {
      setError("Compute the mechanism before deploying it.");
      return;
    }

    const usedSignals = Array.from(
      new Set(
        terms
          .flatMap((term) => term)
          .map((signal) => Number(signal))
      )
    ).sort((a, b) => a - b);

    if (usedSignals.length > 4) {
      setError(
        "Deploy supports at most 4 signals. Please choose a mechanism with 4 signals or fewer."
      );
      return;
    }

    setDeploying(true);

    sessionStorage.setItem(
      "deployData",
      JSON.stringify({
        mechanism: result.mechanism,
        signals: usedSignals,
      })
    );

    window.open(
      `${window.location.origin}${import.meta.env.BASE_URL}?page=deploy`,
      "_blank"
    );

    setTimeout(() => {
      setDeploying(false);
    }, 1500);
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

  function ProbabilityCards({ result, onDeploy, deploying }) {
    return (
      <div className="probability-section">
        <div className="optimal-probabilities">
          <div className="optimal-probability-card">
            <span>Successful</span>
            <strong>{result ? `${result.uniqueness}%` : "-"}</strong>
          </div>

          <div className="optimal-probability-card">
            <span>Not Complete</span>
            <strong>{result ? `${result.notComplete}%` : "-"}</strong>
          </div>

          <div className="optimal-probability-card">
            <span>Not Sybil-Proof</span>
            <strong>{result ? `${result.notSybilProof}%` : "-"}</strong>
          </div>
        </div>

        <button
          className="deploy-mechanism-button"
          onClick={onDeploy}
          disabled={!result || deploying}
        >
          {deploying ? "Deploying..." : "Deploy"}
        </button>
      </div>
    );
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
            onClick={() => {
              clearError();
              setMode("optimal");
            }}
          >
            Optimal
          </button>

          <button
            className={mode === "manual" ? "active" : ""}
            onClick={() => {
              clearError();
              setMode("manual");
            }}
          >
            Manual
          </button>
        </div>
      </div>

      {mode === "optimal" ? (
        <div className="optimal-box">
          <div className="line-box-header">
            <span className="optimal-label">Optimal mechanism</span>

            <button
              className="small-compute-button"
              onClick={loadOptimalMechanism}
              disabled={optimalLoading}
            >
              {optimalLoading ? "Computing..." : "Compute"}
            </button>
          </div>

          <div className="optimal-result">
            {optimalLoading
              ? "Computing optimal mechanism..."
              : optimalResult
              ? optimalResult.mechanism
              : "Click Compute to find the optimal mechanism"}
          </div>

          <ProbabilityCards
            result={optimalResult}
            deploying={deploying}
            onDeploy={() =>
              openDeployPage(optimalResult, optimalResult?.terms || [])
            }
          />
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
                    onClick={computeManualMechanism}
                    disabled={manualLoading}
                  >
                    {manualLoading ? "Computing..." : "Compute"}
                  </button>
                </div>
              </div>

              <div className="mechanism-line final-line">
                {renderFinalMechanism()}
              </div>
            </div>
          </div>

          <ProbabilityCards
            result={manualResult}
            deploying={deploying}
            onDeploy={() =>
              openDeployPage(
                manualResult,
                finalMechanism.map((term) => termToSignalList(term))
              )
            }
          />
        </div>
      )}

      {error && <div className="mechanism-error">{error}</div>}
    </section>
  );
}

export default MechanismDashboard;