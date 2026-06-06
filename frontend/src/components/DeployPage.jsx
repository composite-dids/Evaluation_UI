import { useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import "./DeployPage.css";

const API_BASE_URL = "https://evaluation-ui-backend.onrender.com/api";

const DEPLOY_OPTIONS = ["GitHub", "Gmail", "arXiv", "Ether"];

function DeployPage() {
  const deployData = useMemo(() => {
    const raw = sessionStorage.getItem("deployData");
    return raw ? JSON.parse(raw) : null;
  }, []);

  const deployLockRef = useRef(false);

  const [assignments, setAssignments] = useState({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState("");
  const [popupData, setPopupData] = useState(null);

  if (!deployData) {
    return (
      <main className="deploy-page">
        <section className="deploy-card">
          <h1>No mechanism selected</h1>
          <p>Return to the main page and choose a mechanism to deploy.</p>

          <button
            className="deploy-cancel-button"
            onClick={() => {
              window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}`;
            }}
          >
            Cancel
          </button>
        </section>
      </main>
    );
  }

  const { mechanism, signals } = deployData;

  function updateAssignment(signalNumber, value) {
    setAssignments({
      ...assignments,
      [signalNumber]: value,
    });
  }

  function isOptionAlreadyUsed(option, currentSignalNumber) {
    return Object.entries(assignments).some(
      ([signalNumber, selectedOption]) =>
        Number(signalNumber) !== Number(currentSignalNumber) &&
        selectedOption === option
    );
  }

  function handleCancel() {
    window.close();

    setTimeout(() => {
      window.location.href = `${window.location.origin}${import.meta.env.BASE_URL}`;
    }, 100);
  }

  async function handleSubmit() {
    if (deployLockRef.current) {
      return;
    }

    deployLockRef.current = true;
    setDeployError("");
    setPopupData(null);

    if (signals.length > 4) {
      setDeployError("Deploy supports at most 4 signals.");
      deployLockRef.current = false;
      return;
    }

    const allSignalsAssigned = signals.every((signal) => assignments[signal]);

    if (!allSignalsAssigned) {
      setDeployError("Choose a source for every signal before submitting.");
      deployLockRef.current = false;
      return;
    }

    setIsDeploying(true);

    try {
      const response = await fetch(`${API_BASE_URL}/deploy/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mechanism,
          signals,
          assignments,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const backendError = data.error || "Deployment failed.";

        if (backendError.includes("nonce too low")) {
          throw new Error(
            "Deployment failed because another transaction was already sent from this wallet. Please wait a few seconds and submit again only once."
          );
        }

        throw new Error(backendError);
      }

      const qrDataUrl = await QRCode.toDataURL(data.link);

      setPopupData({
        link: data.link,
        links: data.links || [data.link],
        qrDataUrl,
      });
    } catch (error) {
      setDeployError(error.message || "Deployment failed.");
      console.error(error);
    } finally {
      setIsDeploying(false);
      deployLockRef.current = false;
    }
  }

  const allSignalsAssigned = signals.every((signal) => assignments[signal]);

  return (
    <main className="deploy-page">
      <section className="deploy-card">
        <div className="deploy-header">
          <div>
            <h1>Deploy Mechanism</h1>
            <p>Assign each signal to an external source.</p>
          </div>
        </div>

        <div className="deploy-mechanism-box">
          <span>Selected mechanism</span>
          <strong>{mechanism}</strong>
        </div>

        <div className="deploy-signals-box">
          <h2>Signals</h2>

          <div className="deploy-signal-list">
            {signals.map((signalNumber) => (
              <div className="deploy-signal-row" key={signalNumber}>
                <div>
                  <strong>s{signalNumber}</strong>
                  <span>Choose source</span>
                </div>

                <select
                  value={assignments[signalNumber] || ""}
                  onChange={(e) =>
                    updateAssignment(signalNumber, e.target.value)
                  }
                  disabled={isDeploying}
                >
                  <option value="">Select source</option>

                  {DEPLOY_OPTIONS.map((option) => (
                    <option
                      key={option}
                      value={option}
                      disabled={isOptionAlreadyUsed(option, signalNumber)}
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {deployError && <div className="deploy-error">{deployError}</div>}

        <div className="deploy-actions">
          <button
            className="deploy-cancel-button"
            onClick={handleCancel}
            disabled={isDeploying}
          >
            Cancel
          </button>

          <button
            className="deploy-submit-button"
            onClick={handleSubmit}
            disabled={!allSignalsAssigned || isDeploying}
          >
            {isDeploying ? "Deploying..." : "Submit"}
          </button>
        </div>
      </section>

      {popupData && (
        <div className="deployment-popup-overlay">
          <div className="deployment-popup">
            <button
              className="deployment-popup-close"
              onClick={() => setPopupData(null)}
            >
              ×
            </button>

            <h2>Deployment Successful</h2>
            <p>Your smart contract deployment link was created.</p>

            <img
              className="deployment-qr"
              src={popupData.qrDataUrl}
              alt="Deployment QR code"
            />

            <a
              className="deployment-link"
              href={popupData.link}
              target="_blank"
              rel="noreferrer"
            >
              {popupData.link}
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

export default DeployPage;