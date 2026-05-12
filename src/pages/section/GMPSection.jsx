import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadContext, computeCardProgress, CARDS, STATUS, FULFILLMENT } from '../../lib/gmpProgress';

/**
 * 12개 카드 공통 상세 페이지 — 카드 ID로 분기
 * 필수/조건부/선택/검증 4개 섹션 + 항목별 충족/미충족/N/A 표시 + 규제 매핑
 */

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

function ItemRow({ item, isCondition }) {
  const isNa = item.resolvedStatus === STATUS.NA;
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
          {item.citations.map((c, i) => (
            <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
              <span className="font-semibold">{c.standard}</span> {c.clause}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

function Section({ title, items, isCondition = false, color = 'slate' }) {
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
        {items.map(item => <ItemRow key={item.id} item={item} isCondition={isCondition} />)}
      </ul>
    </section>
  );
}

export default function GMPSection() {
  const { cardId } = useParams();
  const navigate = useNavigate();

  const ctx = useMemo(() => loadContext(), []);
  const cardDef = useMemo(() => CARDS.find(c => c.id === cardId), [cardId]);
  const card = useMemo(() => cardDef ? computeCardProgress(cardDef, ctx) : null, [cardDef, ctx]);

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

  // 항목을 4개 섹션으로 분리
  const required = card.items.filter(i => !i.condition && i.status === STATUS.REQUIRED);
  const conditional = card.items.filter(i => i.condition);
  const optional = card.items.filter(i => !i.condition && i.status === STATUS.OPTIONAL);
  const verification = card.items.filter(i => !i.condition && i.status === STATUS.VERIFICATION);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
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

        {/* 4개 섹션 */}
        <Section title="필수 항목 (가중치 60%)" items={required} color="rose" />
        <Section title="조건부 항목 (자동 필수↔N/A 판정)" items={conditional} isCondition color="amber" />
        <Section title="선택 항목 (가중치 30%)" items={optional} color="sky" />
        <Section title="검증 항목 (가중치 10%)" items={verification} color="violet" />

        {/* 안내 */}
        <div className="text-[10px] text-slate-400 mt-4 leading-relaxed">
          진행률 공식 = 필수충족률 × 0.6 + 선택충족률 × 0.3 + 검증충족률 × 0.1 (특허 2 청구항 1(c)).
          조건부 항목은 회사·제품·인증 속성에 따라 시스템이 자동으로 필수/선택/N/A 결정. N/A 처리된 항목은 분모에서 제외(페널티 없음).
          각 항목의 규제 매핑은 ISO 13485 / FDA QMSR / KGMP / EU MDR 등 다중 인증 동시 적용.
        </div>
      </div>
    </div>
  );
}
