import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Upload, Search, Download } from 'lucide-react';
import api, { assetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import {
  PRODUCT_FORMULA_OPTIONS,
  formulaLabel,
  inferFormulaType,
  resolveProductBoqInfo,
} from '../utils/boqFormula';

const empty = {
  name: '',
  specification: '',
  brand: '',
  unit: 'Nos',
  formulaType: 'inherit',
  rate: '',
  category: '',
  subcategory: '',
  childCategory: '',
  remarks: '',
};

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function Products() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [q, setQ] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);

  const load = async () => {
    const [prod, cat, brandRes] = await Promise.all([
      api.get('/products', { params: { q: q || undefined, limit: 100 } }),
      api.get('/categories'),
      api.get('/brands'),
    ]);
    setItems(prod.data.items || []);
    setCats(cat.data || []);
    setBrands(brandRes.data || []);
  };

  useEffect(() => {
    load().catch((e) => toast.error(e.response?.data?.message || 'Load failed'));
  }, []);

  const categories = cats.filter((c) => c.type === 'category');
  const subcategories = cats.filter(
    (c) => c.type === 'subcategory' && (!form.category || String(c.parent?._id || c.parent) === String(form.category))
  );
  const children = cats.filter(
    (c) => c.type === 'child' && (!form.subcategory || String(c.parent?._id || c.parent) === String(form.subcategory))
  );

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setImage(null);
    setNewBrand('');
    setAddingBrand(false);
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditId(p._id);
    setForm({
      name: p.name,
      specification: p.specification || '',
      brand: p.brand || '',
      unit: p.unit || 'Nos',
      formulaType: p.formulaType || 'inherit',
      rate: p.rate,
      category: p.category?._id || p.category || '',
      subcategory: p.subcategory?._id || p.subcategory || '',
      childCategory: p.childCategory?._id || p.childCategory || '',
      remarks: p.remarks || '',
    });
    setImage(null);
    setNewBrand('');
    setAddingBrand(false);
    setOpen(true);
  };

  const selectedCategory = categories.find((c) => c._id === form.category);
  const effectiveFormula = resolveProductBoqInfo(
    { unit: form.unit, formulaType: form.formulaType },
    selectedCategory
  ).formulaType;
  const categoryFormulaHint = selectedCategory
    ? selectedCategory.formulaType === 'W_H' || selectedCategory.formulaType === 'W_D'
      ? selectedCategory.formulaType
      : inferFormulaType(selectedCategory.name)
    : 'none';

  const createBrandQuick = async () => {
    const name = newBrand.trim();
    if (!name) return toast.error('Enter brand name');
    try {
      const { data } = await api.post('/brands', { name });
      setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, brand: data.name }));
      setNewBrand('');
      setAddingBrand(false);
      toast.success('Brand added');
    } catch (err) {
      if (err.response?.data?.brand) {
        const existing = err.response.data.brand;
        setForm((f) => ({ ...f, brand: existing.name }));
        setAddingBrand(false);
        toast.success('Using existing brand');
        load();
      } else {
        toast.error(err.response?.data?.message || 'Could not add brand');
      }
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (image) fd.append('image', image);
      if (editId) {
        if (!isAdmin) return toast.error('Only superadmin can edit');
        await api.put(`/products/${editId}`, fd);
        toast.success('Product updated');
      } else {
        await api.post('/products', fd);
        toast.success('Product created');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!isAdmin) return toast.error('Only superadmin can delete');
    if (!confirm('Delete product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/products/import', fd);
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>
            Link to a category for default formula. Override unit/formula per product when needed (e.g. Nos under Partition).
          </p>
        </div>
        <div className="actions">
          <a className="btn btn-secondary btn-sm" href="/samples/sample-products.xlsx" download>
            <Download size={16} /> Sample Excel
          </a>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Excel import
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={onImport} />
          </label>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add product
          </button>
        </div>
      </div>

      <div className="filters">
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
          <input
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={load}>
            <Search size={16} />
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name / Spec</th>
                <th>Brand</th>
                <th>Unit</th>
                <th>Formula</th>
                <th>Rate</th>
                <th>Category</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const resolved = resolveProductBoqInfo(p, p.category);
                return (
                  <tr key={p._id}>
                    <td>{p.image ? <img className="thumb" src={assetUrl(p.image)} alt="" /> : '—'}</td>
                    <td>
                      <strong>{p.name}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                        {(p.specification || '').slice(0, 120)}
                        {(p.specification || '').length > 120 ? '…' : ''}
                      </div>
                    </td>
                    <td>{p.brand || '—'}</td>
                    <td>{p.unit}</td>
                    <td>
                      {formulaLabel(resolved.formulaType)}
                      {(!p.formulaType || p.formulaType === 'inherit') && (
                        <div style={{ color: 'var(--muted)', fontSize: 11 }}>from category</div>
                      )}
                    </td>
                    <td>{inr(p.rate)}</td>
                    <td>{p.category?.name || '—'}</td>
                    <td>
                      <div className="actions">
                        {isAdmin ? (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                              <Pencil size={14} />
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => remove(p._id)}>
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Create only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr><td colSpan={8} className="empty">No products</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} as="form" onSubmit={save}>
        <h3 className="modal-head">{editId ? 'Edit product' : 'Add product'}</h3>
        <div className="modal-body">
          <div className="form-grid">
            <label className="field">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              Brand <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
              {!addingBrand ? (
                <div className="brand-inline">
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  >
                    <option value="">None</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAddingBrand(true)}
                  >
                    + New
                  </button>
                </div>
              ) : (
                <div className="brand-inline">
                  <input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="New brand name"
                    autoFocus
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={createBrandQuick}>
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setAddingBrand(false); setNewBrand(''); }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </label>
            <label className="field full">
              Specification of work
              <textarea
                value={form.specification}
                onChange={(e) => setForm({ ...form, specification: e.target.value })}
              />
            </label>
            <label className="field">
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                    subcategory: '',
                    childCategory: '',
                  })
                }
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.code ? `${c.code}. ` : ''}{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Unit
              <select
                value={form.unit}
                onChange={(e) => {
                  const unit = e.target.value;
                  // Nos / Rft / LS → suggest explicit none override when category has area formula
                  const patch = { unit };
                  if (
                    form.formulaType === 'inherit' &&
                    ['Nos', 'Rft', 'Lumpsum'].includes(unit) &&
                    (categoryFormulaHint === 'W_H' || categoryFormulaHint === 'W_D')
                  ) {
                    patch.formulaType = 'none';
                  }
                  if (form.formulaType === 'none' && (unit === 'Sft' || unit === 'Sqm')) {
                    patch.formulaType = 'inherit';
                  }
                  setForm({ ...form, ...patch });
                }}
              >
                <option>Nos</option>
                <option>Sft</option>
                <option>Rft</option>
                <option>Sqm</option>
                <option>Lumpsum</option>
              </select>
            </label>
            <label className="field">
              Formula
              <select
                value={form.formulaType}
                onChange={(e) => setForm({ ...form, formulaType: e.target.value })}
              >
                {PRODUCT_FORMULA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value === 'inherit'
                      ? `Inherit from category (${formulaLabel(categoryFormulaHint)})`
                      : o.label}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                BOQ will use: {formulaLabel(effectiveFormula)}
              </span>
            </label>
            <label className="field">
              Rate
              <input
                type="number"
                step="0.01"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Sub category
              <select
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value, childCategory: '' })}
              >
                <option value="">Select</option>
                {subcategories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Child category
              <select
                value={form.childCategory}
                onChange={(e) => setForm({ ...form, childCategory: e.target.value })}
              >
                <option value="">Select</option>
                {children.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Image
              <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </label>
            <label className="field full">
              Remarks
              <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn btn-primary" type="submit">Save</button>
        </div>
      </Modal>
    </div>
  );
}
