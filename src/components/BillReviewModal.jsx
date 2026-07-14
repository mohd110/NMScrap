import { useState } from 'react';
import Modal from './Modal';
import { useLang } from '../context/LangContext';
import { inr, lineValue } from '../lib/format';

const UNITS = ['kg', 'units', 'MT'];

// Editable review of the scanned bill BEFORE anything is written to inventory.
// The user can fix names/quantities/prices, delete misread lines, or add rows.
export default function BillReviewModal({ initialItems, rawText, onCancel, onConfirm }) {
  const { t } = useLang();
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
      title={t('rev_title')}
      onClose={onCancel}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="review-total-row">
            <span>{t('rev_total')}</span>
            <b>{inr(total)}</b>
          </div>
          <button className="btn-confirm" onClick={confirm} disabled={busy || validCount === 0}>
            {busy ? t('rev_adding') : t('rev_add_n', { n: validCount })}
          </button>
        </div>
      }
    >
      <div className="review-hint">{t('rev_hint')}</div>

      {items.map((it) => (
        <div key={it._k} className="review-item">
          <div className="review-item-head">
            <input
              className="review-name-input"
              value={it.name}
              placeholder={t('rev_name_ph')}
              onChange={(e) => setItem(it._k, 'name', e.target.value)}
            />
            <button className="review-remove" onClick={() => removeItem(it._k)} title={t('remove')}>🗑</button>
          </div>
          <div className="review-item-grid">
            <label className="review-field">
              <span>{t('rev_qty')}</span>
              <input type="number" value={it.quantity}
                     onChange={(e) => setItem(it._k, 'quantity', e.target.value)} />
            </label>
            <label className="review-field">
              <span>{t('rev_unit')}</span>
              <select value={it.unit} onChange={(e) => setItem(it._k, 'unit', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="review-field">
              <span>{t('rev_per_unit')}</span>
              <input type="number" value={it.unit_price}
                     onChange={(e) => setItem(it._k, 'unit_price', e.target.value)} />
            </label>
          </div>
          <div className="review-line-value">{t('rev_line', { v: inr(lineValue(it.quantity, it.unit_price)) })}</div>
        </div>
      ))}

      <button className="btn-add-item" style={{ marginTop: 4 }} onClick={addRow}>{t('rev_add_row')}</button>

      {rawText && (
        <div className="review-raw">
          <button className="review-raw-toggle" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? '▾' : '▸'} {t('rev_raw_text')}
          </button>
          {showRaw && <pre className="review-raw-text">{rawText}</pre>}
        </div>
      )}
    </Modal>
  );
}
