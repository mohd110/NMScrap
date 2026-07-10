import { AppHeader } from './Shared';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { inr, qty, lineValue } from '../lib/format';

export default function DashboardScreen() {
  const { products, bazaars, loading } = useData();
  const { navigate, goTab } = useNav();

  // ---- derived stats ----
  const inventoryValue = products.reduce((s, p) => s + lineValue(p.quantity, p.unit_price), 0);
  const totalUnits = products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);

  const closed = bazaars.filter((b) => b.status === 'closed');
  const soldValue = closed.reduce(
    (s, b) => s + b.items.reduce((si, it) => si + lineValue(it.qty_sold, it.unit_price), 0),
    0
  );

  const lowStock = products
    .filter((p) => Number(p.min_stock) > 0 && Number(p.quantity) <= Number(p.min_stock))
    .slice(0, 5);

  // A tiny 6-bar chart from the newest closed bazaars' sold value.
  const chartBars = buildChart(closed);

  return (
    <>
      <AppHeader title="NM Scrap" subtitle="Enterprises" hindiLabel="हिंदी" />

      <div className="screen-content">
        <div className="dashboard-screen">

          <div className="welcome-banner">
            <div className="welcome-text">Welcome Back 👋</div>
            <div className="welcome-name">Inventory Manager</div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total Stock</div>
              <div className="stat-value">{loading ? '—' : qty(totalUnits)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Sold (Bazaars)</div>
              <div className="stat-value green">{loading ? '—' : inr(soldValue)}</div>
              <div className="stat-change">{closed.length} bazaar{closed.length !== 1 ? 's' : ''} settled</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Inventory Value</div>
            <div className="stat-value">{loading ? '—' : inr(inventoryValue)}</div>
            <div className="stat-change">{products.length} product line{products.length !== 1 ? 's' : ''}</div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Recent Bazaar Sales</div>
              <div className="chart-more-btn" onClick={() => goTab('reports')} style={{ cursor: 'pointer' }}>⋮</div>
            </div>
            <div className="chart-placeholder">
              {chartBars.map((bar, i) => (
                <div key={i} className={`chart-bar ${i === chartBars.length - 1 ? 'today' : 'active'}`}
                     style={{ height: `${bar.h}%` }} title={inr(bar.value)} />
              ))}
            </div>
            <div className="chart-days">
              {chartBars.map((bar, i) => <div key={i} className="chart-day">{bar.label}</div>)}
            </div>
          </div>

          <div className="action-btns-row">
            <button id="btn-scan-bill" className="action-btn primary" onClick={() => navigate('scanner')}>
              <span className="btn-icon">⬛</span> Scan Bill
            </button>
            <button id="btn-add-product" className="action-btn outlined" onClick={() => navigate('inventory', { openAdd: true })}>
              <span className="btn-icon">＋</span> Add Product
            </button>
          </div>

          <div>
            <div className="section-header">
              <div className="section-title">Low Stock Alerts</div>
              <div className="section-view-all" onClick={() => goTab('inventory')}>View All</div>
            </div>

            <div className="stock-alert-list">
              {lowStock.length === 0 && (
                <div className="empty-hint">No low-stock items. You're well stocked. ✅</div>
              )}
              {lowStock.map((p) => (
                <div key={p.id} className="stock-alert-card" onClick={() => goTab('inventory')}>
                  <div className="stock-alert-icon">⚙️</div>
                  <div className="stock-alert-info">
                    <div className="stock-alert-name">{p.name}</div>
                    <div className="stock-alert-sku">{p.sku || 'No SKU'}</div>
                  </div>
                  <div className="stock-alert-badge">
                    <span className="badge danger">{qty(p.quantity, p.unit)} Left</span>
                    <span className="badge-sub">Min {qty(p.min_stock, p.unit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function buildChart(closed) {
  const recent = [...closed].reverse().slice(-6);
  const values = recent.map((b) => ({
    value: b.items.reduce((s, it) => s + lineValue(it.qty_sold, it.unit_price), 0),
    label: (b.name || 'Bazaar').slice(0, 3),
  }));
  while (values.length < 6) values.unshift({ value: 0, label: '·' });
  const max = Math.max(1, ...values.map((v) => v.value));
  return values.map((v) => ({ ...v, h: Math.max(8, Math.round((v.value / max) * 100)) }));
}
