import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { withCategorySections } from '../utils/boqFormula';

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

function formatDate(d) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export default function BoqView() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [boq, setBoq] = useState(null);

  useEffect(() => {
    api
      .get(`/boq/${id}`)
      .then((res) => setBoq(res.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'));
  }, [id]);

  const download = async (type) => {
    try {
      const res = await api.get(`/boq/${id}/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${boq?.billNo || 'boq'}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  if (!boq) return <div className="panel">Loading BOQ…</div>;

  const applyGst = boq.applyGst === true || boq.gstExtra === true;
  const gstPercent = boq.gstPercent || 18;
  const gstAmount = applyGst
    ? Number(boq.gstAmount) || (Number(boq.totalWithoutGst) * gstPercent) / 100
    : 0;
  const grandTotal = applyGst
    ? Number(boq.grandTotal) || Number(boq.totalWithoutGst) + gstAmount
    : Number(boq.totalWithoutGst);

  let sectionSl = 0;
  const displayItems = withCategorySections(boq.items || []);

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{boq.billNo}</h1>
          <p>{boq.clientName} · {boq.location}</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => download('pdf')}>Download PDF</button>
          <button className="btn btn-secondary" onClick={() => download('excel')}>Download Excel</button>
          {isAdmin && (
            <Link className="btn btn-primary" to={`/boq/${id}/edit`}>Edit</Link>
          )}
        </div>
      </div>

      <div className="boq-sheet">
        <div className="boq-sheet-top">
          <div className="boq-sheet-logo">
            <span>ORANGE</span> INTERIOR
          </div>
          <div className="boq-sheet-company">
            <strong>Orange Interior</strong>
            <div>Guindy, Chennai.</div>
            <div>sales@orangeinterior.in</div>
            <div>91-9003208146 / 91-984048513</div>
            <div>GST No: 33DHUPS1600A1ZN</div>
            <div>Date: {formatDate(boq.billDate || boq.createdAt)}</div>
          </div>
        </div>

        <div className="boq-sheet-client">
          <div><b>Client Name:</b> {boq.clientName}</div>
          <div><b>Location:</b> {boq.location || ''}</div>
          <div><b>Kind Attn:</b> {boq.kindAttn ? `(${boq.kindAttn})` : '()'}</div>
        </div>

        <div className="boq-sheet-table-wrap">
          <table className="boq-sheet-table">
            <thead>
              <tr className="boq-title-row">
                <th colSpan={9}>{boq.title || 'INTERIOR WORKS COSTING'}</th>
              </tr>
              <tr className="boq-col-head">
                <th>Sl.no</th>
                <th>Specification of work</th>
                <th>Brand</th>
                <th>Unit</th>
                <th>Nos</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total amount</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => {
                if (item.isSectionHeader) {
                  sectionSl = 0;
                  return (
                    <tr key={item._id || `s-${idx}`} className="boq-section-row">
                      <td colSpan={9}>{item.specification || item.categoryLabel}</td>
                    </tr>
                  );
                }
                sectionSl += 1;
                return (
                  <tr key={item._id || `i-${idx}`}>
                    <td className="c">{sectionSl}</td>
                    <td className="spec-cell">
                      {item.image ? (
                        <img className="boq-inline-img" src={assetUrl(item.image)} alt="" />
                      ) : null}
                      <span className="spec-text">{item.specification}</span>
                    </td>
                    <td>{item.brand || ''}</td>
                    <td className="c">{item.unit}</td>
                    <td className="c">{item.nos}</td>
                    <td className="r">{item.qty}</td>
                    <td className="r">{inr(item.rate)}</td>
                    <td className="r">{inr(item.amount)}</td>
                    <td>{item.remarks || ''}</td>
                  </tr>
                );
              })}

              <tr className="boq-total-row">
                <td colSpan={7} className="r"><b>TOTAL</b></td>
                <td className="r"><b>{inr(boq.subtotal)}</b></td>
                <td />
              </tr>
              <tr className="boq-total-row">
                <td colSpan={7} className="r"><b>DISCOUNT</b></td>
                <td className="r">{boq.discount ? inr(boq.discount) : ''}</td>
                <td />
              </tr>
              <tr className="boq-total-row boq-total-final">
                <td colSpan={7} className="r"><b>TOTAL ( WITHOUT GST )</b></td>
                <td className="r"><b>{inr(boq.totalWithoutGst)}</b></td>
                <td />
              </tr>
              {applyGst && (
                <>
                  <tr className="boq-total-row">
                    <td colSpan={7} className="r"><b>GST {gstPercent}%</b></td>
                    <td className="r"><b>{inr(gstAmount)}</b></td>
                    <td />
                  </tr>
                  <tr className="boq-total-row boq-total-final">
                    <td colSpan={7} className="r"><b>GRAND TOTAL</b></td>
                    <td className="r"><b>{inr(grandTotal)}</b></td>
                    <td />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="boq-gst-strip">
          <span className="gst-extra">
            {applyGst ? `GST ${gstPercent}% Extra` : 'GST Not Applied'}
          </span>
        </div>

        <div className="boq-footer-grid">
          <div>
            <strong>Notes:</strong>
            <ol>
              {(boq.notes || []).map((n, i) => (
                <li key={i} className={i === 3 ? 'note-warn' : ''}>{n}</li>
              ))}
            </ol>
          </div>
          <div>
            <strong>Payment:</strong>
            <ol>
              {(boq.paymentTerms || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ol>
          </div>
          <div className="boq-sign-col">
            <div className="boq-stamp" aria-hidden>
              <svg viewBox="0 0 120 120" width="88" height="88">
                <circle cx="60" cy="60" r="56" fill="none" stroke="#2b6cb0" strokeWidth="3" />
                <circle cx="60" cy="60" r="44" fill="none" stroke="#2b6cb0" strokeWidth="1.5" />
                <text x="60" y="54" textAnchor="middle" fill="#2b6cb0" fontSize="9" fontWeight="700" fontFamily="Arial">
                  ORANGE
                </text>
                <text x="60" y="68" textAnchor="middle" fill="#2b6cb0" fontSize="9" fontWeight="700" fontFamily="Arial">
                  INTERIOR
                </text>
                <path
                  id="stampArc"
                  d="M 20,60 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"
                  fill="none"
                />
                <text fill="#2b6cb0" fontSize="7" fontFamily="Arial">
                  <textPath href="#stampArc" startOffset="8%">★ ORANGE INTERIOR ★ ORANGE INTERIOR ★</textPath>
                </text>
              </svg>
            </div>
            <div className="boq-sign">
              <div>For Orange Interior</div>
              <div className="sign-space" />
              <div>Proprietor</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
