import { useState } from 'react';
import { BackHeader } from './Shared';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import { inr, qty, lineValue } from '../lib/format';

export default function AssignInventoryScreen() {
  const { products, vendors, assignInventory } = useData();
  const { params, back, navigate } = useNav();
  const { notify } = useToast();
  const { t } = useLang();

  const [vendorId, setVendorId] = useState(params.vendorId || '');
  const [name, setName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [rows, setRows] = useState([{ _k: Date.now(), product_id: '', qty: '' }]);
  const [busy, setBusy] = useState(false);

  const inStock = products.filter((p) => Number(p.quantity) > 0);

  const setRow = (k, field, value) =>
    setRows((list) => list.map((r) => (r._k === k ? { ...r, [field]: value } : r)));
  const addRow = () => setRows((list) => [...list, { _k: Date.now() + Math.random(), product_id: '', qty: '' }]);
  const removeRow = (k) => setRows((list) => (list.length > 1 ? list.filter((r) => r._k !== k) : list));

  const lineFor = (r) => {
    const p = products.find((x) => x.id === r.product_id);
    return p ? lineValue(r.qty, p.unit_price) : 0;
  };
  const chosen = rows.filter((r) => r.product_id && Number(r.qty) > 0);
  const estValue = chosen.reduce((s, r) => s + lineFor(r), 0);

  const confirm = async () => {
    if (!vendorId) return notify(t('asg_select_vendor_first'), 'error');
    if (chosen.length === 0) return notify(t('asg_add_one_product'), 'error');

    // validate against stock
    for (const r of chosen) {
      const p = products.find((x) => x.id === r.product_id);
      if (Number(r.qty) > Number(p.quantity)) {
        return notify(t('asg_only_in_stock', { qty: qty(p.quantity, p.unit), name: p.name }), 'error');
      }
    }

    const vendor = vendors.find((v) => v.id === vendorId);
    const bazaarName = name.trim() || `${vendor?.name || 'Bazaar'} · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

    const items = chosen.map((r) => {
      const p = products.find((x) => x.id === r.product_id);
      return {
        product_id: p.id, product_name: p.name, sku: p.sku,
        unit: p.unit, qty: Number(r.qty), unit_price: Number(p.unit_price),
      };
    });

    setBusy(true);
    try {
      const bazaarId = await assignInventory(vendorId, bazaarName, returnDate || null, items);
      notify(t('asg_assigned_ok'));
      navigate('bazaar', { vendorId, bazaarId });
    } catch (e) {
      notify(e.message || t('asg_assign_failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BackHeader title={t('asg_title')} onBack={back} />

      <div className="screen-content">
        <div className="assign-screen">
          <div className="assign-vendor-img-placeholder" />

          <div className="assign-form">
            <div className="form-group">
              <div className="form-label">{t('asg_select_vendor')}</div>
              <div className="form-select-wrap">
                <select className="form-select" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">{t('asg_choose_vendor')}</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <span className="form-select-arrow">▾</span>
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">{t('asg_bazaar_name')}</div>
              <input className="form-input" style={{ padding: '0 14px' }} value={name}
                     onChange={(e) => setName(e.target.value)} placeholder={t('asg_bazaar_name_ph')} />
            </div>

            <div className="form-group">
              <div className="form-label">{t('asg_return_date')}</div>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type="date" value={returnDate}
                       onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>

            <div className="product-list-header">
              <div className="product-list-title">{t('asg_products_to_assign')}</div>
              <button className="btn-add-item" onClick={addRow}>{t('asg_add_item')}</button>
            </div>

            {inStock.length === 0 && (
              <div className="empty-hint">{t('asg_no_stock')}</div>
            )}

            {rows.map((r) => {
              const p = products.find((x) => x.id === r.product_id);
              return (
                <div key={r._k} className="product-item-card">
                  <div className="form-group">
                    <div className="form-label">{t('asg_product')}</div>
                    <div className="form-select-wrap">
                      <select className="form-select" value={r.product_id}
                              onChange={(e) => setRow(r._k, 'product_id', e.target.value)}>
                        <option value="">{t('asg_choose_product')}</option>
                        {inStock.map((x) => (
                          <option key={x.id} value={x.id}>{x.name} ({qty(x.quantity, x.unit)})</option>
                        ))}
                      </select>
                      <span className="form-select-arrow">▾</span>
                    </div>
                  </div>

                  <div className="product-qty-row">
                    <div>
                      <div className="product-qty-label">{t('asg_quantity')} {p ? `(${p.unit})` : ''}</div>
                      <input className="product-qty-input" type="number" value={r.qty}
                             placeholder={t('asg_enter_qty')} onChange={(e) => setRow(r._k, 'qty', e.target.value)} />
                    </div>
                    <div>
                      <div className="product-qty-label">{t('asg_current_stock')}</div>
                      <div className="product-current-stock">{p ? qty(p.quantity, p.unit) : '—'}</div>
                    </div>
                  </div>

                  {p && Number(r.qty) > 0 && (
                    <div className="review-line-value">{t('asg_value', { v: inr(lineFor(r)) })}</div>
                  )}

                  <button className="btn-remove-item" onClick={() => removeRow(r._k)}>{t('asg_remove_item')}</button>
                </div>
              );
            })}

            <div className="assignment-summary">
              <div className="summary-row">
                <span className="summary-label">{t('asg_total_items')}</span>
                <span className="summary-value">{t('asg_products_n', { n: chosen.length })}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">{t('asg_est_value')}</span>
                <span className="summary-value">{inr(estValue)}</span>
              </div>
              <div className="assignment-status-row">
                <span className="assignment-status-label">{t('asg_status')}</span>
                <span className="assignment-status-value">{t('asg_pending')}</span>
              </div>
            </div>

            <button className="btn-confirm" onClick={confirm} disabled={busy}>
              {busy ? t('asg_assigning') : t('asg_confirm')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
