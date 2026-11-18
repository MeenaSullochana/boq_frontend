import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import api, { assetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import DataTable from '../components/DataTable';

const empty = {
  name: '',
  description: '',
  type: 'category',
  parent: '',
  formulaType: 'none',
  sortOrder: 0,
};

const formulaLabel = (t) =>
  t === 'W_H'
    ? 'Qty × (W × H)'
    : t === 'W_D'
      ? 'Qty × (W × D)'
      : t === 'W_H_D'
        ? 'Qty × (W × H × D)'
        : 'Qty × Rate';

export default function Categories() {
  const { isAdmin } = useAuth();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [allCats, setAllCats] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filterType, setFilterType] = useState('category');
  const [filterFormula, setFilterFormula] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [filtered, all] = await Promise.all([
        api.get('/categories', {
          params: {
            page,
            limit: pageSize,
            q: q || undefined,
            type: filterType || undefined,
            formulaType: filterFormula || undefined,
          },
        }),
        api.get('/categories'),
      ]);
      setList(filtered.data.items || []);
      setTotal(filtered.data.total || 0);
      setAllCats(all.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, filterType, filterFormula]);

  useEffect(() => {
    load();
  }, [load]);

  const parentsFor = (type) => {
    if (type === 'subcategory') return allCats.filter((c) => c.type === 'category');
    if (type === 'child') return allCats.filter((c) => c.type === 'subcategory');
    return [];
  };

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setImage(null);
    setOpen(true);
  };

  const openEdit = (cat) => {
    setEditId(cat._id);
    setForm({
      name: cat.name,
      description: cat.description || '',
      type: cat.type,
      parent: cat.parent?._id || cat.parent || '',
      formulaType: cat.formulaType || 'none',
      sortOrder: cat.sortOrder || 0,
    });
    setImage(null);
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (image) fd.append('image', image);

      if (editId) {
        if (!isAdmin) return toast.error('Only superadmin can edit');
        await api.put(`/categories/${editId}`, fd);
        toast.success('Category updated');
      } else {
        await api.post('/categories', fd);
        toast.success('Category created');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!isAdmin) return toast.error('Only superadmin can delete');
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
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
      const { data } = await api.post('/categories/import', fd);
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
      render: (c) => (c.image ? <img className="thumb" src={assetUrl(c.image)} alt="" /> : '—'),
    },
    { key: 'name', label: 'Name' },
    {
      key: 'type',
      label: 'Type',
      render: (c) => <span className="badge sky">{c.type}</span>,
    },
    {
      key: 'formulaType',
      label: 'Default formula',
      render: (c) => formulaLabel(c.formulaType),
    },
    {
      key: 'parent',
      label: 'Parent',
      render: (c) => c.parent?.name || '—',
    },
    {
      key: 'sortOrder',
      label: 'Sort',
      align: 'center',
      render: (c) => c.sortOrder ?? 0,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c) => (
        <div className="actions">
          {isAdmin ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                <Pencil size={14} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(c._id)}>
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>View / create only</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p>Set the default BOQ formula per category (e.g. Partition = W×H). Products can override unit/formula.</p>
        </div>
        <div className="actions">
          <a className="btn btn-secondary btn-sm" href="/samples/sample-categories.xlsx" download>
            <Download size={16} /> Sample Excel
          </a>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Excel import
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={onImport} />
          </label>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="panel">
        <DataTable
          columns={columns}
          rows={list}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          search={search}
          onSearchChange={setSearch}
          onSearch={applySearch}
          searchPlaceholder="Search name or description…"
          loading={loading}
          empty="No categories yet"
          filters={(
            <>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              >
                <option value="">All types</option>
                <option value="category">Category</option>
                <option value="subcategory">Sub category</option>
                <option value="child">Child category</option>
              </select>
              <select
                value={filterFormula}
                onChange={(e) => { setFilterFormula(e.target.value); setPage(1); }}
              >
                <option value="">All formulas</option>
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
        <h3 className="modal-head">{editId ? 'Edit category' : 'Add category'}</h3>
        <div className="modal-body">
          <div className="form-grid">
            <label className="field">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="field">
              Type
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, parent: '' })}
              >
                <option value="category">Category</option>
                <option value="subcategory">Sub category</option>
                <option value="child">Child category</option>
              </select>
            </label>
            {form.type !== 'category' && (
              <label className="field">
                Parent
                <select value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
                  <option value="">Select parent</option>
                  {parentsFor(form.type).map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              Default BOQ formula
              <select
                value={form.formulaType}
                onChange={(e) => setForm({ ...form, formulaType: e.target.value })}
              >
                <option value="none">None — Qty × Rate (no W/H/D)</option>
                <option value="W_H">Qty × (W × H) — Partition, paint, panelling…</option>
                <option value="W_D">Qty × (W × D) — Ceiling, flooring, RCC…</option>
                <option value="W_H_D">Qty × (W × H × D) — Volume / tank / sump…</option>
              </select>
            </label>
            <label className="field">
              Sort order
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </label>
            <label className="field">
              Image
              <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
            </label>
            <label className="field full">
              Description
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
