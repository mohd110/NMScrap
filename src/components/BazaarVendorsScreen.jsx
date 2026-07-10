import { useState } from 'react';
import { AppHeader } from './Shared';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { inr, lineValue } from '../lib/format';

const FREQ = [
  { value: 'weekly', label: 'Weekly', cls: 'weekly' },
  { value: 'major', label: 'Major', cls: 'major' },
  { value: 'new', label: 'New', cls: 'new' },
];

export default function BazaarVendorsScreen() {
  const { vendors, bazaars, loading, addVendor } = useData();
  const { navigate } = useNav();
  const { notify } = useToast();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // pending value = value still out in the field on active bazaars, per vendor
  const pendingByVendor = {};
  let totalPending = 0;
  for (const b of bazaars) {
    if (b.status !== 'active') continue;
    const val = b.items.reduce(
      (s, it) => s + lineValue((it.qty_assigned - it.qty_returned), it.unit_price), 0
    );
    pendingByVendor[b.vendor_id] = (pendingByVendor[b.vendor_id] || 0) + val;
    totalPending += val;
  }

  const activeVendorIds = new Set(bazaars.filter((b) => b.status === 'active').map((b) => b.vendor_id));

  const filtered = vendors.filter((v) =>
    `${v.name} ${v.phone || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const freqCls = (f) => FREQ.find((x) => x.value === f)?.cls || 'new';

  return (
    <>
      <AppHeader title="Bazaar Vendors" subtitle="Settlements" hindiLabel="हिंदी" />

      <div className="screen-content">
        <div className="vendors-screen">

          <div className="settlement-banner">
            <div>
              <div className="settlement-label">Total Settlement Due</div>
              <div className="settlement-amount">{inr(totalPending)}</div>
              <div className="settlement-sub">
                <span>ⓘ</span> Across {activeVendorIds.size} active bazaar{activeVendorIds.size !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontSize: 56, opacity: 0.15, position: 'absolute', right: 16 }}>🤝</div>
          </div>

          <button id="btn-add-vendor" className="btn-add-vendor" onClick={() => setAdding(true)}>
            👤+ Add New Vendor
          </button>

          {showSearch && (
            <div className="inv-search-wrap">
              <span className="inv-search-icon">🔍</span>
              <input className="inv-search-input" placeholder="Search vendors…" value={search}
                     onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
          )}

          <div className="vendor-list-title">Active Bazaar Vendors</div>

          {loading && <div className="empty-hint">Loading vendors…</div>}
          {!loading && filtered.length === 0 && (
            <div className="empty-hint">No vendors yet. Tap <b>Add New Vendor</b> to create one.</div>
          )}

          <div className="vendor-list">
            {filtered.map((v) => {
              const pending = pendingByVendor[v.id] || 0;
              return (
                <div key={v.id} className="vendor-card" id={`vendor-${v.id}`}
                     onClick={() => navigate('bazaar', { vendorId: v.id })}>
                  <div className="vendor-card-top">
                    <div>
                      <div className="vendor-name">{v.name}</div>
                      <div className="vendor-phone">📞 {v.phone || '—'}</div>
                    </div>
                    <span className={`freq-badge ${freqCls(v.frequency)}`}>
                      {FREQ.find((x) => x.value === v.frequency)?.label || 'New'}
                    </span>
                  </div>
                  <div className="vendor-card-bottom">
                    <span className="pending-label">Pending Settlement</span>
                    <span className={`pending-amount ${pending === 0 ? 'zero' : ''}`}>{inr(pending)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="fab-btn" style={{ display: 'flex', marginLeft: 'auto', marginRight: 0 }}
                  onClick={() => setShowSearch((s) => !s)}>🔍</button>
        </div>
      </div>

      {adding && (
        <VendorFormModal
          onClose={() => setAdding(false)}
          onSave={async (form) => {
            try {
              await addVendor({ name: form.name, phone: form.phone, frequency: form.frequency });
              notify('Vendor added');
              setAdding(false);
            } catch (e) {
              notify(e.message || 'Could not add vendor', 'error');
            }
          }}
        />
      )}
    </>
  );
}

function VendorFormModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', frequency: 'weekly' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      title="Add New Vendor"
      onClose={onClose}
      footer={
        <button className="btn-confirm" disabled={busy || !form.name.trim()}
                onClick={async () => { setBusy(true); await onSave(form); setBusy(false); }}>
          {busy ? 'Saving…' : '✓ Add Vendor'}
        </button>
      }
    >
      <div className="form-group">
        <div className="form-label">Vendor / Bazaar Name *</div>
        <input className="form-input" style={{ padding: '0 14px' }} value={form.name} autoFocus
               onChange={(e) => set('name', e.target.value)} placeholder="Wednesday Bazaar" />
      </div>
      <div className="form-group">
        <div className="form-label">Phone</div>
        <input className="form-input" style={{ padding: '0 14px' }} value={form.phone}
               onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
      </div>
      <div className="form-group">
        <div className="form-label">Frequency</div>
        <div className="form-select-wrap">
          <select className="form-select" value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
            {FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <span className="form-select-arrow">▾</span>
        </div>
      </div>
    </Modal>
  );
}
