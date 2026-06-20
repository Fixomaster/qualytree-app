import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { auth } from '../lib/auth';
import gmp, { loadContext, computeAllCards, computeOverallScore, userCanAccessCard, STATUS, FULFILLMENT } from '../lib/gmpProgress';

/**
 * Tier 1 Dashboard — 12개 GMP/RA 카드 + 4개 하단 패널
 * 행1 (보라): ①QMS ②설계 ③공급자 ④제조 ⑤QC ⑥NCR/CAPA ⑦내부심사 ⑧교육
 * 행2 (호박): ⑨인허가 ⑩UDI ⑪PMS ⑫임상평가
 */

// 색상 임계값 (메모리에 합의된 회색/노랑/빨강 규칙)
function progressColor(percent, na, locked) {
  if (locked) return { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-400', bar: 'bg-slate-300' };
  if (na) return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-400', bar: 'bg-slate-200' };
  if (percent >= 90) return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' };
  if (percent >= 70) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' };
  return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500' };
}

// 행별 액센트 색상 (Integrated Architecture v1.1 체계: 보라=입력/품질, 호박=출력/시판후)
function rowAccent(row) {
  return row === 1 ? 'text-violet-600' : 'text-amber-600';
}

function CardTile({ card, onClick, locked }) {
  const color = progressColor(card.percent, card.na, locked);
  const accent = rowAccent(card.cardRow);

  return (
    <button
      onClick={() => !locked && !card.na && onClick(card)}
      disabled={locked}
      className={`relative w-full text-left p-4 rounded-xl border-2 ${color.border} ${color.bg} transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {locked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-slate-500 bg-white/80 rounded-full px-2 py-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          권한 필요
        </div>
      )}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-xs font-bold ${accent}`}>{card.cardIndex.toString().padStart(2, '0')}</span>
        <span className="text-sm font-semibold text-slate-800 truncate">{card.cardTitle}</span>
      </div>

      {card.na ? (
        <div className="py-3 text-center">
          <div className="text-2xl font-bold text-slate-400">N/A</div>
          <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">{card.naReason}</div>
        </div>
      ) : (
        <>
          <div className={`text-3xl font-bold tabular-nums ${color.text}`}>{card.percent}%</div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white">
            <div className={`h-full rounded-full ${color.bar} transition-all`} style={{ width: `${card.percent}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
            <span>필수 <b className="text-slate-800">{card.required.met}/{card.required.total}</b></span>
            <span>선택 <b className="text-slate-800">{card.optional.met}/{card.optional.total}</b></span>
            <span>검증 <b className="text-slate-800">{card.verification.met}/{card.verification.total}</b></span>
          </div>
        </>
      )}
    </button>
  );
}

function CertBadge({ label, active }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-400 line-through'}`}>
      {label}
    </span>
  );
}

function PanelDecisionLog({ ctx }) {
  const recent = (ctx.decisionLog ?? []).slice(0, 5);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">결정 일지</h3>
        <span className="text-[10px] text-slate-400">특허 3</span>
      </div>
      {recent.length === 0 ? (
        <div className="text-xs text-slate-400 py-6 text-center">아직 누적된 결정이 없습니다.</div>
      ) : (
        <ul className="space-y-2">
          {recent.map((d, i) => (
            <li key={i} className="text-xs border-l-2 border-violet-300 pl-2">
              <div className="text-slate-700 font-medium">{d.type ?? '결정'}</div>
              <div className="text-slate-500">{d.timestamp ? new Date(d.timestamp).toLocaleString('ko-KR') : '—'}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PanelDeadlines({ cards, ctx }) {
  // 모든 카드의 만료/마감 항목 집계 (단순 휴리스틱 — 미충족 검증 항목)
  const items = [];
  cards.forEach(c => {
    if (c.na) return;
    c.items.forEach(it => {
      if (it.resolvedStatus === STATUS.VERIFICATION && it.fulfillment === FULFILLMENT.UNMET) {
        items.push({ card: c.cardTitle, label: it.label, id: it.id });
      }
    });
  });
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">임박 마감 · 미충족 검증</h3>
        <span className="text-[10px] text-slate-400">상위 {Math.min(items.length, 6)}건</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-emerald-600 py-6 text-center">현재 미충족 검증 항목 없음 ✓</div>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 6).map((it, i) => (
            <li key={i} className="text-xs flex items-start gap-2">
              <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded shrink-0">{it.card}</span>
              <span className="text-slate-600 line-clamp-1">{it.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PanelRiskHotspots({ cards }) {
  // 점수 낮은 카드 상위 3개 = 위험 핫스팟
  const hotspots = cards
    .filter(c => !c.na && c.percent !== null)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 3);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">위험관리 핫스팟</h3>
        <span className="text-[10px] text-slate-400">진행률 하위 3</span>
      </div>
      <ul className="space-y-2">
        {hotspots.map(c => (
          <li key={c.cardId} className="flex items-center justify-between">
            <span className="text-xs text-slate-700">
              <span className={`font-bold ${rowAccent(c.cardRow)}`}>{c.cardIndex.toString().padStart(2, '0')}</span> {c.cardTitle}
            </span>
            <span className={`text-xs font-bold ${c.percent < 30 ? 'text-rose-600' : c.percent < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{c.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PanelHandover({ ctx }) {
  const handleDownload = () => {
    // 실제 PDF 생성은 후속 작업 — 지금은 결정일지 JSON 다운로드
    const blob = new Blob([JSON.stringify({
      generatedAt: new Date().toISOString(),
      ctx: { company: ctx.company, certifications: ctx.certifications, products: ctx.products.list?.length ?? 0 },
      decisionLog: ctx.decisionLog,
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qualytree-handover-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-900">인수인계 패키지</h3>
        <span className="text-[10px] text-emerald-700">특허 3</span>
      </div>
      <p className="text-xs text-emerald-800 mb-3">담당자 변경 시 5분 내 핵심 파악이 가능한 패키지를 다운로드합니다.</p>
      <button
        onClick={handleDownload}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition"
      >
        패키지 생성·다운로드
      </button>
    </div>
  );
}

function NextSteps({ navigate, firstCardId }) {
  const [g, setG] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qualytree.guide') || '{}') } catch { return {} }
  });
  const save = (next) => { setG(next); try { localStorage.setItem('qualytree.guide', JSON.stringify(next)) } catch { /* ignore */ } };
  const ob = (() => { try { return JSON.parse(localStorage.getItem('qualytree.onboarding') || '{}') } catch { return {} } })();
  const productCount = (ob.products || []).length;
  const memberCount = (ob.members || []).length;
  const checks = g.checks || {};
  const toggle = (k) => save({ ...g, checks: { ...checks, [k]: !checks[k] } });

  const steps = [
    { k: 'products', title: '제품 등록', desc: '생산·인증 대상 제품을 등록·확인합니다.', cta: '제품 관리', go: () => navigate('/products'), auto: productCount > 0, autoLabel: productCount + '건' },
    { k: 'members', title: '구성원·권한 배정', desc: '담당자를 추가하고 작업자/검사관/매니저 권한을 지정합니다.', cta: '계정 관리', go: () => navigate('/manager/accounts'), auto: memberCount > 0, autoLabel: memberCount + '명' },
    { k: 'docs', title: '품질매뉴얼·절차서 작성', desc: '온보딩에서 고른 목차를 실제 문서 내용으로 채웁니다.', cta: '품질 문서', go: () => navigate('/documents') },
    { k: 'gmp', title: 'GMP 필수항목 채우기', desc: '각 영역의 미흡(빨강) 항목부터 작성해 점수를 올립니다.', cta: '첫 항목 시작', go: () => navigate(firstCardId ? ('/section/' + firstCardId) : '/dashboard') },
    { k: 'ops', title: '운영 기록 시작', desc: '작업지시 → 배치기록 → 검사 → 부적합(NCR/CAPA) 순으로 기록합니다.', cta: '운영으로', go: () => navigate('/operations') },
    { k: 'audit', title: '내부심사·교육·경영검토', desc: '시스템이 실제로 가동된다는 증빙을 남깁니다. (심사 핵심)', cta: '품질 영역', go: () => navigate('/quality') },
  ];
  const isDone = (st) => st.auto || !!checks[st.k];
  const doneN = steps.filter(isDone).length;
  const nextIdx = steps.findIndex((st) => !isDone(st));

  if (g.hidden) {
    return (
      <div className="max-w-7xl mx-auto mb-4 text-right">
        <button onClick={() => save({ ...g, hidden: false })} className="text-xs text-emerald-700 hover:underline">시작 가이드 다시 보기 ({doneN}/{steps.length}) →</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mb-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-emerald-900">시작 가이드 · 다음 할 일</div>
          <div className="text-xs text-emerald-700 mt-0.5">온보딩 다음 단계입니다. 위에서부터 차례로 진행하세요. ({doneN}/{steps.length} 완료)</div>
        </div>
        <button onClick={() => save({ ...g, hidden: true })} className="text-xs text-emerald-700 hover:underline shrink-0">숨기기</button>
      </div>
      <div className="h-1.5 w-full rounded-full bg-emerald-100 mb-3 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: Math.round((doneN / steps.length) * 100) + '%' }} />
      </div>
      <div className="grid gap-2">
        {steps.map((st, i) => {
          const done = isDone(st);
          const isNext = i === nextIdx;
          return (
            <div key={st.k} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-white ${done ? 'border-emerald-200' : isNext ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'}`}>
              <button onClick={() => !st.auto && toggle(st.k)} title={st.auto ? '자동 완료' : '완료 표시'} className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'} ${st.auto ? 'cursor-default' : ''}`}>
                {done ? '✓' : i + 1}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-slate-800 flex items-center gap-2 flex-wrap">
                  {st.title}
                  {isNext && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">지금 할 차례</span>}
                  {st.auto && done && <span className="text-[10px] text-emerald-600">{st.autoLabel}</span>}
                </div>
                <div className="text-[11.5px] text-slate-500 mt-0.5">{st.desc}</div>
              </div>
              <button onClick={st.go} className={`shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-lg ${isNext ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{st.cta} →</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState(() => loadContext());
  const [userLevel] = useState(() => {
    try {
      const auth = JSON.parse(localStorage.getItem('qualytree.auth') ?? '{}');
      return auth.level ?? 3; // 기본 Manager/RA
    } catch { return 3; }
  });

  // localStorage 변경 감지 — 다른 화면에서 데이터 수정 시 대시보드 갱신
  useEffect(() => {
    const handler = () => setCtx(loadContext());
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  const cards = useMemo(() => computeAllCards(ctx), [ctx]);
  const overall = useMemo(() => computeOverallScore(cards), [cards]);

  const row1 = cards.filter(c => c.cardRow === 1);
  const row2 = cards.filter(c => c.cardRow === 2);

  const activeCertCount = Object.values(ctx.certifications).filter(Boolean).length;
  const productCount = ctx.products.list?.length ?? 0;

  const handleCardClick = (card) => {
    navigate(`/section/${card.cardId}`);
  };
  // 라우트는 /section/:cardId — App.jsx에 등록됨

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6">
      {(() => {
        let n = 0
        try {
          const d = JSON.parse(localStorage.getItem('qualytree.onboarding') || 'null')?.done || {}
          n = ['plan', 'info', 'org', 'manual', 'procedures', 'accounts'].filter((k) => d[k]).length
        } catch { n = 0 }
        if (n >= 6) return <NextSteps navigate={navigate} firstCardId={row1[0]?.cardId} />
        return (
          <div className="max-w-7xl mx-auto mb-4">
            <button onClick={() => navigate('/onboarding')} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 transition text-left">
              <span className="text-sm text-emerald-900"><span className="font-semibold">온보딩 설정을 완료하세요</span> <span className="text-emerald-700">— KGMP 기준 회사·제품·절차서 구성 ({n}/6 단계)</span></span>
              <span className="text-emerald-700 text-sm font-medium shrink-0">계속하기 →</span>
            </button>
          </div>
        )
      })()}
      {/* 상단 — 회사 + 전사 점수 + 활성 인증 + Level */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Qualytree <span className="text-base font-normal text-slate-500">GMP·RA 대시보드</span>
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              제품 <b className="text-slate-700">{productCount}건</b>
              <span className="mx-1.5">·</span>
              활성 인증 <b className="text-slate-700">{activeCertCount}건</b>
              <span className="mx-1.5">·</span>
              내 권한 <b className="text-slate-700">Level {userLevel}</b>
            </div>
          </div>
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-500">전사 종합</span>
                <span className={`text-4xl font-bold tabular-nums ${overall >= 90 ? 'text-emerald-600' : overall >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {overall}%
                </span>
              </div>
              <button onClick={() => navigate('/manager/accounts')} style={{ marginRight: 8, fontSize: 13, color: '#0f766e', background: 'none', border: '1px solid #99f6e4', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>계정 관리</button>
              <button
                onClick={() => { auth.signOut(); navigate('/login'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-sm font-medium transition shrink-0"
                title="로그아웃"
              >
                <LogOut size={15} />
                로그아웃
              </button>
            </div>
        </div>

        {/* 인증 뱃지 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <CertBadge label="ISO 13485" active={ctx.certifications.iso13485} />
          <CertBadge label="KGMP" active={ctx.certifications.kgmp} />
          <CertBadge label="FDA QMSR" active={ctx.certifications.fdaQmsr} />
          <CertBadge label="EU MDR" active={ctx.certifications.euMdr} />
          <CertBadge label="PMDA" active={ctx.certifications.pmda} />
          <CertBadge label="NMPA" active={ctx.certifications.nmpa} />
          <CertBadge label="MDSAP" active={ctx.certifications.mdsap} />
        </div>
      </div>

      {/* 행1 — GMP 8개 카드 */}
      <div className="max-w-7xl mx-auto mb-3">
        <div className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-violet-500 rounded" />
          행 1 — GMP 코어 (ISO 13485 / FDA QMSR / KGMP / EU MDR 공통)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {row1.map(card => (
            <CardTile
              key={card.cardId}
              card={card}
              onClick={handleCardClick}
              locked={!userCanAccessCard(card, userLevel)}
            />
          ))}
        </div>
      </div>

      {/* 행2 — 인허가/시판후 4개 카드 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-amber-500 rounded" />
          행 2 — 인허가 · 시판후 (시장별 차등 적용)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {row2.map(card => (
            <CardTile
              key={card.cardId}
              card={card}
              onClick={handleCardClick}
              locked={!userCanAccessCard(card, userLevel)}
            />
          ))}
        </div>
      </div>

      {/* 하단 4개 패널 */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <PanelDecisionLog ctx={ctx} />
        <PanelDeadlines cards={cards} ctx={ctx} />
        <PanelRiskHotspots cards={cards} />
        <PanelHandover ctx={ctx} />
      </div>

      <div className="max-w-7xl mx-auto text-[10px] text-slate-400 mt-6 text-center">
        Qualytree · 진행률 = 필수 × 0.6 + 선택 × 0.3 + 검증 × 0.1 (특허 2 청구항 1(c)) · 조건부 항목은 회사·제품·인증 속성에 따라 자동 필수↔N/A 결정
      </div>
    </div>
  );
}
