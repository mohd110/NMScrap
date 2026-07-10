import { useState } from 'react';
import { AppHeader } from './Shared';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { inr, qty, lineValue, timeAgo } from '../lib/format';

export default function ReportsScreen() {
  const { bazaars, vendors, loading } = useData();
  const { params } = useNav();
  const [open, setOpen] = useState(params.bazaarId || null);

  const closed = bazaars.filter((b) => b.status === 'closed');
  const active = bazaars.filter((b) => b.status === 'active');

  const vendorName = (id) => vendors.find((v) => v.id === id)?.name || 'Vendor';

  // overall totals
  const soldValue = closed.flatMap((b) => b.items).reduce((s, it) => s + lineValue(it.qty_sold, it.unit_price), 0);
  const soldUnits = closed.flatMap((b) => b.items).reduce((s, it) => s + Number(it.qty_sold), 0);

  // sold-by-product leaderboard
  const byProduct = {};
  for (const b of closed) {
    for (const it of b.items) {
      const key = it.product_name;
      byProduct[key] ||= { name: key, units: 0, value: 0, unit: it.unit };
      byProduct[key].units += Number(it.qty_sold);
      byProduct[key].value += lineValue(it.qty_sold, it.unit_price);
    }
  }
  const leaderboard = Object.values(byProduct).sort((a, b) => b.value - a.value).slice(0, 6);
  const maxVal = Math.max(1, ...leaderboard.map((l) => l.value));

  return (
    <>
      <AppHeader title="Reports" subtitle="Bazaar sales" hindiLabel={null} />

      <div className="screen-content">
        <div className="reports-screen">

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Sold Value</div>
              <div className="stat-value green">{inr(soldValue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Units Sold</div>
              <div className="stat-value">{qty(soldUnits)}</div>
              <div className="stat-change">{closed.length} closed bazaar{closed.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: 12 }}>Top Sold Products</div>
              {leaderboard.map((l) => (
                <div key={l.name} className="lb-row">
                  <div className="lb-head">
                    <span className="lb-name">{l.name}</span>
                    <span className="lb-val">{inr(l.value)}</span>
                  </div>
                  <div className="lb-track"><div className="lb-fill" style={{ width: `${(l.value / maxVal) * 100}%` }} /></div>
                  <div className="lb-sub">{qty(l.units, l.unit)} sold</div>
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

          <div className="section-title" style={{ marginBottom: 10 }}>Sold Reports</div>
          {loading && <div className="empty-hint">Loading…</div>}
          {!loading && closed.length === 0 && (
            <div className="empty-hint">No closed bazaars yet. Assign inventory to a bazaar and record its returns to generate a sold report.</div>
          )}

          <div className="assignment-history-list">
            {closed.map((b) => {
              const soldVal = b.items.reduce((s, it) => s + lineValue(it.qty_sold, it.unit_price), 0);
              const retUnits = b.items.reduce((s, it) => s + Number(it.qty_returned), 0);
              const isOpen = open === b.id;
              return (
                <div key={b.id} className="history-card">
                  <div className="history-card-top" style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : b.id)}>
                    <div>
                      <div className="history-batch">{b.name}</div>
                      <div className="history-time">{vendorName(b.vendor_id)} · closed {timeAgo(b.closed_at)}</div>
                    </div>
                    <span className="history-status settled">{inr(soldVal)}</span>
                  </div>

                  {isOpen && (
                    <div className="report-lines">
                      <div className="report-line report-line-head">
                        <span>Product</span><span>Sold</span><span>Returned</span><span>Value</span>
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
                        <span>Total</span>
                        <span>{qty(b.items.reduce((s, it) => s + Number(it.qty_sold), 0))}</span>
                        <span>{qty(retUnits)}</span>
                        <span>{inr(soldVal)}</span>
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
    </>
  );
}
