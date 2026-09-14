import { useEffect, useState } from 'react';
import { socket, fetchWaStatus, logoutWa, startCampaign, pauseCampaign, resumeCampaign, stopCampaign, fetchCampaign } from './api';
import ConnectPanel from './components/ConnectPanel';
import UploadPanel from './components/UploadPanel';
import ComposePanel from './components/ComposePanel';
import StatusPanel from './components/StatusPanel';

export default function App() {
  const [waStatus, setWaStatus] = useState({ status: 'disconnected' });
  const [qr, setQr] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchWaStatus().then((s) => {
      setWaStatus(s);
      setQr(s.qr || null);
    });

    socket.on('wa:status', (s) => {
      setWaStatus(s);
      setQr(s.qr || null);
    });

    socket.on('campaign:progress', (payload) => {
      setCampaign((prev) => (prev ? { ...prev, sent: payload.sent, failed: payload.failed, total: payload.total } : prev));
      setLog((prev) => [{ number: payload.number, status: payload.status, error: payload.error }, ...prev].slice(0, 200));
    });

    socket.on('campaign:done', ({ status }) => {
      setRunning(false);
      setCampaign((prev) => (prev ? { ...prev, status } : prev));
    });

    return () => {
      socket.off('wa:status');
      socket.off('campaign:progress');
      socket.off('campaign:done');
    };
  }, []);

  function handleUploaded(data) {
    setUploadResult(data);
    setCampaign({ id: data.campaignId, total: data.total, sent: 0, failed: 0, status: 'draft' });
    setLog([]);
  }

  async function handleSend(message, delayMs) {
    if (!uploadResult) return;
    await startCampaign(uploadResult.campaignId, message, delayMs);
    setRunning(true);
    setCampaign((prev) => ({ ...prev, status: 'running' }));
  }

  async function handlePause() {
    await pauseCampaign(uploadResult.campaignId);
    setCampaign((prev) => ({ ...prev, status: 'paused' }));
  }

  async function handleResume() {
    await resumeCampaign(uploadResult.campaignId);
    setCampaign((prev) => ({ ...prev, status: 'running' }));
  }

  async function handleStop() {
    await stopCampaign(uploadResult.campaignId);
  }

  const waConnected = waStatus.status === 'connected';

  return (
    <div className="min-h-screen">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Dispatch</h1>
          <p className="text-xs text-ink/50 mono">WhatsApp Bulk Blast — kirim pesan ke banyak nomor sekaligus</p>
        </div>
        <div className="mono text-xs text-ink/40">maks. 20.000 nomor / pengiriman</div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid gap-5">
        <ConnectPanel waStatus={waStatus} qr={qr} onLogout={logoutWa} />
        <UploadPanel onUploaded={handleUploaded} disabled={!waConnected} />
        <ComposePanel
          disabled={!waConnected || !uploadResult}
          campaign={campaign}
          running={running || campaign?.status === 'running' || campaign?.status === 'paused'}
          onSend={handleSend}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
        <StatusPanel campaign={campaign} log={log} />
      </main>
    </div>
  );
}
