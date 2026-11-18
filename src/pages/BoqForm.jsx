import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import api, { assetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductPicker from '../components/ProductPicker';
import {
  FORMULA_OPTIONS,
  FORMULA_TYPES,
  calcLineItem,
  formulaNeedsDims,
  isAreaFormula,
  quantityFromSavedItem,
  resolveFormulaType,
  resolveProductBoqInfo,
  withSizeInSpec,
} from '../utils/boqFormula';

function catLabel(cat) {
  if (!cat) return '';
  return cat.name || '';
}

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const blankItem = () => ({
  product: '',
  categoryId: '',
  categoryLabel: '',
  specification: '',
  brand: '',
  image: '',
  unit: 'Nos',
  formulaType: FORMULA_TYPES.NONE,
  width: '',
  height: '',
  depth: '',
  nos: 1,
  quantity: 1,
  qty: 1,
  rate: 0,
  amount: 0,
  remarks: '',
  isSectionHeader: false,
});

function applyCalc(item) {
  const calc = calcLineItem(item);
  return {
    ...item,
    formulaType: calc.formulaType,
    nos: 1,
    quantity: calc.quantity,
    formulaArea: calc.formulaArea,
    qty: calc.qty,
    rate: calc.rate,
    amount: calc.amount,
  };
}

export default function BoqForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: 'FESTON INTERIOR WORKS COSTING',
    clientName: '',
    location: '',
    kindAttn: '',
    billDate: new Date().toISOString().slice(0, 10),
    discount: 0,
    applyGst: false,
    gstPercent: 18,
    items: [blankItem()],
  });

  useEffect(() => {
    if (isEdit && !isAdmin) {
      toast.error('Staff cannot edit BOQ');
      navigate('/boq');
      return;
    }
    (async () => {
      try {
        const [cat, prod] = await Promise.all([
          api.get('/categories', { params: { type: 'category' } }),
          api.get('/products', { params: { limit: 500 } }),
        ]);
        setCategories(cat.data);
        setProducts(prod.data.items || []);
        if (isEdit) {
          const { data } = await api.get(`/boq/${id}`);
          setForm({
            title: data.title,
            clientName: data.clientName,
            location: data.location || '',
            kindAttn: data.kindAttn || '',
            billDate: data.billDate ? data.billDate.slice(0, 10) : '',
            discount: data.discount || 0,
            applyGst: data.applyGst === true || data.gstExtra === true,
            gstPercent: data.gstPercent || 18,
            items: data.items?.length
              ? data.items.map((i) => {
                  const base = {
                    ...blankItem(),
                    ...i,
                    product: i.product || '',
                    categoryId: i.categoryId || '',
                    image: i.image || '',
                    width: i.width || '',
                    height: i.height || '',
                    depth: i.depth || '',
                    formulaType: i.formulaType || FORMULA_TYPES.NONE,
                    quantity: quantityFromSavedItem(i),
                    nos: 1,
                  };
                  return applyCalc(base);
                })
              : [blankItem()],
          });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load');
      }
    })();
  }, [id]);

  const subtotal = useMemo(
    () =>
      form.items
        .filter((i) => !i.isSectionHeader)
        .reduce((s, i) => s + Number(i.amount || 0), 0),
    [form.items]
  );
  const total = Math.max(0, subtotal - Number(form.discount || 0));
  const gstAmount = form.applyGst ? (total * Number(form.gstPercent || 18)) / 100 : 0;
  const grandTotal = total + gstAmount;

  const updateItem = (idx, patch) => {
    setForm((prev) => {
      const items = [...prev.items];
      let next = { ...items[idx], ...patch };

      if (!next.isSectionHeader) {
        if (patch.categoryId !== undefined) {
          const cat = categories.find((c) => c._id === patch.categoryId);
          next.categoryLabel = catLabel(cat);
          next.formulaType = resolveFormulaType(next, cat);
          if (isAreaFormula(cat?.formulaType)) {
            next.unit = next.unit === 'Nos' || next.unit === 'Rft' || next.unit === 'Lumpsum' ? 'Sft' : next.unit;
          }
        }
        if (patch.unit !== undefined) {
          const u = String(patch.unit).toLowerCase();
          if ((u === 'sft' || u === 'sqm') && next.formulaType === FORMULA_TYPES.NONE) {
            next.formulaType = FORMULA_TYPES.W_H;
          }
          if (u === 'nos' || u === 'rft' || u === 'lumpsum') {
            if (patch.formulaType === undefined) next.formulaType = FORMULA_TYPES.NONE;
          }
        }

        // Switching to None → clear dims (do not ask W/H/D)
        if (patch.formulaType === FORMULA_TYPES.NONE) {
          next.width = '';
          next.height = '';
          next.depth = '';
        }

        const dimOrQtyChanged =
          patch.width !== undefined ||
          patch.height !== undefined ||
          patch.depth !== undefined ||
          patch.quantity !== undefined ||
          patch.formulaType !== undefined;
        if (dimOrQtyChanged || patch.specification !== undefined) {
          next.specification = withSizeInSpec(
            next.specification,
            {
              width: next.width,
              depth: next.depth,
              height: next.height,
            },
            next.quantity,
            next.formulaType
          );
        }

        next = applyCalc(next);
      }

      items[idx] = next;
      return { ...prev, items };
    });
  };

  const addProductLine = (productId) => {
    const p = products.find((x) => x._id === productId);
    if (!p) return;
    const cat =
      categories.find((c) => c._id === (p.category?._id || p.category)) || p.category || null;
    const label = catLabel(cat);
    const { unit, formulaType } = resolveProductBoqInfo(p, cat);
    const base = applyCalc({
      ...blankItem(),
      product: p._id,
      categoryId: cat?._id || '',
      categoryLabel: label,
      specification: p.specification || p.name,
      brand: p.brand || '',
      image: p.image || '',
      unit,
      formulaType,
      rate: p.rate || 0,
      quantity: 1,
      nos: 1,
    });

    setForm((prev) => {
      const cleaned = prev.items.filter((i) => i.specification || i.isSectionHeader || i.image);
      const lastSection = [...cleaned].reverse().find((i) => i.isSectionHeader);
      const needsSection =
        Boolean(cat?._id) &&
        (!lastSection || String(lastSection.categoryId) !== String(cat._id));

      const nextItems = [...cleaned];
      if (needsSection) {
        nextItems.push({
          ...blankItem(),
          isSectionHeader: true,
          categoryId: cat._id,
          categoryLabel: label,
          specification: label,
        });
      }
      nextItems.push(base);
      return { ...prev, items: nextItems };
    });
  };

  const addSection = () => {
    const cat = categories[0];
    const label = cat ? catLabel(cat) : 'Section';
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          ...blankItem(),
          isSectionHeader: true,
          categoryId: cat?._id || '',
          categoryLabel: label,
          specification: label,
        },
      ],
    }));
  };

  const removeItem = (idx) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? [blankItem()] : prev.items.filter((_, i) => i !== idx),
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.clientName) return toast.error('Client name required');

    for (const i of form.items) {
      if (i.isSectionHeader || !i.specification) continue;
      if (i.formulaType === FORMULA_TYPES.W_H) {
        if (!(Number(i.width) > 0) || !(Number(i.height) > 0)) {
          return toast.error(`Enter Width & Height for: ${i.specification.slice(0, 40)}`);
        }
      }
      if (i.formulaType === FORMULA_TYPES.W_D) {
        if (!(Number(i.width) > 0) || !(Number(i.depth) > 0)) {
          return toast.error(`Enter Width & Depth for: ${i.specification.slice(0, 40)}`);
        }
      }
      if (i.formulaType === FORMULA_TYPES.W_H_D) {
        if (!(Number(i.width) > 0) || !(Number(i.height) > 0) || !(Number(i.depth) > 0)) {
          return toast.error(`Enter Width, Height & Depth for: ${i.specification.slice(0, 40)}`);
        }
      }
    }

    const items = form.items
      .filter((i) => i.isSectionHeader || i.specification)
      .map((i) => {
        const product = i.product || null;
        const categoryId = i.categoryId || null;
        if (i.isSectionHeader) {
          return {
            ...i,
            product: undefined,
            categoryId,
            rate: 0,
            amount: 0,
            qty: 0,
            quantity: 1,
            nos: 1,
          };
        }
        const calc = calcLineItem(i);
        return {
          ...i,
          ...calc,
          product,
          categoryId,
          nos: 1,
          specification: withSizeInSpec(
            i.specification,
            {
              width: i.width,
              depth: i.depth,
              height: i.height,
            },
            calc.quantity,
            calc.formulaType
          ),
          image: i.image || '',
        };
      });
    if (!items.length) return toast.error('Add at least one item');

    setBusy(true);
    try {
      const payload = {
        ...form,
        items,
        discount: Number(form.discount) || 0,
        applyGst: Boolean(form.applyGst),
        gstPercent: Number(form.gstPercent) || 18,
      };
      if (isEdit) {
        await api.put(`/boq/${id}`, payload);
        toast.success('BOQ updated');
        navigate(`/boq/${id}`);
      } else {
        const { data } = await api.post('/boq', payload);
        toast.success('BOQ created');
        navigate(`/boq/${data._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="boq-builder">
      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit BOQ' : 'Create BOQ Bill'}</h1>
          <p>
            Nos is always 1. Enter Quantity + Rate. With formula: Amount = Qty × (W×H/D) × Rate.
          </p>
        </div>
      </div>

      <form onSubmit={save}>
        <div className="panel">
          <div className="form-grid">
            <label className="field full">
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="field">
              Client name
              <input
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Location
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
            <label className="field">
              Kind Attn
              <input value={form.kindAttn} onChange={(e) => setForm({ ...form, kindAttn: e.target.value })} />
            </label>
            <label className="field">
              Date
              <input
                type="date"
                value={form.billDate}
                onChange={(e) => setForm({ ...form, billDate: e.target.value })}
              />
            </label>
            <label className="field">
              Discount
              <input
                type="number"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </label>
            <label className="field">
              Apply GST
              <select
                value={form.applyGst ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, applyGst: e.target.value === 'yes' })}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label className="field">
              GST %
              <input
                type="number"
                value={form.gstPercent}
                disabled={!form.applyGst}
                onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
              />
            </label>
            <label className="field full">
              Quick add product
              <ProductPicker products={products} onSelect={addProductLine} />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <h2>Line items</h2>
            <div className="actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={addSection}>
                + Section header
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setForm((p) => ({ ...p, items: [...p.items, blankItem()] }))}
              >
                <Plus size={14} /> Row
              </button>
            </div>
          </div>

          <div className="boq-item-legend">
            <span><b>Nos = 1</b> · enter <b>Quantity</b> + <b>Rate</b></span>
            <span><b>None</b> = Qty × Rate only (no W/H/D)</span>
            <span><b>W×H / W×D / W×H×D</b> = feet.inches (5.5 = 5&apos;5&quot;)</span>
          </div>

          <div className="item-rows">
          {form.items.map((item, idx) => {
            const needsDims = formulaNeedsDims(item.formulaType);
            return (
              <div
                key={idx}
                className={`item-row ${item.isSectionHeader ? 'is-section' : `with-image ${needsDims ? 'has-dims' : 'no-dims'}`}`}
              >
                {item.isSectionHeader ? (
                  <>
                    <select
                      value={item.categoryId}
                      onChange={(e) => {
                        const cat = categories.find((c) => c._id === e.target.value);
                        const label = catLabel(cat);
                        updateItem(idx, {
                          categoryId: e.target.value,
                          categoryLabel: label,
                          specification: label || item.specification,
                        });
                      }}
                    >
                      <option value="">Section category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {catLabel(c)}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.specification}
                      onChange={(e) => updateItem(idx, { specification: e.target.value, categoryLabel: e.target.value })}
                      placeholder="Section title e.g. A. M.D Cabin 1 & 2"
                    />
                    <div /><div /><div /><div /><div />
                  </>
                ) : (
                  <>
                    <div className="item-thumb">
                      {item.image ? (
                        <img src={assetUrl(item.image)} alt="" />
                      ) : (
                        <span>No img</span>
                      )}
                    </div>
                    <textarea
                      value={item.specification}
                      onChange={(e) => updateItem(idx, { specification: e.target.value })}
                      placeholder="Specification of work (Size auto-appends)"
                      rows={2}
                    />
                    <input
                      value={item.brand}
                      onChange={(e) => updateItem(idx, { brand: e.target.value })}
                      placeholder="Brand"
                    />
                    <select value={item.unit} onChange={(e) => updateItem(idx, { unit: e.target.value })}>
                      <option>Nos</option>
                      <option>Sft</option>
                      <option>Rft</option>
                      <option>Sqm</option>
                      <option>Lumpsum</option>
                    </select>
                    <select
                      value={item.formulaType || FORMULA_TYPES.NONE}
                      onChange={(e) => updateItem(idx, { formulaType: e.target.value })}
                      title="Price formula"
                    >
                      {FORMULA_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      placeholder="Qty"
                      title="Quantity"
                    />
                    {needsDims && (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.width}
                          onChange={(e) => updateItem(idx, { width: e.target.value })}
                          placeholder="W 5.5"
                          title="Width feet.inches — 5.5 = 5'5&quot;"
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.height}
                          onChange={(e) => updateItem(idx, { height: e.target.value })}
                          placeholder="H 5.5"
                          title="Height feet.inches — 5.5 = 5'5&quot;"
                          disabled={item.formulaType === FORMULA_TYPES.W_D}
                          style={item.formulaType === FORMULA_TYPES.W_D ? { opacity: 0.35 } : undefined}
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.depth}
                          onChange={(e) => updateItem(idx, { depth: e.target.value })}
                          placeholder="D 2.1"
                          title="Depth feet.inches — 2.1 = 2'1&quot;"
                          disabled={item.formulaType === FORMULA_TYPES.W_H}
                          style={item.formulaType === FORMULA_TYPES.W_H ? { opacity: 0.35 } : undefined}
                        />
                        <input
                          type="number"
                          value={item.formulaArea ?? ''}
                          readOnly
                          title="Formula result (W×H / W×D / W×H×D)"
                          placeholder="Area"
                        />
                      </>
                    )}
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(idx, { rate: e.target.value })}
                      placeholder="Rate"
                      title="Price / Rate"
                    />
                    <input value={inr(item.amount)} readOnly title="Amount" />
                  </>
                )}
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(idx)}>
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
          </div>

          <div className="totals">
            <div>TOTAL: ₹ {inr(subtotal)}</div>
            <div>DISCOUNT: ₹ {inr(form.discount)}</div>
            <div>TOTAL (WITHOUT GST): ₹ {inr(total)}</div>
            {form.applyGst && (
              <>
                <div>GST {form.gstPercent}%: ₹ {inr(gstAmount)}</div>
                <div>GRAND TOTAL: ₹ {inr(grandTotal)}</div>
              </>
            )}
          </div>
          <div className="gst-bar">
            {form.applyGst
              ? `GST ${form.gstPercent}% Applied · Grand Total ₹ ${inr(grandTotal)}`
              : 'GST Not Applied'}
          </div>
        </div>

        <div className="actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/boq')}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Update BOQ' : 'Create BOQ'}
          </button>
        </div>
      </form>
    </div>
  );
}
