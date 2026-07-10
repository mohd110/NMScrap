import { useState } from 'react';
import Modal from './Modal';
import { inr, lineValue } from '../lib/format';

const UNITS = ['kg', 'units', 'MT'];

// Editable review of the scanned bill BEFORE anything is written to inventory.
// The user can fix names/quantities/prices, delete misread lines, or add rows.
export default function BillReviewModal({ initialItems, rawText, onCancel, onConfirm }) {
  const [items, setItems] = useState(
    initialItems.map((it, i) => ({ _k: i, name: it.name, unit: it.unit || 'units', quantity: it.quantity, unit_price: it.unit_price }))
  );
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const setItem = (k, field, value) =>
    setItems((list) => list.map((it) => (it._k === k ? { ...it, [field]: value } : it)));

  const removeItem = (k) => setItems((list) => list.filter((it) => it._k !== k));

  const addRow = () =>
    setItems((list) => [...list, { _k: Date.now(), name: '', unit: 'units', quantity: '', unit_price: '' }]);

  const total = items.reduce((s, it) => s + lineValue(it.quantity, it.unit_price), 0);

  const confirm = async () => {
    const clean = items
      .filter((it) => it.name.trim() && Number(it.quantity) > 0)
      .map((it) => ({ name: it.name.trim(), unit: it.unit, quantity: Number(it.quantity), unit_price: Number(it.unit_price) || 0 }));
    if (clean.length === 0) return;
    setBusy(true);
    await onConfirm(clean);
    setBusy(false);
  };

  const validCount = items.filter((it) => it.name.trim() && Number(it.quantity) > 0).length;

  return (
    <Modal
      title="Review Scanned Items"
      onClose={onCancel}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="review-total-row">
            <span>Total bill value</span>
            <b>{inr(total)}</b>
          </div>
          <button className="btn-confirm" onClick={confirm} disabled={busy || validCount === 0}>
            {busy ? 'Adding…' : `✓ Add ${validCount} item${validCount !== 1 ? 's' : ''} to Inventory`}
          </button>
        </div>
      }
    >
      <div className="review-hint">
        ✏️ Check every line — fix anything the scanner misread before adding it to stock.
      </div>

      {items.map((it) => (
        <div key={it._k} className="review-item">
          <div className="review-item-head">
            <input
              className="review-name-input"
              value={it.name}
              placeholder="Product name"
              onChange={(e) => setItem(it._k, 'name', e.target.value)}
            />
            <button className="review-remove" onClick={() => removeItem(it._k)} title="Remove line">🗑</button>
          </div>
          <div className="review-item-grid">
            <label className="review-field">
              <span>Qty</span>
              <input type="number" value={it.quantity}
                     onChange={(e) => setItem(it._k, 'quantity', e.target.value)} />
            </label>
            <label className="review-field">
              <span>Unit</span>
              <select value={it.unit} onChange={(e) => setItem(it._k, 'unit', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="review-field">
              <span>₹ / unit</span>
              <input type="number" value={it.unit_price}
                     onChange={(e) => setItem(it._k, 'unit_price', e.target.value)} />
            </label>
          </div>
          <div className="review-line-value">Line: {inr(lineValue(it.quantity, it.unit_price))}</div>
        </div>
      ))}

      <button className="btn-add-item" style={{ marginTop: 4 }} onClick={addRow}>＋ Add Row</button>

      {rawText && (
        <div className="review-raw">
          <button className="review-raw-toggle" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? '▾' : '▸'} Raw scanned text
          </button>
          {showRaw && <pre className="review-raw-text">{rawText}</pre>}
        </div>
      )}
    </Modal>
  );
}
