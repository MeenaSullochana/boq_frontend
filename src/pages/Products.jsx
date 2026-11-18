import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import api, { assetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';
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
  const [total, setTotal] = useState(0);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterFormula, setFilterFormula] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [addingBrand, setAddingBrand] = useState(false);

  const loadMeta = useCallback(async () => {
    const [cat, brandRes] = await Promise.all([
      api.get('/categories'),
      api.get('/brands'),
    ]);
    setCats(cat.data || []);
    setBrands(brandRes.data || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          page,
          limit: pageSize,
          q: q || undefined,
          category: filterCategory || undefined,
          unit: filterUnit || undefined,
          formulaType: filterFormula || undefined,
        },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, filterCategory, filterUnit, filterFormula]);

  useEffect(() => {
    loadMeta().catch((e) => toast.error(e.response?.data?.message || 'Load failed'));
  }, [loadMeta]);

  useEffect(() => {
    load();
  }, [load]);

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
    ? ['W_H', 'W_D', 'W_H_D'].includes(selectedCategory.formulaType)
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
        loadMeta();
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

  const applySearch = () => {
    setPage(1);
    setQ(search.trim());
  };

  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (p) => (p.image ? <img className="thumb" src={assetUrl(p.image)} alt="" /> : '—'),
    },
    {
      key: 'name',
      label: 'Name / Spec',
      render: (p) => (
        <>
          <strong>{p.name}</strong>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
            {(p.specification || '').slice(0, 120)}
            {(p.specification || '').length > 120 ? '…' : ''}
          </div>
        </>
      ),
    },
    {
      key: 'brand',
      label: 'Brand',
      render: (p) => p.brand || '—',
    },
    { key: 'unit', label: 'Unit' },
    {
      key: 'formula',
      label: 'Formula',
      render: (p) => {
        const resolved = resolveProductBoqInfo(p, p.category);
        return (
          <>
            {formulaLabel(resolved.formulaType)}
            {(!p.formulaType || p.formulaType === 'inherit') && (
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>from category</div>
            )}
          </>
        );
      },
    },
    {
      key: 'rate',
      label: 'Rate',
      align: 'right',
      render: (p) => inr(p.rate),
    },
    {
      key: 'category',
      label: 'Category',
      render: (p) => p.category?.name || '—',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => (
        <div className="actions">
          {isAdmin ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                <Pencil size={14} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(p._id)}>
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Create only</span>
          )}
        </div>
      ),
    },
  ];

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
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add product
          </button>
        </div>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Search name, brand, spec…"
          loading={loading}
          empty="No products"
          filters={(
            <>
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
              <select
                value={filterUnit}
                onChange={(e) => { setFilterUnit(e.target.value); setPage(1); }}
              >
                <option value="">All units</option>
                <option>Nos</option>
                <option>Sft</option>
                <option>Rft</option>
                <option>Sqm</option>
                <option>Lumpsum</option>
              </select>
              <select
                value={filterFormula}
                onChange={(e) => { setFilterFormula(e.target.value); setPage(1); }}
              >
                <option value="">All formulas</option>
                <option value="inherit">Inherit</option>
                <option value="none">Qty × Rate</option>
                <option value="W_H">W × H</option>
                <option value="W_D">W × D</option>
                <option value="W_H_D">W × H × D</option>
              </select>
            </>
          )}
        />
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
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Unit
              <select
                value={form.unit}
                onChange={(e) => {
                  const unit = e.target.value;
                  const patch = { unit };
                  if (
                    form.formulaType === 'inherit' &&
                    ['Nos', 'Rft', 'Lumpsum'].includes(unit) &&
                    ['W_H', 'W_D', 'W_H_D'].includes(categoryFormulaHint)
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
