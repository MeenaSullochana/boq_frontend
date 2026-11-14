import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Upload, Download } from 'lucide-react';
import api, { assetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const empty = {
  name: '',
  code: '',
  description: '',
  type: 'category',
  parent: '',
  formulaType: 'none',
  sortOrder: 0,
};

const formulaLabel = (t) =>
  t === 'W_H' ? 'Qty × (W × H)' : t === 'W_D' ? 'Qty × (W × D)' : 'Qty × Rate';

export default function Categories() {
  const { isAdmin } = useAuth();
  const [list, setList] = useState([]);
  const [allCats, setAllCats] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [filterType, setFilterType] = useState('category');

  const load = async () => {
    const [filtered, all] = await Promise.all([
      api.get('/categories', { params: filterType ? { type: filterType } : {} }),
      api.get('/categories'),
    ]);
    setList(filtered.data);
    setAllCats(all.data);
  };

  useEffect(() => {
    load().catch((e) => toast.error(e.response?.data?.message || 'Load failed'));
  }, [filterType]);

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
      code: cat.code || '',
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
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="filters">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="category">Category</option>
          <option value="subcategory">Sub category</option>
          <option value="child">Child category</option>
        </select>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Default formula</th>
                <th>Parent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>{c.image ? <img className="thumb" src={assetUrl(c.image)} alt="" /> : '—'}</td>
                  <td>{c.name}</td>
                  <td>{c.code || '—'}</td>
                  <td><span className="badge sky">{c.type}</span></td>
                  <td>{formulaLabel(c.formulaType)}</td>
                  <td>{c.parent?.name || '—'}</td>
                  <td>
                    <div className="actions">
                      {isAdmin && (
                        <>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(c._id)}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {!isAdmin && <span style={{ color: 'var(--muted)', fontSize: 12 }}>View / create only</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr><td colSpan={7} className="empty">No categories yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
              Code
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A, B, C…" />
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
                <option value="none">None — Qty × Rate</option>
                <option value="W_H">Qty × (W × H) — Partition, paint, panelling…</option>
                <option value="W_D">Qty × (W × D) — Ceiling, flooring, RCC…</option>
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
