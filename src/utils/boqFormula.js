/** Formula sheet rules for BOQ quantity calculation. */

export const FORMULA_TYPES = {
  INHERIT: 'inherit',
  NONE: 'none',
  W_H: 'W_H',
  W_D: 'W_D',
  W_H_D: 'W_H_D',
};

export const FORMULA_OPTIONS = [
  { value: 'none', label: 'None (Qty × Rate)', hint: 'Enter quantity × price — no W/H/D' },
  { value: 'W_H', label: 'Qty × (W × H)', hint: 'Quantity × Width × Height × Rate' },
  { value: 'W_D', label: 'Qty × (W × D)', hint: 'Quantity × Width × Depth × Rate' },
  { value: 'W_H_D', label: 'Qty × (W × H × D)', hint: 'Quantity × Width × Height × Depth × Rate' },
];

export const PRODUCT_FORMULA_OPTIONS = [
  { value: 'inherit', label: 'Inherit from category' },
  ...FORMULA_OPTIONS,
];

const AREA_FORMULAS = new Set([FORMULA_TYPES.W_H, FORMULA_TYPES.W_D, FORMULA_TYPES.W_H_D]);

export function isAreaFormula(formulaType) {
  return AREA_FORMULAS.has(formulaType);
}

export function inferFormulaType(name = '') {
  const n = String(name).toLowerCase();
  if (!n) return FORMULA_TYPES.NONE;

  if (/volume|cubicle|tank\b|sump|rcc\s*column|concrete/.test(n)) {
    return FORMULA_TYPES.W_H_D;
  }

  if (/ceiling|flooring|floor\b|rcc|slab|lintel/.test(n)) {
    return FORMULA_TYPES.W_D;
  }

  if (
    /partition|paint|panell|aac|brick|wall\s*tile|cladding|water\s*proof|storage|roller\s*blind|blind/.test(
      n
    )
  ) {
    return FORMULA_TYPES.W_H;
  }

  return FORMULA_TYPES.NONE;
}

function categoryFormula(category = null) {
  if (!category) return null;
  if (isAreaFormula(category.formulaType)) return category.formulaType;
  if (category.name) {
    const inferred = inferFormulaType(category.name);
    if (inferred !== FORMULA_TYPES.NONE) return inferred;
  }
  return FORMULA_TYPES.NONE;
}

/**
 * Resolve BOQ formula:
 * 1) product override (none/W_H/W_D/W_H_D)
 * 2) category formula / inferred from category name
 * 3) unit fallback
 */
export function resolveFormulaType(item = {}, category = null, { preferItem = false, product = null } = {}) {
  if (preferItem && item.formulaType && item.formulaType !== FORMULA_TYPES.INHERIT) {
    return item.formulaType;
  }

  const productFormula = product?.formulaType ?? item.productFormulaType;
  if (productFormula === FORMULA_TYPES.NONE || isAreaFormula(productFormula)) {
    return productFormula;
  }

  const fromCat = categoryFormula(category);
  if (isAreaFormula(fromCat)) return fromCat;

  if (item.categoryLabel) {
    const inferred = inferFormulaType(item.categoryLabel);
    if (inferred !== FORMULA_TYPES.NONE) return inferred;
  }

  if (isAreaFormula(item.formulaType)) return item.formulaType;

  const unit = String(item.unit || product?.unit || '').toLowerCase();
  if (unit === 'sft' || unit === 'sqm') return FORMULA_TYPES.W_H;
  return FORMULA_TYPES.NONE;
}

export function resolveProductBoqInfo(product = {}, category = null) {
  const cat = category || product.category || null;
  const unit = product.unit || 'Nos';
  const formulaType = resolveFormulaType({ unit }, cat, { product });
  return { unit, formulaType };
}

/**
 * Nos is always 1.
 * - none: Amount = Quantity × Rate (no W/H/D)
 * - W_H / W_D / W_H_D: Amount = Quantity × formula × Rate
 */
export function calcLineItem(item = {}) {
  const rate = Number(item.rate) || 0;
  const formulaType = item.formulaType || FORMULA_TYPES.NONE;

  const w = parseFeetInchesInput(item.width);
  const h = parseFeetInchesInput(item.height);
  const d = parseFeetInchesInput(item.depth);

  let formulaArea = 1;
  if (formulaType === FORMULA_TYPES.W_H) {
    formulaArea = w * h;
  } else if (formulaType === FORMULA_TYPES.W_D) {
    formulaArea = w * d;
  } else if (formulaType === FORMULA_TYPES.W_H_D) {
    formulaArea = w * h * d;
  }

  const rawQty = Number(item.quantity);
  const quantity = Number.isFinite(rawQty) && rawQty >= 0 ? rawQty : 1;

  formulaArea = Math.round(formulaArea * 100) / 100;
  const qty = Math.round(quantity * formulaArea * 100) / 100;
  const amount = Math.round(qty * rate * 100) / 100;

  return {
    nos: 1,
    quantity,
    formulaArea,
    qty,
    rate,
    amount,
    formulaType,
    width: item.width === '' || item.width == null ? 0 : item.width,
    height: item.height === '' || item.height == null ? 0 : item.height,
    depth: item.depth === '' || item.depth == null ? 0 : item.depth,
  };
}

export function quantityFromSavedItem(item = {}) {
  if (item.quantity != null && item.quantity !== '') {
    const q = Number(item.quantity);
    if (Number.isFinite(q)) return q;
  }
  if (formulaNeedsDims(item.formulaType)) {
    const nos = Number(item.nos);
    if (Number.isFinite(nos) && nos > 0) return nos;
  }
  const q = Number(item.qty);
  return Number.isFinite(q) ? q : 1;
}

export function formulaNeedsDims(formulaType) {
  return isAreaFormula(formulaType);
}

/** Which dim fields this formula needs. */
export function formulaDimKeys(formulaType) {
  if (formulaType === FORMULA_TYPES.W_H) return ['width', 'height'];
  if (formulaType === FORMULA_TYPES.W_D) return ['width', 'depth'];
  if (formulaType === FORMULA_TYPES.W_H_D) return ['width', 'height', 'depth'];
  return [];
}

export function formulaLabel(t) {
  if (t === 'W_H') return 'Qty × (W × H)';
  if (t === 'W_D') return 'Qty × (W × D)';
  if (t === 'W_H_D') return 'Qty × (W × H × D)';
  if (t === 'inherit') return 'Inherit category';
  return 'Qty × Rate';
}

export function splitFeetInches(value) {
  if (value === '' || value == null) return null;
  const str = String(value).trim();
  if (!str) return null;

  const ftIn = str.match(/^(\d+)\s*'\s*(\d+)\s*"?$/);
  if (ftIn) {
    return { feet: Number(ftIn[1]), inches: Number(ftIn[2]) };
  }

  const m = str.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;

  let feet = Number(m[1]);
  const inchPart = m[2] || '0';
  let inches = inchPart.length === 1 ? Number(inchPart) : Number(inchPart.slice(0, 2));
  if (!Number.isFinite(inches) || inches < 0) inches = 0;
  if (inches >= 12) {
    feet += Math.floor(inches / 12);
    inches %= 12;
  }
  if (!(feet > 0 || inches > 0)) return null;
  return { feet, inches };
}

export function parseFeetInchesInput(value) {
  const parts = splitFeetInches(value);
  if (!parts) return 0;
  return parts.feet + parts.inches / 12;
}

export function formatDimFeet(value) {
  const parts = splitFeetInches(value);
  if (!parts) return '';
  return `${parts.feet}'${parts.inches}"`;
}

/** Build size text only for dims that belong to the formula (or all provided). */
export function buildSizeText({ width, depth, height } = {}, formulaType) {
  const keys = formulaType ? formulaDimKeys(formulaType) : ['width', 'depth', 'height'];
  const parts = [];
  if (keys.includes('width')) {
    const w = formatDimFeet(width);
    if (w) parts.push(`W ${w}`);
  }
  if (keys.includes('depth')) {
    const d = formatDimFeet(depth);
    if (d) parts.push(`D ${d}`);
  }
  if (keys.includes('height')) {
    const h = formatDimFeet(height);
    if (h) parts.push(`H ${h}`);
  }
  if (!parts.length) return '';
  return `(Size : ${parts.join(' x ')})`;
}

const SIZE_RE = /\s*\(Size\s*:[^)]*\)\s*/gi;
const QTY_RE = /\s*\(Qty\s*:[^)]*\)\s*/gi;

export function withSizeInSpec(specification, dims = {}, quantity, formulaType) {
  let base = String(specification || '')
    .replace(SIZE_RE, ' ')
    .replace(QTY_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const size = formulaNeedsDims(formulaType) ? buildSizeText(dims, formulaType) : '';
  const q = Number(quantity);
  const qtyPart = Number.isFinite(q) && q > 0 ? `(Qty : ${q})` : '';
  return [base, size, qtyPart].filter(Boolean).join(' ').trim();
}

export function withCategorySections(items = []) {
  if (!items.length) return items;
  if (items.some((i) => i.isSectionHeader)) return items;

  const out = [];
  let lastKey = null;
  items.forEach((item) => {
    const key = String(item.categoryId || item.categoryLabel || '_misc');
    const label = item.categoryLabel || 'Works';
    if (key !== lastKey) {
      out.push({
        isSectionHeader: true,
        specification: label,
        categoryLabel: label,
        categoryId: item.categoryId || '',
      });
      lastKey = key;
    }
    out.push(item);
  });
  return out;
}
