import { useState } from 'react';
import { AppHeader } from './Shared';
import Modal from './Modal';
import BillReceipt from './BillReceipt';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { inr, qty, lineValue, timeAgo, bazaarTotals } from '../lib/format';

export default function ReportsScreen() {
  const { bazaars, vendors, sales, loading } = useData();
  const { params } = useNav();
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
      <AppHeader title="Reports" subtitle="Bazaar sales" hindiLabel={null} />

      <div className="screen-content">
        <div className="reports-screen">

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Bazaar Revenue</div>
              <div className="stat-value green">{inr(bazaarRevenue)}</div>
              <div className="stat-change">{qty(soldUnits)} units · {closed.length} closed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bazaar Profit</div>
              <div className={`stat-value ${bazaarProfit < 0 ? '' : 'green'}`}>{inr(bazaarProfit)}</div>
              <div className="stat-change">revenue − wholesale cost</div>
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: 12 }}>Top Products by Units Sold</div>
              {leaderboard.map((l) => (
                <div key={l.name} className="lb-row">
                  <div className="lb-head">
                    <span className="lb-name">{l.name}</span>
                    <span className="lb-val">{qty(l.units, l.unit)}</span>
                  </div>
                  <div className="lb-track"><div className="lb-fill" style={{ width: `${(l.units / maxVal) * 100}%` }} /></div>
                  <div className="lb-sub">sold across bazaars</div>
                </div>
              ))}
            </div>
          )}

          {active.length > 0 && (
            <div>
              <div className="section-title" style={{ marginBottom: 10 }}>In Progress</div>
              <div className="assignment-history-list">
                {active.map((b) => {
                  const assignedVal = b.items.reduce((s, it) => s + lineValue(it.qty_assigned, it.unit_price), 0);
                  return (
                    <div key={b.id} className="history-card">
                      <div className="history-card-top">
                        <div>
                          <div className="history-batch">{b.name}</div>
                          <div className="history-time">{vendorName(b.vendor_id)} · opened {timeAgo(b.opened_at)}</div>
                        </div>
                        <span className="history-status assigned">ACTIVE</span>
                      </div>
                      <div className="history-item-name">{inr(assignedVal)} assigned · awaiting return</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- Direct sales (individual product bills) ---- */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Direct Sales</div>
              <div className="stat-value green">{inr(salesRevenue)}</div>
              <div className="stat-change">{sales.length} bill{sales.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Profit (internal)</div>
              <div className={`stat-value ${salesProfit < 0 ? '' : 'green'}`}>{inr(salesProfit)}</div>
              <div className="stat-change">not shown on bills</div>
            </div>
          </div>

          <div className="section-title" style={{ marginBottom: 10 }}>Sale Bills</div>
          {!loading && sales.length === 0 && (
            <div className="empty-hint">No direct sales yet. Tap <b>New Sale</b> on the Dashboard or Inventory to sell a product and generate a bill.</div>
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
                  {s.items.length} item{s.items.length !== 1 ? 's' : ''} · profit {inr(s.profit)}
                </div>
                <button className="btn-view-receipt" onClick={() => setViewBill(s)}>View / print bill 🧾</button>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginBottom: 10 }}>Sold Reports</div>
          {loading && <div className="empty-hint">Loading…</div>}
          {!loading && closed.length === 0 && (
            <div className="empty-hint">No closed bazaars yet. Assign inventory to a bazaar and record its returns to generate a sold report.</div>
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
                      <div className="history-time">{vendorName(b.vendor_id)} · closed {timeAgo(b.closed_at)}</div>
                    </div>
                    <span className="history-status settled">{inr(totals.revenue)}</span>
                  </div>

                  {isOpen && (
                    <div className="report-lines">
                      <div className="report-line report-line-head">
                        <span>Product</span><span>Sold</span><span>Returned</span><span>Cost</span>
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
                        <span>Amount received</span>
                        <span>{qty(b.items.reduce((s, it) => s + Number(it.qty_sold), 0))}</span>
                        <span>{qty(retUnits)} ret</span>
                        <span>{inr(totals.revenue)}</span>
                      </div>
                      <div className="report-line" style={{ color: 'var(--text-muted)' }}>
                        <span>Wholesale cost of sold</span><span /><span /><span>− {inr(totals.cost)}</span>
                      </div>
                      <div className="report-line report-line-total">
                        <span>Profit</span><span /><span />
                        <span style={{ color: totals.profit < 0 ? 'var(--danger)' : 'var(--primary)' }}>{inr(totals.profit)}</span>
                      </div>
                    </div>
                  )}

                  <button className="btn-view-receipt" onClick={() => setOpen(isOpen ? null : b.id)}>
                    {isOpen ? 'Hide details ▲' : 'View item breakdown ▼'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {viewBill && (
        <Modal title={`Bill ${viewBill.bill_no}`} onClose={() => setViewBill(null)}>
          <BillReceipt bill={viewBill} onClose={() => setViewBill(null)} />
        </Modal>
      )}
    </>
  );
}
