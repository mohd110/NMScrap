import { AppHeader } from './Shared';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useLang } from '../context/LangContext';
import { inr, qty, lineValue, bazaarTotals } from '../lib/format';

export default function DashboardScreen() {
  const { products, bazaars, sales, loading } = useData();
  const { navigate, goTab } = useNav();
  const { t } = useLang();

  const salesRevenue = sales.reduce((s, sale) => s + (Number(sale.total) || 0), 0);

  // ---- derived stats ----
  const inventoryValue = products.reduce((s, p) => s + lineValue(p.quantity, p.unit_price), 0);
  const totalUnits = products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);

  const closed = bazaars.filter((b) => b.status === 'closed');
  const soldValue = closed.reduce((s, b) => s + bazaarTotals(b).revenue, 0);

  const lowStock = products
    .filter((p) => Number(p.min_stock) > 0 && Number(p.quantity) <= Number(p.min_stock))
    .slice(0, 5);

  // A tiny 6-bar chart from the newest closed bazaars' sold value.
  const chartBars = buildChart(closed);

  return (
    <>
      <AppHeader title={t('dash_title')} subtitle={t('dash_sub')} />

      <div className="screen-content">
        <div className="dashboard-screen">

          <div className="welcome-banner">
            <div className="welcome-text">{t('dash_welcome')}</div>
            <div className="welcome-name">{t('dash_welcome_name')}</div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">{t('dash_total_stock')}</div>
              <div className="stat-value">{loading ? '—' : qty(totalUnits)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('dash_total_sold')}</div>
              <div className="stat-value green">{loading ? '—' : inr(soldValue)}</div>
              <div className="stat-change">{t('dash_bazaars_settled', { n: closed.length })}</div>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">{t('dash_inventory_value')}</div>
              <div className="stat-value">{loading ? '—' : inr(inventoryValue)}</div>
              <div className="stat-change">{t('dash_product_lines', { n: products.length })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('dash_direct_sales')}</div>
              <div className="stat-value green">{loading ? '—' : inr(salesRevenue)}</div>
              <div className="stat-change">{t('dash_bills', { n: sales.length })}</div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">{t('dash_recent_sales')}</div>
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
              <span className="btn-icon">⬛</span> {t('scan_bill')}
            </button>
            <button id="btn-add-product" className="action-btn outlined" onClick={() => navigate('inventory', { openAdd: true })}>
              <span className="btn-icon">＋</span> {t('add_product')}
            </button>
          </div>

          <button id="btn-new-sale" className="sale-cta" onClick={() => navigate('sell')}>
            {t('new_sale_cta')}
          </button>

          <div>
            <div className="section-header">
              <div className="section-title">{t('dash_low_stock')}</div>
              <div className="section-view-all" onClick={() => goTab('inventory')}>{t('view_all')}</div>
            </div>

            <div className="stock-alert-list">
              {lowStock.length === 0 && (
                <div className="empty-hint">{t('dash_no_low_stock')}</div>
              )}
              {lowStock.map((p) => (
                <div key={p.id} className="stock-alert-card" onClick={() => goTab('inventory')}>
                  <div className="stock-alert-icon">⚙️</div>
                  <div className="stock-alert-info">
                    <div className="stock-alert-name">{p.name}</div>
                    <div className="stock-alert-sku">{p.sku || t('no_sku')}</div>
                  </div>
                  <div className="stock-alert-badge">
                    <span className="badge danger">{qty(p.quantity, p.unit)} {t('dash_left')}</span>
                    <span className="badge-sub">{t('dash_min')} {qty(p.min_stock, p.unit)}</span>
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
    value: bazaarTotals(b).revenue,
    label: (b.name || 'Bazaar').slice(0, 3),
  }));
  while (values.length < 6) values.unshift({ value: 0, label: '·' });
  const max = Math.max(1, ...values.map((v) => v.value));
  return values.map((v) => ({ ...v, h: Math.max(8, Math.round((v.value / max) * 100)) }));
}
