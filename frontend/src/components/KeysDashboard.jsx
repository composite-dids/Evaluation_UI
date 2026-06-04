import "./KeysDashboard.css";

const MAX_SIGNALS = 5;

function computeUniqueness(notComplete, notSybilProof) {
  const nc = Number(notComplete) || 0;
  const nsp = Number(notSybilProof) || 0;

  return Math.max(0, 100 - nc - nsp);
}

function KeysDashboard({ keys, setKeys }) {
  function addKey() {
    if (keys.length >= MAX_SIGNALS) return;

    const newKey = {
      id: Date.now(),
      notCompleteness: 0,
      notSybilProof: 0,
    };

    setKeys([...keys, newKey]);
  }

  function deleteKey(id) {
    setKeys(keys.filter((key) => key.id !== id));
  }

  function duplicateKey(id) {
    if (keys.length >= MAX_SIGNALS) return;

    const keyToDuplicate = keys.find((key) => key.id === id);
    if (!keyToDuplicate) return;

    const duplicatedKey = {
      ...keyToDuplicate,
      id: Date.now(),
    };

    setKeys([...keys, duplicatedKey]);
  }

  function updateKeyValue(id, field, value) {
    const numericValue = value === "" ? "" : Math.max(0, Math.min(100, Number(value)));

    setKeys(
      keys.map((key) =>
        key.id === id
          ? {
              ...key,
              [field]: numericValue,
            }
          : key
      )
    );
  }

  return (
    <section className="keys-card">
      <div className="keys-header">
        <div>
          <h1>Signals</h1>
          <p>Define up to {MAX_SIGNALS} signals and configure their properties.</p>
        </div>

        <button
          className="add-key-button"
          onClick={addKey}
          disabled={keys.length >= MAX_SIGNALS}
        >
          +
        </button>
      </div>

      <div className="keys-table-wrapper">
        <table className="keys-table">
          <thead>
            <tr>
              <th></th>
              <th>Uniqueness</th>
              <th>Not Complete</th>
              <th>Not Sybil-Proof</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  No signals yet. Click + to add your first signal.
                </td>
              </tr>
            ) : (
              keys.map((key, index) => {
                const uniqueness = computeUniqueness(
                  key.notCompleteness,
                  key.notSybilProof
                );

                return (
                  <tr key={key.id}>
                    <td className="key-number">Signal {index + 1}</td>

                    <td>
                      <input
                        value={`${uniqueness.toFixed(1)}%`}
                        readOnly
                        className="readonly-cell"
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={key.notCompleteness}
                        onChange={(e) =>
                          updateKeyValue(
                            key.id,
                            "notCompleteness",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={key.notSybilProof}
                        onChange={(e) =>
                          updateKeyValue(
                            key.id,
                            "notSybilProof",
                            e.target.value
                          )
                        }
                      />
                    </td>

                    <td className="actions-cell">
                      <button
                        className="copy-button"
                        onClick={() => duplicateKey(key.id)}
                        disabled={keys.length >= MAX_SIGNALS}
                      >
                        CC
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => deleteKey(key.id)}
                      >
                        -
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="keys-count">{keys.length}/{MAX_SIGNALS} signals added</p>
    </section>
  );
}

export default KeysDashboard;