import { useState } from 'react';
import { AppHeader } from './Shared';
import Modal from './Modal';
import BillReceipt from './BillReceipt';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useLang } from '../context/LangContext';
import { inr, qty, lineValue, timeAgo, bazaarTotals } from '../lib/format';

export default function ReportsScreen() {
  const { bazaars, vendors, sales, loading } = useData();
  const { params } = useNav();
  const { t } = useLang();
  const [open, setOpen] = useState(params.bazaarId || null);
  const [viewBill, setViewBill] = useState(null);

  // ---- direct sales totals ----
  const salesRevenue = sales.reduce((s, x) => s + (Number(x.total) || 0), 0);
  const salesProfit = sales.reduce((s, x) => s + (Number(x.profit) || 0), 0);

  const closed = bazaars.filter((b) => b.status === 'closed');
  const active = bazaars.filter((b) => b.status === 'active');

  const vendorName = (id) => vendors.find((v) => v.id === id)?.name || 'Vendor';

  // overall bazaar totals: revenue = total received, profit = received − wholesale cost
  const closedItems = closed.flatMap((b) => b.items);
  const bazaarRevenue = closed.reduce((s, b) => s + bazaarTotals(b).revenue, 0);
  const bazaarProfit = closed.reduce((s, b) => s + bazaarTotals(b).profit, 0);
  const soldUnits = closedItems.reduce((s, it) => s + Number(it.qty_sold), 0);

  // Bazaar revenue is a single lump sum per bazaar, so it can't be split by
  // product. Rank products by UNITS sold instead.
  const byProduct = {};
  for (const b of closed) {
    for (const it of b.items) {
      const key = it.product_name;
      byProduct[key] ||= { name: key, units: 0, unit: it.unit };
      byProduct[key].units += Number(it.qty_sold);
    }
  }
  const leaderboard = Object.values(byProduct).sort((a, b) => b.units - a.units).slice(0, 6);
  const maxVal = Math.max(1, ...leaderboard.map((l) => l.units));

  return (
    <>
      <AppHeader title={t('rep_title')} subtitle={t('rep_sub')} />

      <div className="screen-content">
        <div className="reports-screen">

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">{t('rep_bazaar_revenue')}</div>
              <div className="stat-value green">{inr(bazaarRevenue)}</div>
              <div className="stat-change">{t('rep_units_closed', { units: qty(soldUnits), n: closed.length })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('rep_bazaar_profit')}</div>
              <div className={`stat-value ${bazaarProfit < 0 ? '' : 'green'}`}>{inr(bazaarProfit)}</div>
              <div className="stat-change">{t('rep_rev_minus_cost')}</div>
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: 12 }}>{t('rep_top_products')}</div>
              {leaderboard.map((l) => (
                <div key={l.name} className="lb-row">
                  <div className="lb-head">
                    <span className="lb-name">{l.name}</span>
                    <span className="lb-val">{qty(l.units, l.unit)}</span>
                  </div>
                  <div className="lb-track"><div className="lb-fill" style={{ width: `${(l.units / maxVal) * 100}%` }} /></div>
                  <div className="lb-sub">{t('rep_sold_across')}</div>
                </div>
              ))}
            </div>
          )}

          {active.length > 0 && (
            <div>
              <div className="section-title" style={{ marginBottom: 10 }}>{t('rep_in_progress')}</div>
              <div className="assignment-history-list">
                {active.map((b) => {
                  const assignedVal = b.items.reduce((s, it) => s + lineValue(it.qty_assigned, it.unit_price), 0);
                  return (
                    <div key={b.id} className="history-card">
                      <div className="history-card-top">
                        <div>
                          <div className="history-batch">{b.name}</div>
                          <div className="history-time">{vendorName(b.vendor_id)} · {t('rep_opened', { when: timeAgo(b.opened_at) })}</div>
                        </div>
                        <span className="history-status assigned">{t('rep_active')}</span>
                      </div>
                      <div className="history-item-name">{t('rep_assigned_awaiting', { v: inr(assignedVal) })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- Direct sales (individual product bills) ---- */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">{t('rep_direct_sales')}</div>
              <div className="stat-value green">{inr(salesRevenue)}</div>
              <div className="stat-change">{t('rep_bills', { n: sales.length })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('rep_profit_internal')}</div>
              <div className={`stat-value ${salesProfit < 0 ? '' : 'green'}`}>{inr(salesProfit)}</div>
              <div className="stat-change">{t('rep_not_on_bills')}</div>
            </div>
          </div>

          <div className="section-title" style={{ marginBottom: 10 }}>{t('rep_sale_bills')}</div>
          {!loading && sales.length === 0 && (
            <div className="empty-hint">{t('rep_no_direct_sales')}</div>
          )}
          <div className="assignment-history-list">
            {sales.map((s) => (
              <div key={s.id} className="history-card">
                <div className="history-card-top">
                  <div>
                    <div className="history-batch">{s.bill_no}{s.buyer_name ? ` · ${s.buyer_name}` : ''}</div>
                    <div className="history-time">{(s.payment_mode || 'cash').toUpperCase()} · {timeAgo(s.created_at)}</div>
                  </div>
                  <span className="history-status settled">{inr(s.total)}</span>
                </div>
                <div className="history-item-name">
                  {t('rep_items_profit', { n: s.items.length, profit: inr(s.profit) })}
                </div>
                <button className="btn-view-receipt" onClick={() => setViewBill(s)}>{t('rep_view_print_bill')}</button>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginBottom: 10 }}>{t('rep_sold_reports')}</div>
          {loading && <div className="empty-hint">{t('rep_loading')}</div>}
          {!loading && closed.length === 0 && (
            <div className="empty-hint">{t('rep_no_closed')}</div>
          )}

          <div className="assignment-history-list">
            {closed.map((b) => {
              const totals = bazaarTotals(b.items);
              const retUnits = b.items.reduce((s, it) => s + Number(it.qty_returned), 0);
              const isOpen = open === b.id;
              return (
                <div key={b.id} className="history-card">
                  <div className="history-card-top" style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : b.id)}>
                    <div>
                      <div className="history-batch">{b.name}</div>
                      <div className="history-time">{vendorName(b.vendor_id)} · {t('rep_closed_when', { when: timeAgo(b.closed_at) })}</div>
                    </div>
                    <span className="history-status settled">{inr(totals.revenue)}</span>
                  </div>

                  {isOpen && (
                    <div className="report-lines">
                      <div className="report-line report-line-head">
                        <span>{t('rep_col_product')}</span><span>{t('rep_col_sold')}</span><span>{t('rep_col_returned')}</span><span>{t('rep_col_cost')}</span>
                      </div>
                      {b.items.map((it) => (
                        <div key={it.id} className="report-line">
                          <span>{it.product_name}</span>
                          <span>{qty(it.qty_sold)}</span>
                          <span>{qty(it.qty_returned)}</span>
                          <span>{inr(lineValue(it.qty_sold, it.unit_price))}</span>
                        </div>
                      ))}
                      <div className="report-line report-line-total">
                        <span>{t('rep_amount_received')}</span>
                        <span>{qty(b.items.reduce((s, it) => s + Number(it.qty_sold), 0))}</span>
                        <span>{qty(retUnits)} {t('rep_ret')}</span>
                        <span>{inr(totals.revenue)}</span>
                      </div>
                      <div className="report-line" style={{ color: 'var(--text-muted)' }}>
                        <span>{t('rep_wholesale_cost_sold')}</span><span /><span /><span>− {inr(totals.cost)}</span>
                      </div>
                      <div className="report-line report-line-total">
                        <span>{t('rep_profit')}</span><span /><span />
                        <span style={{ color: totals.profit < 0 ? 'var(--danger)' : 'var(--primary)' }}>{inr(totals.profit)}</span>
                      </div>
                    </div>
                  )}

                  <button className="btn-view-receipt" onClick={() => setOpen(isOpen ? null : b.id)}>
                    {isOpen ? t('rep_hide_details') : t('rep_view_breakdown')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {viewBill && (
        <Modal title={t('rep_bill_title', { no: viewBill.bill_no })} onClose={() => setViewBill(null)}>
          <BillReceipt bill={viewBill} onClose={() => setViewBill(null)} />
        </Modal>
      )}
    </>
  );
}
