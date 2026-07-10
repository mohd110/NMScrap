import { useRef, useState } from 'react';
import { BackHeader } from './Shared';
import BillReviewModal from './BillReviewModal';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { parseBill } from '../lib/parseBill';

export default function AIBillScannerScreen() {
  const { importBillItems } = useData();
  const { navigate } = useNav();
  const { notify } = useToast();
  const fileRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { items, rawText }

  const runScan = async (file) => {
    setScanning(true);
    try {
      const parsed = await parseBill(file);
      setResult(parsed);
    } catch (e) {
      notify(e.message || 'Could not read the bill', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async (items) => {
    try {
      await importBillItems(items, result?.rawText || '');
      notify(`${items.length} item${items.length !== 1 ? 's' : ''} added to inventory`);
      setResult(null);
      navigate('inventory');
    } catch (e) {
      notify(e.message || 'Import failed', 'error');
    }
  };

  return (
    <>
      <BackHeader title="AI Bill Scanner" rightLabel={null} />

      <div className="screen-content" style={{ overflow: 'hidden' }}>
        <div className="scanner-screen" style={{ height: '100%' }}>

          <div className="camera-view">
            <div className="camera-bill-preview">
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
                display: 'flex', flexDirection: 'column', padding: 20, gap: 6, overflow: 'hidden',
              }}>
                {[
                  'CAST IRON    2100 kg @ 18.00',
                  'STAINLESS STEEL  340 kg @ 85.00',
                  'COPPER WIRE MIX   45 kg @ 620',
                  '',
                  'SUBTOTAL     ...',
                ].map((line, i) => (
                  <div key={i} style={{ color: '#ccc', fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.5, opacity: 0.85 }}>
                    {line}
                  </div>
                ))}

                <div style={{
                  position: 'absolute', left: 16, right: 16, top: '20%', bottom: '30%',
                  border: '2px solid #00ff88', borderRadius: 6, boxShadow: '0 0 0 2000px rgba(0,0,0,0.3)',
                }}>
                  {[
                    { top: -2, left: -2, borderWidth: '3px 0 0 3px' },
                    { top: -2, right: -2, borderWidth: '3px 3px 0 0' },
                    { bottom: -2, left: -2, borderWidth: '0 0 3px 3px' },
                    { bottom: -2, right: -2, borderWidth: '0 3px 3px 0' },
                  ].map((corner, i) => (
                    <div key={i} style={{ position: 'absolute', width: 18, height: 18, borderStyle: 'solid', borderColor: '#00ff88', borderRadius: 3, ...corner }} />
                  ))}
                  {scanning && <div className="scan-laser" />}
                </div>
              </div>
            </div>

            <div className="camera-overlay-text">
              {scanning ? 'Reading bill…' : 'Scan printed bill or handwritten note'}
            </div>

            <div className="camera-controls">
              <div className="camera-control-btn" id="btn-gallery" onClick={() => !scanning && fileRef.current?.click()}>
                <span>🖼</span>
                <div style={{ fontSize: 10, marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>Gallery</div>
              </div>
              <div
                id="btn-shutter"
                onClick={() => !scanning && runScan(null)}
                style={{
                  width: 64, height: 64, background: scanning ? '#8a9e8a' : 'white',
                  borderRadius: '50%', border: '3px solid rgba(255,255,255,0.5)',
                  cursor: scanning ? 'default' : 'pointer', transition: 'background 0.2s',
                }}
              />
              <div className="camera-control-btn" id="btn-recent" onClick={() => navigate('inventory')}>
                <span>🕐</span>
                <div style={{ fontSize: 10, marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>Recent</div>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) runScan(f); e.target.value = ''; }}
            />
          </div>

          <div className="scanner-bottom">
            <div className="scanner-tabs">
              <div className="scanner-tab">Camera</div>
              <div className="scanner-tab active">Scan</div>
              <div className="scanner-tab" onClick={() => navigate('inventory')}>History</div>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <BillReviewModal
          initialItems={result.items}
          rawText={result.rawText}
          onCancel={() => setResult(null)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
