import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadContext, computeCardProgress, CARDS, STATUS, FULFILLMENT, isCitationApplicable } from '../../lib/gmpProgress';
import { getCardDocuments, isDocumentReady, MODE_META, DOC_MODE } from '../../lib/documentLibrary';

/**
 * 12개 카드 공통 상세 페이지 — 카드 ID로 분기
 * 5개 섹션: 필수 / 조건부 / 선택 / 검증 / 자동 생성 문서 라이브러리(특허 P13)
 */

const TOGGLE_KEY = 'userToggles';
function readToggles() {
  try { return JSON.parse(localStorage.getItem(TOGGLE_KEY) || '{}'); } catch { return {}; }
}
function writeToggle(path, value) {
  const t = readToggles();
  if (value === null) delete t[path]; else t[path] = value;
  try { localStorage.setItem(TOGGLE_KEY, JSON.stringify(t)); } catch { /* */ }
}

function StatusBadge({ status }) {
  const map = {
    [STATUS.REQUIRED]: { label: '필수', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    [STATUS.OPTIONAL]: { label: '선택', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
    [STATUS.VERIFICATION]: { label: '검증', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
    [STATUS.NA]: { label: 'N/A', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  };
  const m = map[status] ?? map[STATUS.NA];
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${m.cls} font-semibold`}>{m.label}</span>;
}

function FulfillmentIcon({ fulfillment, isNa }) {
  if (isNa) return <span className="text-slate-300 text-lg">—</span>;
  if (fulfillment === FULFILLMENT.MET) return <span className="text-emerald-500 text-lg">✓</span>;
  if (fulfillment === FULFILLMENT.PARTIAL) return <span className="text-amber-500 text-lg">◐</span>;
  return <span className="text-rose-400 text-lg">✗</span>;
}

function ItemRow({ item, isCondition, cardId, toggles, onToggle, certs }) {
  const cites = (item.citations || []).filter(c => isCitationApplicable(c, certs));
  const isNa = item.resolvedStatus === STATUS.NA;
  const togglePath = `${cardId}.${item.id}`;
  const excluded = toggles?.[togglePath] === false;
  return (
    <li className={`flex items-start gap-3 py-2.5 px-3 rounded-lg ${isNa ? 'bg-slate-50' : 'hover:bg-slate-50'} transition`}>
      <div className="w-6 shrink-0 pt-0.5"><FulfillmentIcon fulfillment={item.fulfillment} isNa={isNa} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-mono text-slate-400">{item.id}</span>
          <StatusBadge status={item.resolvedStatus} />
          {isCondition && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 rounded">자동 판정</span>}
          {item.togglable && <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1 rounded">토글 가능</span>}
        </div>
        <div className={`text-sm ${isNa ? 'text-slate-400' : 'text-slate-800'}`}>{item.label}</div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {cites.map((c, i) => (
            <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
              <span className="font-semibold">{c.standard}</span> {c.clause}
            </span>
          ))}
        </div>
      </div>
      {item.togglable && (
        <div className="shrink-0 flex rounded-lg overflow-hidden border border-slate-200 text-[11px]">
          <button onClick={() => onToggle(togglePath, true)}
            className={`px-2 py-1 ${!excluded ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'}`}>해당</button>
          <button onClick={() => onToggle(togglePath, false)}
            className={`px-2 py-1 ${excluded ? 'bg-slate-500 text-white' : 'bg-white text-slate-500'}`}>제외(N/A)</button>
        </div>
      )}
    </li>
  );
}

function Section({ title, items, isCondition = false, color = 'slate', cardId, toggles, onToggle, certs }) {
  if (items.length === 0) return null;
  const colorMap = {
    rose: 'border-rose-200 bg-rose-50/40',
    amber: 'border-amber-200 bg-amber-50/40',
    sky: 'border-sky-200 bg-sky-50/40',
    violet: 'border-violet-200 bg-violet-50/40',
  };
  return (
    <section className={`border ${colorMap[color] ?? 'border-slate-200'} rounded-xl p-4 mb-4`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
        {title} <span className="text-xs font-normal text-slate-500">({items.length}개)</span>
      </h3>
      <ul className="divide-y divide-slate-100">
        {items.map(item => <ItemRow key={item.id} item={item} isCondition={isCondition} cardId={cardId} toggles={toggles} onToggle={onToggle} certs={certs} />)}
      </ul>
    </section>
  );
}

const MODE_BADGE = {
  [DOC_MODE.TEMPLATE]: 'bg-slate-100 text-slate-700 border-slate-300',
  [DOC_MODE.AUTOFILL]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  [DOC_MODE.AI_DRAFT]: 'bg-violet-100 text-violet-800 border-violet-300',
  [DOC_MODE.GUIDED]: 'bg-sky-100 text-sky-800 border-sky-300',
};

function DocumentRow({ doc, ctx, onPreview }) {
  const ready = isDocumentReady(doc, ctx);
  const meta = MODE_META[doc.mode];
  return (
    <li className="py-3 px-3 hover:bg-white/60 rounded-lg transition">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">{doc.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${MODE_BADGE[doc.mode]} font-semibold`}>{meta.label}</span>
            {ready ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">생성 가능</span>
            ) : (
              <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">데이터 부족</span>
            )}
          </div>
          <div className="text-xs text-slate-600 mb-1.5">{doc.description}</div>
          <div className="text-[10px] text-slate-500 mb-1.5">💡 {meta.desc}</div>
          <div className="flex items-center gap-1 flex-wrap">
            {doc.regulations.map((r, i) => (
              <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                <span className="font-semibold">{r.s}</span> {r.c}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onPreview(doc)}
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          미리보기
        </button>
      </div>
    </li>
  );
}

function DocumentLibrarySection({ cardId, ctx, onPreview }) {
  const [filter, setFilter] = useState('all');
  const docs = getCardDocuments(cardId);
  if (docs.length === 0) return null;

  const filtered = filter === 'all' ? docs : docs.filter(d => d.mode === filter);
  const readyCount = docs.filter(d => isDocumentReady(d, ctx)).length;

  const filterOpts = [
    { v: 'all', l: '전체' },
    { v: DOC_MODE.AUTOFILL, l: '자동 채움' },
    { v: DOC_MODE.AI_DRAFT, l: 'AI 초안' },
    { v: DOC_MODE.GUIDED, l: '가이드' },
    { v: DOC_MODE.TEMPLATE, l: '양식' },
  ];

  return (
    <section className="border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2 flex-wrap">
            📄 자동 생성 문서 라이브러리
            <span className="text-xs font-normal text-indigo-700">({readyCount}/{docs.length} 생성 가능)</span>
          </h3>
          <div className="text-[11px] text-indigo-700 mt-0.5">
            특허 P13 — 다중 인증 동시 자동 문서. 실제 작성·결재는 좌측 <b>품질 문서</b> 화면에서 진행됩니다.
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] flex-wrap">
          {filterOpts.map(opt => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              className={`px-2 py-0.5 rounded ${filter === opt.v ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-indigo-100/60">
        {filtered.map(doc => <DocumentRow key={doc.id} doc={doc} ctx={ctx} onPreview={onPreview} />)}
      </ul>
    </section>
  );
}

function PreviewModal({ doc, onClose, onGoDocuments }) {
  if (!doc) return null;
  const meta = MODE_META[doc.mode];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[16px] font-bold text-slate-900">{doc.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${MODE_BADGE[doc.mode]} font-semibold`}>{meta.label}</span>
          <span className="text-[11px] text-slate-500">{meta.desc}</span>
        </div>
        <div className="text-[13px] text-slate-700 mb-3 leading-relaxed">{doc.description}</div>

        <div className="mb-3">
          <div className="text-[11px] font-semibold text-slate-500 mb-1">적용 규제</div>
          <div className="flex flex-wrap gap-1">
            {doc.regulations.map((r, i) => (
              <span key={i} className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                <b>{r.s}</b> {r.c}
              </span>
            ))}
          </div>
        </div>

        {Array.isArray(doc.sources) && doc.sources.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">자동 채움 출처 (SSoT)</div>
            <ul className="text-[12px] text-slate-600 list-disc pl-4">
              {doc.sources.map((s, i) => <li key={i}>{typeof s === 'string' ? s : (s.label || s.key || JSON.stringify(s))}</li>)}
            </ul>
          </div>
        )}

        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[12px] text-sky-800 mb-4">
          <span>ⓘ <b>매뉴얼·절차서</b>는 <b>품질 문서</b> 화면에서 작성·결재·정식양식 다운로드합니다. <b>등록표·대장 등 전용 양식</b>(예: UDI-DI 등록표)은 아직 품질문서에 없고 추후 <b>'품질양식' 모듈</b>에서 제공될 예정이라, 지금은 안내용입니다.</span>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm">닫기</button>
          <button onClick={onGoDocuments} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">품질 문서로 이동 →</button>
        </div>
      </div>
    </div>
  );
}

export default function GMPSection() {
  const { cardId } = useParams();
  const navigate = useNavigate();

  const [tick, setTick] = useState(0);
  const [previewDoc, setPreviewDoc] = useState(null);

  const ctx = useMemo(() => loadContext(), [tick]);
  const cardDef = useMemo(() => CARDS.find(c => c.id === cardId), [cardId]);
  const card = useMemo(() => cardDef ? computeCardProgress(cardDef, ctx) : null, [cardDef, ctx]);
  const toggles = ctx.toggles || {};

  const onToggle = (path, value) => {
    const cur = readToggles()[path];
    // 같은 값 다시 누르면 해제(기본값으로)
    writeToggle(path, cur === value ? null : value);
    setTick(t => t + 1);
  };

  if (!cardDef || !card) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-800">카드를 찾을 수 없습니다</h2>
          <p className="text-sm text-slate-500 mt-2">카드 ID: {cardId}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-sm text-indigo-600 hover:underline">← 대시보드로 돌아가기</button>
        </div>
      </div>
    );
  }

  const certs = ctx.certifications || {};
  const required = card.items.filter(i => !i.condition && i.status === STATUS.REQUIRED && i.resolvedStatus !== STATUS.NA);
  const conditional = card.items.filter(i => i.condition);
  const optional = card.items.filter(i => !i.condition && i.status === STATUS.OPTIONAL && i.resolvedStatus !== STATUS.NA);
  const verification = card.items.filter(i => !i.condition && i.status === STATUS.VERIFICATION && i.resolvedStatus !== STATUS.NA);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-500 hover:text-slate-800 mb-3">
          ← 대시보드로
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">
                {card.cardRow === 1 ? '행1 GMP 코어' : '행2 인허가·시판후'} · Level {card.level} 권한
              </div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-baseline gap-2">
                <span className={card.cardRow === 1 ? 'text-violet-600' : 'text-amber-600'}>
                  {card.cardIndex.toString().padStart(2, '0')}
                </span>
                {card.cardTitle}
              </h1>
            </div>
            <div className="text-right">
              {card.na ? (
                <>
                  <div className="text-3xl font-bold text-slate-400">N/A</div>
                  <div className="text-xs text-slate-500">{card.naReason}</div>
                </>
              ) : (
                <>
                  <div className={`text-4xl font-bold tabular-nums ${card.percent >= 90 ? 'text-emerald-600' : card.percent >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {card.percent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    필수 {card.required.met}/{card.required.total} · 선택 {card.optional.met}/{card.optional.total} · 검증 {card.verification.met}/{card.verification.total}
                  </div>
                </>
              )}
            </div>
          </div>

          {!card.na && (
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all ${card.percent >= 90 ? 'bg-emerald-500' : card.percent >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                   style={{ width: `${card.percent}%` }} />
            </div>
          )}
        </div>

        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
          <span>ⓘ <b>✓</b> 충족 · <b>◐</b> 부분 · <b>✗</b> 미충족. "토글 가능" 항목은 <b>해당/제외</b>로 직접 적용 여부를 정할 수 있어요(제외하면 N/A로 빠져 점수에 반영). 그 외 항목은 품질문서·운영기록 등 실제 활동이 쌓이면 자동으로 충족 처리됩니다.</span>
        </div>

        <Section title="필수 항목 (가중치 60%)" items={required} color="rose" cardId={cardDef.id} toggles={toggles} onToggle={onToggle} certs={certs} />
        <Section title="조건부 항목 (자동 필수↔N/A 판정)" items={conditional} isCondition color="amber" cardId={cardDef.id} toggles={toggles} onToggle={onToggle} certs={certs} />
        <Section title="선택 항목 (가중치 30%)" items={optional} color="sky" cardId={cardDef.id} toggles={toggles} onToggle={onToggle} certs={certs} />
        <Section title="검증 항목 (가중치 10%)" items={verification} color="violet" cardId={cardDef.id} toggles={toggles} onToggle={onToggle} certs={certs} />

        <DocumentLibrarySection cardId={cardDef.id} ctx={ctx} onPreview={setPreviewDoc} />

        <div className="text-[10px] text-slate-400 mt-4 leading-relaxed">
          진행률 = 필수×0.6 + 선택×0.3 + 검증×0.1 (특허 2 청구항 1(c)). 조건부 항목은 회사·제품·인증 속성에 따라 자동 결정.
        </div>
      </div>

      <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} onGoDocuments={() => navigate('/documents')} />
    </div>
  );
}
