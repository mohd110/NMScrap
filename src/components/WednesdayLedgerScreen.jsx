import { useState } from 'react';
import { BackHeader } from './Shared';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import { inr, qty, lineValue, timeAgo, bazaarTotals } from '../lib/format';

export default function WednesdayLedgerScreen() {
  const { vendors, bazaars, closeBazaar } = useData();
  const { params, navigate, back } = useNav();
  const { notify } = useToast();
  const { t } = useLang();
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

  const handleClose = async (bazaar, returns, amountReceived) => {
    try {
      await closeBazaar(bazaar.id, returns, amountReceived);
      notify(t('led_closed_ok'));
      setReturning(null);
    } catch (e) {
      notify(e.message || t('led_close_failed'), 'error');
    }
  };

  if (!vendor) {
    return (
      <>
        <BackHeader title={t('led_bazaar')} onBack={back} />
        <div className="screen-content"><div className="empty-hint" style={{ margin: 16 }}>{t('led_vendor_not_found')}</div></div>
      </>
    );
  }

  return (
    <>
      <BackHeader title={vendor.name} onBack={back} />

      <div className="screen-content">
        <div className="ledger-screen">

          <div>
            <div className="ledger-vendor-title">{vendor.name}</div>
            <div className="ledger-vendor-id">📞 {vendor.phone || '—'} · {t('led_bazaars_count', { n: vendorBazaars.length })}</div>
          </div>

          <div className="action-btns-row">
            <button className="btn-record-return" style={{ background: 'var(--primary)' }}
                    onClick={() => navigate('assign', { vendorId })}>
              {t('led_assign_inventory')}
            </button>
            <button className="btn-record-return"
                    style={{ background: latestActive ? 'var(--info)' : 'var(--text-muted)' }}
                    disabled={!latestActive}
                    onClick={() => latestActive && setReturning(latestActive)}>
              {t('led_record_return')}
            </button>
          </div>

          <div className="ledger-stats-grid">
            <div className="ledger-stat-card">
              <div className="ledger-stat-icon">🗂️</div>
              <div className="ledger-stat-label">{t('led_products_taken')}</div>
              <div className="ledger-stat-value">{qty(productsTaken)}</div>
            </div>
            <div className="ledger-stat-card">
              <div className="ledger-stat-icon">✅</div>
              <div className="ledger-stat-label">{t('led_sold_reported')}</div>
              <div className="ledger-stat-value">{qty(soldReported)}</div>
            </div>
            <div className="ledger-stat-card">
              <div className="ledger-stat-icon" style={{ fontSize: 18 }}>🔴</div>
              <div className="ledger-stat-label">{t('led_in_field')}</div>
              <div className="ledger-stat-value danger">{qty(inField)}</div>
            </div>
            <div className="ledger-stat-card dark-green">
              <div className="ledger-stat-icon">💰</div>
              <div className="ledger-stat-label white">{t('led_pending_value')}</div>
              <div className="ledger-stat-value white">{inr(pendingValue)}</div>
            </div>
          </div>

          <div>
            <div className="assignment-history-header">
              <div className="section-title">{t('led_assignment_history')}</div>
              <div className="filter-sort-btns">
                <div className="icon-btn" onClick={() => navigate('reports')} title={t('led_reports')}>📊</div>
              </div>
            </div>

            {vendorBazaars.length === 0 && (
              <div className="empty-hint">{t('led_no_bazaars')}</div>
            )}

            <div className="assignment-history-list">
              {vendorBazaars.map((b) => {
                const assignedVal = b.items.reduce((s, it) => s + lineValue(it.qty_assigned, it.unit_price), 0);
                const revenue = bazaarTotals(b).revenue;
                const totalUnits = b.items.reduce((s, it) => s + Number(it.qty_assigned), 0);
                return (
                  <div key={b.id} className="history-card">
                    <div className="history-card-top">
                      <div>
                        <div className="history-batch">{b.name}</div>
                        <div className="history-time">{b.status === 'closed' ? t('led_closed_when', { when: timeAgo(b.closed_at) }) : t('led_opened', { when: timeAgo(b.opened_at) })}</div>
                      </div>
                      <span className={`history-status ${b.status === 'closed' ? 'settled' : 'assigned'}`}>
                        {b.status === 'closed' ? t('led_closed') : t('led_active')}
                      </span>
                    </div>

                    <div className="history-item-name">
                      {t('led_products', { n: b.items.length })} · {b.items.map((i) => i.product_name).slice(0, 2).join(', ')}{b.items.length > 2 ? '…' : ''}
                    </div>

                    <div className="history-card-bottom">
                      <div>
                        <div className="history-meta">{t('led_items_caps')}</div>
                        <div className="history-meta-value">{qty(totalUnits)}</div>
                      </div>
                      <div>
                        <div className="history-meta">{b.status === 'closed' ? t('led_revenue_caps') : t('led_assigned_value_caps')}</div>
                        <div className="history-meta-value">{inr(b.status === 'closed' ? revenue : assignedVal)}</div>
                      </div>
                    </div>

                    {b.status === 'active'
                      ? <button className="btn-view-receipt" onClick={() => setReturning(b)}>{t('led_record_return_close')}</button>
                      : <button className="btn-view-receipt" onClick={() => navigate('reports', { bazaarId: b.id })}>{t('led_view_sold_report')}</button>}
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
          onConfirm={(returns, amountReceived) => handleClose(returning, returns, amountReceived)}
        />
      )}
    </>
  );
}

function RecordReturnsModal({ bazaar, onClose, onConfirm }) {
  const { t } = useLang();
  const [returns, setReturns] = useState(
    bazaar.items.map((it) => ({
      item_id: it.id, name: it.product_name, unit: it.unit,
      assigned: Number(it.qty_assigned),
      cost: Number(it.unit_price),           // wholesale
      qty_returned: '',
    }))
  );
  const [amountReceived, setAmountReceived] = useState('');
  const [busy, setBusy] = useState(false);

  const setRet = (id, v) => setReturns((list) => list.map((r) => (r.item_id === id ? { ...r, qty_returned: v } : r)));

  const soldUnits = returns.reduce((s, r) => s + Math.max(0, r.assigned - (Number(r.qty_returned) || 0)), 0);
  // Wholesale cost of the goods that sold.
  const cost = returns.reduce((s, r) => {
    const sold = Math.max(0, r.assigned - (Number(r.qty_returned) || 0));
    return s + sold * r.cost;
  }, 0);
  const revenue = Number(amountReceived) || 0;
  const profit = revenue - cost;

  const invalid = returns.some((r) => (Number(r.qty_returned) || 0) > r.assigned);

  return (
    <Modal
      title={t('settle_title')}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="review-total-row"><span>{t('settle_amount_received')}</span><b>{inr(revenue)}</b></div>
          <div className="review-total-row no-print" style={{ fontSize: 13 }}>
            <span>{t('settle_profit_of', { n: qty(soldUnits) })}</span>
            <b style={{ color: profit < 0 ? 'var(--danger)' : 'var(--primary)' }}>{inr(profit)}</b>
          </div>
          <button className="btn-confirm" disabled={busy || invalid}
                  onClick={async () => {
                    setBusy(true);
                    await onConfirm(
                      returns.map((r) => ({ item_id: r.item_id, qty_returned: Number(r.qty_returned) || 0 })),
                      revenue
                    );
                    setBusy(false);
                  }}>
            {busy ? t('settle_closing') : invalid ? t('settle_exceed') : t('settle_close_return')}
          </button>
        </div>
      }
    >
      <div className="review-hint">{t('settle_hint')}</div>

      {returns.map((r) => {
        const sold = Math.max(0, r.assigned - (Number(r.qty_returned) || 0));
        const over = (Number(r.qty_returned) || 0) > r.assigned;
        return (
          <div key={r.item_id} className="review-item">
            <div className="review-item-head">
              <div className="review-name-static">{r.name}</div>
            </div>
            <div className="review-item-grid">
              <label className="review-field">
                <span>{t('settle_assigned')}</span>
                <input value={qty(r.assigned, r.unit)} disabled />
              </label>
              <label className="review-field">
                <span>{t('settle_returned')}</span>
                <input type="number" value={r.qty_returned} placeholder="0"
                       style={over ? { borderColor: 'var(--danger)' } : undefined}
                       onChange={(e) => setRet(r.item_id, e.target.value)} />
              </label>
              <label className="review-field">
                <span>{t('settle_sold')}</span>
                <input value={qty(sold, r.unit)} disabled />
              </label>
            </div>
          </div>
        );
      })}

      <div className="settle-amount">
        <div className="form-label">{t('settle_total_received')}</div>
        <input className="form-input" style={{ padding: '0 14px' }} type="number"
               value={amountReceived} placeholder={t('settle_total_received_ph')}
               onChange={(e) => setAmountReceived(e.target.value)} autoFocus />
        <div className="settle-amount-hint no-print">
          {t('settle_cogs_hint', { cost: inr(cost), n: qty(soldUnits) })}
        </div>
      </div>
    </Modal>
  );
}
