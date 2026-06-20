import { useEffect, useState } from 'react';
import type { PopupRequest, StatusResponse } from '@/lib/messages';
import logoImage from '@/assets/logo.png';
import './App.css';

function send<T = unknown>(message: PopupRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (response?.ok) resolve(response.result as T);
      else reject(new Error(response?.error ?? 'Request failed'));
    });
  });
}

function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [newId, setNewId] = useState('');

  async function refresh() {
    try {
      setStatus(await send<StatusResponse>({ type: 'pa:getStatus' }));
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 1500);
    return () => clearInterval(interval);
  }, []);

  const defaults = new Set(status?.defaultAllowed ?? []);

  return (
    <div className="wrap">
      <header className="header">
        <img className="logo" src={logoImage} alt="Page Action" />
        <span className="brand">Page Action</span>
        <span className="status">
          {status?.attachedTabs.length
            ? `Active · tab ${status.attachedTabs.join(', ')}`
            : 'Idle'}
        </span>
      </header>

      {status?.pending.length ? (
        <section className="card pending">
          <h2>Connection requests</h2>
          {status.pending.map((item) => (
            <div key={item.id} className="row">
              <code>{item.extensionId}</code>
              <div className="actions">
                <button
                  className="approve"
                  onClick={async () => {
                    await send({ type: 'pa:resolveConsent', id: item.id, approve: true });
                    void refresh();
                  }}
                >
                  Approve
                </button>
                <button
                  className="deny"
                  onClick={async () => {
                    await send({ type: 'pa:resolveConsent', id: item.id, approve: false });
                    void refresh();
                  }}
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="card">
        <h2>Allowed extensions</h2>
        {status?.allowed.length ? (
          status.allowed.map((id) => (
            <div key={id} className="row">
              <code>{id}</code>
              {defaults.has(id) ? (
                <span className="badge">default</span>
              ) : (
                <button
                  className="deny"
                  onClick={async () => {
                    await send({ type: 'pa:removeAllowed', id });
                    void refresh();
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="muted">None yet.</p>
        )}
        <div className="row add">
          <input
            placeholder="extension id"
            value={newId}
            onChange={(event) => setNewId(event.target.value)}
          />
          <button
            onClick={async () => {
              if (!newId.trim()) return;
              await send({ type: 'pa:addAllowed', id: newId.trim() });
              setNewId('');
              void refresh();
            }}
          >
            Add
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Tools</h2>
        {status?.tools.map((tool) => {
          const enabled = status.toggles[tool.name] !== false;
          return (
            <label key={tool.name} className="row tool" title={tool.description}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={async (event) => {
                  await send({ type: 'pa:setTool', name: tool.name, enabled: event.target.checked });
                  void refresh();
                }}
              />
              <span className="tool-name">{tool.name}</span>
            </label>
          );
        })}
      </section>
    </div>
  );
}

export default App;
