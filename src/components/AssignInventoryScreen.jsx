import { useState } from 'react';
import { BackHeader } from './Shared';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { inr, qty, lineValue } from '../lib/format';

export default function AssignInventoryScreen() {
  const { products, vendors, assignInventory } = useData();
  const { params, back, navigate } = useNav();
  const { notify } = useToast();

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
    if (!vendorId) return notify('Select a vendor first', 'error');
    if (chosen.length === 0) return notify('Add at least one product', 'error');

    // validate against stock
    for (const r of chosen) {
      const p = products.find((x) => x.id === r.product_id);
      if (Number(r.qty) > Number(p.quantity)) {
        return notify(`Only ${qty(p.quantity, p.unit)} of ${p.name} in stock`, 'error');
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
      notify('Inventory assigned to bazaar');
      navigate('bazaar', { vendorId, bazaarId });
    } catch (e) {
      notify(e.message || 'Assignment failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BackHeader title="Assign to Bazaar" rightLabel="हिंदी" onBack={back} />

      <div className="screen-content">
        <div className="assign-screen">
          <div className="assign-vendor-img-placeholder" />

          <div className="assign-form">
            <div className="form-group">
              <div className="form-label">Select Vendor</div>
              <div className="form-select-wrap">
                <select className="form-select" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                  <option value="">Select a Bazaar Vendor</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <span className="form-select-arrow">▾</span>
              </div>
            </div>

            <div className="form-group">
              <div className="form-label">Bazaar Name (optional)</div>
              <input className="form-input" style={{ padding: '0 14px' }} value={name}
                     onChange={(e) => setName(e.target.value)} placeholder="Auto from vendor + date" />
            </div>

            <div className="form-group">
              <div className="form-label">Expected Return Date</div>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type="date" value={returnDate}
                       onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>

            <div className="product-list-header">
              <div className="product-list-title">Products to Assign</div>
              <button className="btn-add-item" onClick={addRow}>＋ Add Item</button>
            </div>

            {inStock.length === 0 && (
              <div className="empty-hint">No products in stock. Add or scan inventory first.</div>
            )}

            {rows.map((r) => {
              const p = products.find((x) => x.id === r.product_id);
              return (
                <div key={r._k} className="product-item-card">
                  <div className="form-group">
                    <div className="form-label">Product</div>
                    <div className="form-select-wrap">
                      <select className="form-select" value={r.product_id}
                              onChange={(e) => setRow(r._k, 'product_id', e.target.value)}>
                        <option value="">Choose product…</option>
                        {inStock.map((x) => (
                          <option key={x.id} value={x.id}>{x.name} ({qty(x.quantity, x.unit)})</option>
                        ))}
                      </select>
                      <span className="form-select-arrow">▾</span>
                    </div>
                  </div>

                  <div className="product-qty-row">
                    <div>
                      <div className="product-qty-label">Quantity {p ? `(${p.unit})` : ''}</div>
                      <input className="product-qty-input" type="number" value={r.qty}
                             placeholder="Enter qty" onChange={(e) => setRow(r._k, 'qty', e.target.value)} />
                    </div>
                    <div>
                      <div className="product-qty-label">Current Stock</div>
                      <div className="product-current-stock">{p ? qty(p.quantity, p.unit) : '—'}</div>
                    </div>
                  </div>

                  {p && Number(r.qty) > 0 && (
                    <div className="review-line-value">Value: {inr(lineFor(r))}</div>
                  )}

                  <button className="btn-remove-item" onClick={() => removeRow(r._k)}>🗑 Remove Item</button>
                </div>
              );
            })}

            <div className="assignment-summary">
              <div className="summary-row">
                <span className="summary-label">Total Items</span>
                <span className="summary-value">{chosen.length} product{chosen.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Est. Assigned Value</span>
                <span className="summary-value">{inr(estValue)}</span>
              </div>
              <div className="assignment-status-row">
                <span className="assignment-status-label">Assignment Status</span>
                <span className="assignment-status-value">Pending</span>
              </div>
            </div>

            <button className="btn-confirm" onClick={confirm} disabled={busy}>
              {busy ? 'Assigning…' : '✓ Confirm Assignment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
