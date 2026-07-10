import { useState } from 'react';
import { BackHeader } from './Shared';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { inr, qty, lineValue, timeAgo, bazaarTotals } from '../lib/format';

export default function WednesdayLedgerScreen() {
  const { vendors, bazaars, closeBazaar } = useData();
  const { params, navigate, back } = useNav();
  const { notify } = useToast();
  const [returning, setReturning] = useState(null); // bazaar being closed

  const vendorId = params.vendorId;
  const vendor = vendors.find((v) => v.id === vendorId);
  const vendorBazaars = bazaars.filter((b) => b.vendor_id === vendorId);

  const allItems = vendorBazaars.flatMap((b) => b.items);
  const productsTaken = allItems.reduce((s, it) => s + Number(it.qty_assigned), 0);
  const soldReported = vendorBazaars
    .filter((b) => b.status === 'closed')
    .flatMap((b) => b.items)
    .reduce((s, it) => s + Number(it.qty_sold), 0);
  const inField = vendorBazaars
    .filter((b) => b.status === 'active')
    .flatMap((b) => b.items)
    .reduce((s, it) => s + (Number(it.qty_assigned) - Number(it.qty_returned)), 0);
  const pendingValue = vendorBazaars
    .filter((b) => b.status === 'active')
    .flatMap((b) => b.items)
    .reduce((s, it) => s + lineValue(Number(it.qty_assigned) - Number(it.qty_returned), it.unit_price), 0);

  const latestActive = vendorBazaars.find((b) => b.status === 'active');

  const handleClose = async (bazaar, returns) => {
    try {
      await closeBazaar(bazaar.id, returns);
      notify('Bazaar closed · unsold returned to stock');
      setReturning(null);
    } catch (e) {
      notify(e.message || 'Could not close bazaar', 'error');
    }
  };

  if (!vendor) {
    return (
      <>
        <BackHeader title="Bazaar" onBack={back} />
        <div className="screen-content"><div className="empty-hint" style={{ margin: 16 }}>Vendor not found.</div></div>
      </>
    );
  }

  return (
    <>
      <BackHeader title={vendor.name} onBack={back} rightLabel="हिंदी" />

      <div className="screen-content">
        <div className="ledger-screen">

          <div>
            <div className="ledger-vendor-title">{vendor.name}</div>
            <div className="ledger-vendor-id">📞 {vendor.phone || '—'} · {vendorBazaars.length} bazaar(s)</div>
          </div>

          <div className="action-btns-row">
            <button className="btn-record-return" style={{ background: 'var(--primary)' }}
                    onClick={() => navigate('assign', { vendorId })}>
              📦 Assign Inventory
            </button>
            <button className="btn-record-return"
                    style={{ background: latestActive ? 'var(--info)' : 'var(--text-muted)' }}
                    disabled={!latestActive}
                    onClick={() => latestActive && setReturning(latestActive)}>
              📥 Record Return
            </button>
          </div>

          <div className="ledger-stats-grid">
            <div className="ledger-stat-card">
              <div className="ledger-stat-icon">🗂️</div>
              <div className="ledger-stat-label">Products Taken</div>
              <div className="ledger-stat-value">{qty(productsTaken)}</div>
            </div>
            <div className="ledger-stat-card">
              <div className="ledger-stat-icon">✅</div>
              <div className="ledger-stat-label">Sold &amp; Reported</div>
              <div className="ledger-stat-value">{qty(soldReported)}</div>
            </div>
            <div className="ledger-stat-card">
              <div className="ledger-stat-icon" style={{ fontSize: 18 }}>🔴</div>
              <div className="ledger-stat-label">In Field (Active)</div>
              <div className="ledger-stat-value danger">{qty(inField)}</div>
            </div>
            <div className="ledger-stat-card dark-green">
              <div className="ledger-stat-icon">💰</div>
              <div className="ledger-stat-label white">Pending Value</div>
              <div className="ledger-stat-value white">{inr(pendingValue)}</div>
            </div>
          </div>

          <div>
            <div className="assignment-history-header">
              <div className="section-title">Assignment History</div>
              <div className="filter-sort-btns">
                <div className="icon-btn" onClick={() => navigate('reports')} title="Reports">📊</div>
              </div>
            </div>

            {vendorBazaars.length === 0 && (
              <div className="empty-hint">No bazaars yet. Tap <b>Assign Inventory</b> to start one.</div>
            )}

            <div className="assignment-history-list">
              {vendorBazaars.map((b) => {
                const assignedVal = b.items.reduce((s, it) => s + lineValue(it.qty_assigned, it.unit_price), 0);
                const revenue = bazaarTotals(b.items).revenue;
                const totalUnits = b.items.reduce((s, it) => s + Number(it.qty_assigned), 0);
                return (
                  <div key={b.id} className="history-card">
                    <div className="history-card-top">
                      <div>
                        <div className="history-batch">{b.name}</div>
                        <div className="history-time">{b.status === 'closed' ? `Closed ${timeAgo(b.closed_at)}` : `Opened ${timeAgo(b.opened_at)}`}</div>
                      </div>
                      <span className={`history-status ${b.status === 'closed' ? 'settled' : 'assigned'}`}>
                        {b.status === 'closed' ? 'CLOSED' : 'ACTIVE'}
                      </span>
                    </div>

                    <div className="history-item-name">
                      {b.items.length} product{b.items.length !== 1 ? 's' : ''} · {b.items.map((i) => i.product_name).slice(0, 2).join(', ')}{b.items.length > 2 ? '…' : ''}
                    </div>

                    <div className="history-card-bottom">
                      <div>
                        <div className="history-meta">ITEMS</div>
                        <div className="history-meta-value">{qty(totalUnits)}</div>
                      </div>
                      <div>
                        <div className="history-meta">{b.status === 'closed' ? 'REVENUE' : 'ASSIGNED VALUE'}</div>
                        <div className="history-meta-value">{inr(b.status === 'closed' ? revenue : assignedVal)}</div>
                      </div>
                    </div>

                    {b.status === 'active'
                      ? <button className="btn-view-receipt" onClick={() => setReturning(b)}>Record Return &amp; Close →</button>
                      : <button className="btn-view-receipt" onClick={() => navigate('reports', { bazaarId: b.id })}>View Sold Report →</button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {returning && (
        <RecordReturnsModal
          bazaar={returning}
          onClose={() => setReturning(null)}
          onConfirm={(returns) => handleClose(returning, returns)}
        />
      )}
    </>
  );
}

function RecordReturnsModal({ bazaar, onClose, onConfirm }) {
  const [returns, setReturns] = useState(
    bazaar.items.map((it) => ({
      item_id: it.id, name: it.product_name, unit: it.unit,
      assigned: Number(it.qty_assigned),
      cost: Number(it.unit_price),                               // wholesale
      qty_returned: '',
      sale_price: it.unit_price != null ? String(it.unit_price) : '', // selling, editable
    }))
  );
  const [busy, setBusy] = useState(false);

  const setField = (id, key, v) =>
    setReturns((list) => list.map((r) => (r.item_id === id ? { ...r, [key]: v } : r)));

  const soldUnits = returns.reduce((s, r) => s + Math.max(0, r.assigned - (Number(r.qty_returned) || 0)), 0);
  const revenue = returns.reduce((s, r) => {
    const sold = Math.max(0, r.assigned - (Number(r.qty_returned) || 0));
    return s + sold * (Number(r.sale_price) || 0);
  }, 0);
  const cost = returns.reduce((s, r) => {
    const sold = Math.max(0, r.assigned - (Number(r.qty_returned) || 0));
    return s + sold * r.cost;
  }, 0);
  const profit = revenue - cost;

  const invalid = returns.some((r) => (Number(r.qty_returned) || 0) > r.assigned);

  return (
    <Modal
      title="Record Returns"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="review-total-row"><span>Revenue · {qty(soldUnits)} sold</span><b>{inr(revenue)}</b></div>
          <div className="review-total-row no-print" style={{ fontSize: 13 }}>
            <span>Profit (internal)</span>
            <b style={{ color: profit < 0 ? 'var(--danger)' : 'var(--primary)' }}>{inr(profit)}</b>
          </div>
          <button className="btn-confirm" disabled={busy || invalid}
                  onClick={async () => {
                    setBusy(true);
                    await onConfirm(returns.map((r) => ({
                      item_id: r.item_id,
                      qty_returned: Number(r.qty_returned) || 0,
                      sale_price: Number(r.sale_price) || 0,
                    })));
                    setBusy(false);
                  }}>
            {busy ? 'Closing…' : invalid ? 'Returns exceed assigned' : '✓ Close Bazaar & Return Stock'}
          </button>
        </div>
      }
    >
      <div className="review-hint">
        Enter how much came back <b>unsold</b> and the price each item <b>sold at</b>.
        The rest is recorded as sold, unsold stock returns to inventory, and profit is
        selling price minus your wholesale cost.
      </div>
      {returns.map((r) => {
        const sold = Math.max(0, r.assigned - (Number(r.qty_returned) || 0));
        const over = (Number(r.qty_returned) || 0) > r.assigned;
        const lineRevenue = sold * (Number(r.sale_price) || 0);
        const lineProfit = lineRevenue - sold * r.cost;
        return (
          <div key={r.item_id} className="review-item">
            <div className="review-item-head">
              <div className="review-name-static">{r.name}</div>
            </div>
            <div className="review-item-grid">
              <label className="review-field">
                <span>Assigned</span>
                <input value={qty(r.assigned, r.unit)} disabled />
              </label>
              <label className="review-field">
                <span>Returned</span>
                <input type="number" value={r.qty_returned} placeholder="0"
                       style={over ? { borderColor: 'var(--danger)' } : undefined}
                       onChange={(e) => setField(r.item_id, 'qty_returned', e.target.value)} />
              </label>
              <label className="review-field">
                <span>Sold</span>
                <input value={qty(sold, r.unit)} disabled />
              </label>
            </div>
            <div className="review-item-grid" style={{ marginTop: 6 }}>
              <label className="review-field">
                <span>Wholesale ₹/{r.unit}</span>
                <input value={inr(r.cost)} disabled />
              </label>
              <label className="review-field">
                <span>Sold ₹/{r.unit}</span>
                <input type="number" value={r.sale_price} placeholder="0"
                       onChange={(e) => setField(r.item_id, 'sale_price', e.target.value)} />
              </label>
              <label className="review-field">
                <span>Revenue</span>
                <input value={inr(lineRevenue)} disabled />
              </label>
            </div>
            <div className="review-line-value no-print">
              Profit: <b style={{ color: lineProfit < 0 ? 'var(--danger)' : 'var(--primary)' }}>{inr(lineProfit)}</b>
            </div>
          </div>
        );
      })}
    </Modal>
  );
}
