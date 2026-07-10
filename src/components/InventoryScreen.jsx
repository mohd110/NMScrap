import { useState } from 'react';
import { AppHeader } from './Shared';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { inr, qty, lineValue, makeSku } from '../lib/format';

const UNITS = ['kg', 'units', 'MT'];

export default function InventoryScreen() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useData();
  const { navigate, params } = useNav();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(params.openAdd ? {} : null); // {} = new, {...product} = edit

  const filtered = products.filter((p) =>
    `${p.name} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (form) => {
    try {
      if (form.id) {
        await updateProduct(form.id, {
          name: form.name, sku: form.sku, category: form.category,
          unit: form.unit, quantity: Number(form.quantity), min_stock: Number(form.min_stock),
          unit_price: Number(form.unit_price),
        });
        notify('Product updated');
      } else {
        await addProduct({
          name: form.name, sku: form.sku || makeSku(form.name), category: form.category || null,
          unit: form.unit, quantity: Number(form.quantity) || 0, min_stock: Number(form.min_stock) || 0,
          unit_price: Number(form.unit_price) || 0,
        });
        notify('Product added to inventory');
      }
      setEditing(null);
    } catch (e) {
      notify(e.message || 'Save failed', 'error');
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(p.id);
      notify('Product deleted');
    } catch (e) {
      notify(e.message || 'Delete failed', 'error');
    }
  };

  return (
    <>
      <AppHeader title="Inventory" subtitle="Stock on hand" hindiLabel={null} />

      <div className="screen-content">
        <div className="inventory-screen">

          <div className="inv-search-wrap">
            <span className="inv-search-icon">🔍</span>
            <input
              className="inv-search-input"
              placeholder="Search products, SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="action-btns-row">
            <button className="action-btn primary" onClick={() => navigate('scanner')}>
              <span className="btn-icon">⬛</span> Scan Bill
            </button>
            <button className="action-btn outlined" onClick={() => setEditing({})}>
              <span className="btn-icon">＋</span> Add Product
            </button>
          </div>

          <button className="sale-cta" onClick={() => navigate('sell')}>
            🧾 New Sale / Generate Bill
          </button>

          <div className="section-header">
            <div className="section-title">All Products ({filtered.length})</div>
          </div>

          {loading && <div className="empty-hint">Loading inventory…</div>}
          {!loading && filtered.length === 0 && (
            <div className="empty-hint">
              No products yet. Tap <b>Add Product</b> or <b>Scan Bill</b> to get started.
            </div>
          )}

          <div className="inv-list">
            {filtered.map((p) => {
              const low = Number(p.min_stock) > 0 && Number(p.quantity) <= Number(p.min_stock);
              return (
                <div key={p.id} className="inv-card" onClick={() => setEditing(p)}>
                  <div className="inv-card-main">
                    <div className="inv-card-name">{p.name}</div>
                    <div className="inv-card-sku">{p.sku || 'No SKU'}{p.category ? ` · ${p.category}` : ''}</div>
                    <div className="inv-card-value">{inr(lineValue(p.quantity, p.unit_price))} · {inr(p.unit_price)}/{p.unit}</div>
                  </div>
                  <div className="inv-card-right">
                    <span className={`badge ${low ? 'danger' : 'ok'}`}>{qty(p.quantity, p.unit)}</span>
                    <div className="inv-card-actions">
                      <button className="inv-sell-btn" onClick={(e) => { e.stopPropagation(); navigate('sell', { productId: p.id }); }} title="Sell this">🧾</button>
                      <button className="inv-del-btn" onClick={(e) => { e.stopPropagation(); handleDelete(p); }} title="Delete">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editing !== null && (
        <ProductFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function ProductFormModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initial.id || null,
    name: initial.name || '',
    sku: initial.sku || '',
    category: initial.category || '',
    unit: initial.unit || 'kg',
    quantity: initial.quantity ?? '',
    min_stock: initial.min_stock ?? '',
    unit_price: initial.unit_price ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    await onSave(form);
    setBusy(false);
  };

  return (
    <Modal
      title={form.id ? 'Edit Product' : 'Add Product'}
      onClose={onClose}
      footer={
        <button className="btn-confirm" onClick={submit} disabled={busy || !form.name.trim()}>
          {busy ? 'Saving…' : form.id ? '✓ Save Changes' : '✓ Add to Inventory'}
        </button>
      }
    >
      <div className="form-group">
        <div className="form-label">Product Name *</div>
        <input className="form-input" style={{ padding: '0 14px' }} value={form.name}
               onChange={(e) => set('name', e.target.value)} placeholder="e.g. Copper Wire Mix" autoFocus />
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <div className="form-label">SKU</div>
          <input className="form-input" style={{ padding: '0 14px' }} value={form.sku}
                 onChange={(e) => set('sku', e.target.value)} placeholder="auto" />
        </div>
        <div className="form-group">
          <div className="form-label">Category</div>
          <input className="form-input" style={{ padding: '0 14px' }} value={form.category}
                 onChange={(e) => set('category', e.target.value)} placeholder="Metal" />
        </div>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <div className="form-label">Quantity</div>
          <input className="form-input" style={{ padding: '0 14px' }} type="number" value={form.quantity}
                 onChange={(e) => set('quantity', e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <div className="form-label">Unit</div>
          <div className="form-select-wrap">
            <select className="form-select" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <span className="form-select-arrow">▾</span>
          </div>
        </div>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <div className="form-label">Unit Price (₹)</div>
          <input className="form-input" style={{ padding: '0 14px' }} type="number" value={form.unit_price}
                 onChange={(e) => set('unit_price', e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <div className="form-label">Min Stock (alert)</div>
          <input className="form-input" style={{ padding: '0 14px' }} type="number" value={form.min_stock}
                 onChange={(e) => set('min_stock', e.target.value)} placeholder="0" />
        </div>
      </div>
    </Modal>
  );
}
