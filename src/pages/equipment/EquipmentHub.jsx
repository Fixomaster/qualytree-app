import React from 'react'
import { Wrench, Gauge, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const INSTRUMENTS = [
  { name: '마이크로미터', num: '#001~#002', expire: '2024-12-10', dday: 'D-172', status: '사용가능', tone: 'green' },
  { name: '마이크로미터', num: '#003', expire: '2024-06-26', dday: 'D-5', status: '교정임박', tone: 'amber' },
  { name: '표면조도계', num: '#001', expire: '2024-03-15 (만료)', dday: '+103일 경과', status: '사용제한', tone: 'red' },
  { name: '버니어캘리퍼스', num: '#001', expire: '2025-01-10', dday: 'D-200↑', status: '사용가능', tone: 'green' },
  { name: '경도계', num: '#001', expire: '2025-02-05', dday: 'D-200↑', status: '사용가능', tone: 'green' },
]

const toneBg = { green: 'var(--leaf-soft)', amber: '#fff7ed', red: 'var(--rust-soft)', gray: 'var(--bg-soft)' }
const toneFg = { green: 'var(--moss)', amber: '#b45309', red: 'var(--rust)', gray: 'var(--ink-mute)' }

export default function EquipmentHub() {
  const user = auth.current()
  const expiring = INSTRUMENTS.filter((i) => i.status !== '사용가능').length

  return (
    <AppLayout user={user} title="설비·교정" subtitle="측정장비 관리 · 교정 일정 · 설비 이력">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto fade-in">
        <div className="mb-5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--moss)' }}>
            EQP · EQUIPMENT & CALIBRATION  ·  ISO 13485 §7.6
          </span>
          <div className="font-display text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 500 }}>설비·교정</div>
          <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>모니터링·측정 장비 관리 · 교정 이력 · 사용 제한</div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: '전체 장비', value: INSTRUMENTS.length + '대', tone: 'green' },
            { label: '교정 임박/만료', value: expiring + '대', tone: expiring > 0 ? 'red' : 'green' },
            { label: '사용제한', value: INSTRUMENTS.filter((i) => i.status === '사용제한').length + '대', tone: 'red' },
            { label: '정상 사용', value: INSTRUMENTS.filter((i) => i.status === '사용가능').length + '대', tone: 'green' },
          ].map((s) => (
            <div key={s.label} className="card-base p-4">
              <div className="text-[12px] mb-1" style={{ color: 'var(--ink-mute)' }}>{s.label}</div>
              <div className="font-display text-[24px]" style={{ color: toneFg[s.tone], fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 사용제한 알람 */}
        {INSTRUMENTS.filter((i) => i.status !== '사용가능').length > 0 && (
          <div className="mb-4 rounded-lg p-3" style={{ background: 'var(--rust-soft)', border: '1px solid var(--rust)' }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} style={{ color: 'var(--rust)' }} />
              <span className="font-semibold text-[12.5px]" style={{ color: 'var(--rust)' }}>조치 필요</span>
            </div>
            {INSTRUMENTS.filter((i) => i.status !== '사용가능').map((inst, i) => (
              <div key={i} className="text-[12.5px]" style={{ color: 'var(--rust)' }}>
                • {inst.name} {inst.num} — {inst.status} ({inst.dday})
              </div>
            ))}
          </div>
        )}

        {/* 장비 목록 */}
        <div className="card-base p-4 mb-5">
          <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>
            설비·측정장비 교정 현황 (ISO 13485 §7.6)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['장비명', '번호', '교정 만료일', 'D-day', '상태', '조치'].map((h) => (
                    <th key={h} className="pb-2 text-left font-medium px-2 first:pl-0" style={{ color: 'var(--ink-faint)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INSTRUMENTS.map((inst, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="py-2 font-medium" style={{ color: 'var(--ink)' }}>{inst.name}</td>
                    <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{inst.num}</td>
                    <td className="py-2 px-2 font-mono text-[11px]" style={{ color: 'var(--ink-faint)' }}>{inst.expire}</td>
                    <td className="py-2 px-2 font-medium" style={{ color: toneFg[inst.tone] }}>{inst.dday}</td>
                    <td className="py-2 px-2">
                      <span className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: toneBg[inst.tone], color: toneFg[inst.tone], fontWeight: 500 }}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {inst.status === '사용제한' && (
                        <span className="text-[11.5px]" style={{ color: 'var(--rust)' }}>교정 의뢰 필요</span>
                      )}
                      {inst.status === '교정임박' && (
                        <span className="text-[11.5px]" style={{ color: '#b45309' }}>교정 일정 확인</span>
                      )}
                      {inst.status === '사용가능' && (
                        <span className="text-[11.5px]" style={{ color: 'var(--ink-faint)' }}>정상</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coming soon 안내 */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: Gauge, label: '설비 이력 관리', desc: '설비별 유지보수 이력 · 고장 기록', soon: true },
            { icon: Calendar, label: '교정 일정 관리', desc: '교정 일정 등록 · 알람 자동화', soon: true },
          ].map((item) => (
            <div key={item.label} className="card-base p-4 opacity-75 cursor-default">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--leaf-soft)' }}>
                  <item.icon size={17} style={{ color: 'var(--moss)' }} strokeWidth={1.7} />
                </div>
                <div>
                  <div className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>{item.label}
                    <span className="ml-2 font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>SOON</span>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>{item.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
