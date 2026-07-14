import { useState } from 'react';
import { AppHeader } from './Shared';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useNav } from '../context/NavContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import { inr, qty, lineValue, makeSku } from '../lib/format';

const UNITS = ['kg', 'units', 'MT'];

export default function InventoryScreen() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useData();
  const { navigate, params } = useNav();
  const { notify } = useToast();
  const { t } = useLang();
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
        notify(t('inv_updated'));
      } else {
        await addProduct({
          name: form.name, sku: form.sku || makeSku(form.name), category: form.category || null,
          unit: form.unit, quantity: Number(form.quantity) || 0, min_stock: Number(form.min_stock) || 0,
          unit_price: Number(form.unit_price) || 0,
        });
        notify(t('inv_added'));
      }
      setEditing(null);
    } catch (e) {
      notify(e.message || t('inv_save_failed'), 'error');
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(t('inv_confirm_delete', { name: p.name }))) return;
    try {
      await deleteProduct(p.id);
      notify(t('inv_deleted'));
    } catch (e) {
      notify(e.message || t('inv_delete_failed'), 'error');
    }
  };

  return (
    <>
      <AppHeader title={t('inv_title')} subtitle={t('inv_sub')} />

      <div className="screen-content">
        <div className="inventory-screen">

          <div className="inv-search-wrap">
            <span className="inv-search-icon">🔍</span>
            <input
              className="inv-search-input"
              placeholder={t('inv_search_ph')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="action-btns-row">
            <button className="action-btn primary" onClick={() => navigate('scanner')}>
              <span className="btn-icon">⬛</span> {t('scan_bill')}
            </button>
            <button className="action-btn outlined" onClick={() => setEditing({})}>
              <span className="btn-icon">＋</span> {t('add_product')}
            </button>
          </div>

          <button className="sale-cta" onClick={() => navigate('sell')}>
            {t('new_sale_cta')}
          </button>

          <div className="section-header">
            <div className="section-title">{t('inv_all_products', { n: filtered.length })}</div>
          </div>

          {loading && <div className="empty-hint">{t('inv_loading')}</div>}
          {!loading && filtered.length === 0 && (
            <div className="empty-hint">{t('inv_empty')}</div>
          )}

          <div className="inv-list">
            {filtered.map((p) => {
              const low = Number(p.min_stock) > 0 && Number(p.quantity) <= Number(p.min_stock);
              return (
                <div key={p.id} className="inv-card" onClick={() => setEditing(p)}>
                  <div className="inv-card-main">
                    <div className="inv-card-name">{p.name}</div>
                    <div className="inv-card-sku">{p.sku || t('no_sku')}{p.category ? ` · ${p.category}` : ''}</div>
                    <div className="inv-card-value">{inr(lineValue(p.quantity, p.unit_price))} · {inr(p.unit_price)}/{p.unit}</div>
                  </div>
                  <div className="inv-card-right">
                    <span className={`badge ${low ? 'danger' : 'ok'}`}>{qty(p.quantity, p.unit)}</span>
                    <div className="inv-card-actions">
                      <button className="inv-sell-btn" onClick={(e) => { e.stopPropagation(); navigate('sell', { productId: p.id }); }} title={t('inv_sell_this')}>🧾</button>
                      <button className="inv-del-btn" onClick={(e) => { e.stopPropagation(); handleDelete(p); }} title={t('delete')}>🗑</button>
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
  const { t } = useLang();
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
      title={form.id ? t('pf_edit_title') : t('pf_add_title')}
      onClose={onClose}
      footer={
        <button className="btn-confirm" onClick={submit} disabled={busy || !form.name.trim()}>
          {busy ? t('saving') : form.id ? t('save_changes') : t('pf_add_to_inv')}
        </button>
      }
    >
      <div className="form-group">
        <div className="form-label">{t('pf_name')}</div>
        <input className="form-input" style={{ padding: '0 14px' }} value={form.name}
               onChange={(e) => set('name', e.target.value)} placeholder={t('pf_name_ph')} autoFocus />
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <div className="form-label">{t('pf_sku')}</div>
          <input className="form-input" style={{ padding: '0 14px' }} value={form.sku}
                 onChange={(e) => set('sku', e.target.value)} placeholder={t('pf_sku_ph')} />
        </div>
        <div className="form-group">
          <div className="form-label">{t('pf_category')}</div>
          <input className="form-input" style={{ padding: '0 14px' }} value={form.category}
                 onChange={(e) => set('category', e.target.value)} placeholder={t('pf_category_ph')} />
        </div>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <div className="form-label">{t('pf_quantity')}</div>
          <input className="form-input" style={{ padding: '0 14px' }} type="number" value={form.quantity}
                 onChange={(e) => set('quantity', e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <div className="form-label">{t('pf_unit')}</div>
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
          <div className="form-label">{t('pf_unit_price')}</div>
          <input className="form-input" style={{ padding: '0 14px' }} type="number" value={form.unit_price}
                 onChange={(e) => set('unit_price', e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <div className="form-label">{t('pf_min_stock')}</div>
          <input className="form-input" style={{ padding: '0 14px' }} type="number" value={form.min_stock}
                 onChange={(e) => set('min_stock', e.target.value)} placeholder="0" />
        </div>
      </div>
    </Modal>
  );
}
