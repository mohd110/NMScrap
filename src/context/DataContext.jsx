import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bazaars, setBazaars] = useState([]);       // includes .items[]
  const [sales, setSales] = useState([]);           // direct sales, includes .items[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Load everything for the signed-in user ----
  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, vRes, bRes, biRes, sRes, siRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
        supabase.from('bazaars').select('*').order('opened_at', { ascending: false }),
        supabase.from('bazaar_items').select('*'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*'),
      ]);
      const firstErr = pRes.error || vRes.error || bRes.error || biRes.error || sRes.error || siRes.error;
      if (firstErr) throw firstErr;

      const itemsByBazaar = {};
      for (const it of biRes.data || []) {
        (itemsByBazaar[it.bazaar_id] ||= []).push(it);
      }
      const itemsBySale = {};
      for (const it of siRes.data || []) {
        (itemsBySale[it.sale_id] ||= []).push(it);
      }
      setProducts(pRes.data || []);
      setVendors(vRes.data || []);
      setBazaars((bRes.data || []).map((b) => ({ ...b, items: itemsByBazaar[b.id] || [] })));
      setSales((sRes.data || []).map((s) => ({ ...s, items: itemsBySale[s.id] || [] })));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else {
      setProducts([]); setVendors([]); setBazaars([]); setSales([]); setLoading(false);
    }
  }, [user, refresh]);

  // ================= PRODUCTS =================
  const addProduct = async (p) => {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...p, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setProducts((prev) => [data, ...prev]);
    return data;
  };

  const updateProduct = async (id, patch) => {
    const { data, error } = await supabase
      .from('products')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setProducts((prev) => prev.map((x) => (x.id === id ? data : x)));
    return data;
  };

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    setProducts((prev) => prev.filter((x) => x.id !== id));
  };

  // Add many scanned items: merge into existing product (by name) or create new.
  const importBillItems = async (billItems, rawText = '') => {
    // 1. record the bill
    const { data: bill, error: billErr } = await supabase
      .from('bills')
      .insert({ user_id: user.id, raw_text: rawText, source: 'scan', status: 'imported' })
      .select()
      .single();
    if (billErr) throw billErr;

    if (billItems.length) {
      await supabase.from('bill_items').insert(
        billItems.map((it) => ({
          bill_id: bill.id,
          name: it.name,
          sku: it.sku || null,
          unit: it.unit,
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
        }))
      );
    }

    // 2. apply to inventory
    for (const it of billItems) {
      const existing = products.find(
        (p) => p.name.trim().toLowerCase() === it.name.trim().toLowerCase()
      );
      if (existing) {
        await updateProduct(existing.id, {
          quantity: Number(existing.quantity) + (Number(it.quantity) || 0),
          unit_price: Number(it.unit_price) || existing.unit_price,
        });
      } else {
        await addProduct({
          name: it.name,
          sku: it.sku || null,
          unit: it.unit || 'units',
          quantity: Number(it.quantity) || 0,
          unit_price: Number(it.unit_price) || 0,
          min_stock: 0,
        });
      }
    }
    return bill;
  };

  // ================= VENDORS =================
  const addVendor = async (v) => {
    const { data, error } = await supabase
      .from('vendors')
      .insert({ ...v, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setVendors((prev) => [data, ...prev]);
    return data;
  };

  const deleteVendor = async (id) => {
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) throw error;
    setVendors((prev) => prev.filter((x) => x.id !== id));
  };

  // ================= BAZAARS =================
  // items: [{ product_id, product_name, sku, unit, qty, unit_price }]
  const assignInventory = async (vendorId, name, returnDate, items) => {
    const { data, error } = await supabase.rpc('assign_inventory', {
      p_vendor_id: vendorId,
      p_name: name,
      p_return_date: returnDate || null,
      p_items: items,
    });
    if (error) throw error;
    await refresh();
    return data; // new bazaar id
  };

  // returns: [{ item_id, qty_returned }] · amountReceived = total ₹ for the bazaar
  const closeBazaar = async (bazaarId, returns, amountReceived = 0) => {
    const { error } = await supabase.rpc('close_bazaar', {
      p_bazaar_id: bazaarId,
      p_returns: returns,
      p_amount_received: Number(amountReceived) || 0,
    });
    if (error) throw error;
    await refresh();
  };

  // ================= DIRECT SALES =================
  // items: [{ product_id, product_name, sku, unit, quantity, wholesale_price, sale_price }]
  // Returns the full bill (with .items) so the receipt can be shown immediately.
  const recordSale = async ({ buyerName, buyerPhone, paymentMode, note, items }) => {
    const { data: saleId, error } = await supabase.rpc('record_sale', {
      p_buyer_name: buyerName || null,
      p_buyer_phone: buyerPhone || null,
      p_payment_mode: paymentMode || 'cash',
      p_note: note || null,
      p_items: items,
    });
    if (error) throw error;

    const [saleRes, itemsRes] = await Promise.all([
      supabase.from('sales').select('*').eq('id', saleId).single(),
      supabase.from('sale_items').select('*').eq('sale_id', saleId),
    ]);
    if (saleRes.error) throw saleRes.error;
    await refresh();
    return { ...saleRes.data, items: itemsRes.data || [] };
  };

  return (
    <DataContext.Provider
      value={{
        products, vendors, bazaars, sales, loading, error, refresh,
        addProduct, updateProduct, deleteProduct, importBillItems,
        addVendor, deleteVendor,
        assignInventory, closeBazaar, recordSale,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
