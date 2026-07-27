import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stamp, Factory, ChevronDown, ChevronRight } from 'lucide-react';
import { auth } from '../lib/auth';
import AppLayout from '../components/AppLayout';
import KgmpSectionList from '../components/KgmpSectionList';
import { getKgmpStatus } from '../lib/kgmpProgress';
import { gmpCertificates as foreignGmpCerts } from '../lib/foreignManufacturerState';

/**
 * GMP 대시보드 — 홈 대시보드의 "GMP 대시보드" 진입점.
 * KGMP 통합 현황(제조사)과 수입사 GMP 현황(수입업자)에 필요한 문서를 한 화면에서
 * 바로 확인하고, 항목을 클릭해 실제 입력·수정·저장 화면으로 곧장 이동한다.
 * (구 12카드 GMP·RA 종합 대시보드는 여기서 제거됨 — 필요 시 /section/:cardId 는 그대로 유지)
 */

function PanelKgmp({ kgmp }) {
  const [open, setOpen] = useState(true);
  const { pct, doneCount, totalCount, sections } = kgmp;
  const tone = pct >= 90 ? 'emerald' : pct >= 50 ? 'amber' : 'rose';
  const toneClasses = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500' },
  }[tone];
  return (
    <div className={`max-w-7xl mx-auto mb-5 rounded-xl border ${toneClasses.border} ${toneClasses.bg} p-4`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 flex-wrap text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white border ${toneClasses.border}`}>
            <Stamp size={18} className={toneClasses.text} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">KGMP 통합 현황</div>
            <div className="text-xs text-slate-600 mt-0.5">수입 인허가 제출 문서 · 기술문서 · 품질시스템 · 필수 절차서 · 유지 기록을 한 곳에서 확인·수정합니다.</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className={`text-2xl font-bold tabular-nums ${toneClasses.text}`}>{pct}%</div>
            <div className="text-[11px] text-slate-500">{doneCount}/{totalCount} 항목</div>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-white overflow-hidden hidden sm:block">
            <div className={`h-full rounded-full ${toneClasses.bar}`} style={{ width: pct + '%' }} />
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg text-white ${toneClasses.bar}`}>
            {open ? '접기' : '필요 문서 확인'} {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        </div>
      </button>
      {open && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <KgmpSectionList sections={sections} keyPrefix="dash-kgmp-" />
        </div>
      )}
    </div>
  );
}

function PanelImportGmp({ kgmp, dueCertCount }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const { pct, doneCount, totalCount, sections } = kgmp;
  const tone = dueCertCount > 0 ? 'rose' : pct >= 90 ? 'emerald' : pct >= 50 ? 'amber' : 'rose';
  const toneClasses = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500' },
  }[tone];
  return (
    <div className={`max-w-7xl mx-auto mb-5 rounded-xl border ${toneClasses.border} ${toneClasses.bg} p-4`}>
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-4 flex-wrap text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white border ${toneClasses.border}`}>
            <Factory size={18} className={toneClasses.text} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
              수입사 GMP 현황
              {dueCertCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-600 text-white">GMP 적합인정서 {dueCertCount}건 만료·임박</span>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">외국제조소 등록 · GMP 적합인정서 · 타 인증기관 실사자료 — 수입업자 전용 심사 준비 현황입니다.</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className={`text-2xl font-bold tabular-nums ${toneClasses.text}`}>{pct}%</div>
            <div className="text-[11px] text-slate-500">{doneCount}/{totalCount} 항목</div>
          </div>
          <div className="w-24 h-1.5 rounded-full bg-white overflow-hidden hidden sm:block">
            <div className={`h-full rounded-full ${toneClasses.bar}`} style={{ width: pct + '%' }} />
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-sm font-medium px-4 py-2 rounded-lg text-white ${toneClasses.bar}`}>
            {open ? '접기' : '필요 문서 확인'} {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        </div>
      </button>
      {open && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <KgmpSectionList sections={sections} keyPrefix="dash-importgmp-" />
          <button
            type="button"
            onClick={() => navigate('/foreign-manufacturers')}
            className="btn-ghost text-[12px] mt-3"
          >
            외국제조소별 상세 등록·관리 →
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [tick, setTick] = useState(0);

  // localStorage 변경 감지 — 다른 화면에서 데이터 수정 시 체크리스트 갱신
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  const kgmpProfile = (() => { try { return localStorage.getItem('qualytree.kgmpProfile') || 'manufacturer' } catch { return 'manufacturer' } })();
  const kgmp = useMemo(() => getKgmpStatus({ profile: kgmpProfile }), [tick, kgmpProfile]);
  const kgmpImporter = useMemo(() => getKgmpStatus({ profile: 'importer', autoHeal: false }), [tick]);
  const dueForeignCertCount = useMemo(() => foreignGmpCerts.dueOrExpired().length, [tick]);

  return (
    <AppLayout user={auth.current()} title="GMP 대시보드" subtitle="KGMP 통합 현황 · 수입사 GMP 현황 — 필요 문서를 확인하고 입력·수정·저장합니다">
      <div className="min-h-screen bg-slate-50 px-6 py-6">
        <PanelKgmp kgmp={kgmp} />
        <PanelImportGmp kgmp={kgmpImporter} dueCertCount={dueForeignCertCount} />
      </div>
    </AppLayout>
  );
}
