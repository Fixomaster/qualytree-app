import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Settings,
  RefreshCw,
  ClipboardList,
  Package,
  Globe,
  ChevronRight,
  FlaskConical,
  Users,
  Target,
  BookOpen,
  Layers,
  Search,
  Code2,
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import HubBanner from '../../components/HubBanner'
import { auth } from '../../lib/auth'

/* ── navigation menu items ── */
const MENU = [
  {
    id: 'dhf',
    label: '설계 이력 파일 (DHF)',
    desc: '제품 설계 전 과정 기록 및 관리',
    iso: 'ISO 13485 §7.3',
    icon: FileText,
    route: '/design-history',
    accent: '#6366f1',
    soft: '#eef2ff',
  },
  {
    id: 'device-file',
    label: '의료기기 파일 (DMR)',
    desc: '의료기기 파일 관리 및 버전 이력',
    iso: 'ISO 13485 §4.2.3',
    icon: BookOpen,
    route: '/medical-device-file',
    accent: '#0891b2',
    soft: '#ecfeff',
  },
  {
    id: 'customer-req',
    label: '고객 요구사항 검토',
    desc: '계약 검토 및 고객 요구사항 분석',
    iso: 'ISO 13485 §7.2',
    icon: Users,
    route: '/customer-req',
    accent: '#059669',
    soft: '#ecfdf5',
  },
  {
    id: 'quality-plan',
    label: '품질 계획 (QP)',
    desc: '제품별 품질 계획 수립 및 추적',
    iso: 'ISO 13485 §7.1',
    icon: Target,
    route: '/quality-plan',
    accent: '#d97706',
    soft: '#fffbeb',
  },
  {
    id: 'risk',
    label: '위험관리 (FMEA)',
    desc: 'ISO 14971 기반 위험 분석 및 통제',
    iso: 'ISO 14971',
    icon: AlertTriangle,
    route: '/risk',
    accent: '#dc2626',
    soft: '#fff1f2',
  },
  {
    id: 'validation',
    label: '공정 유효성 확인',
    desc: '공정 및 소프트웨어 유효성 확인',
    iso: 'ISO 13485 §7.5.6',
    icon: FlaskConical,
    route: '/process-validation',
    accent: '#7c3aed',
    soft: '#f5f3ff',
  },
  {
    id: 'change-control',
    label: '변경 관리',
    desc: '설계·공정·문서 변경 이력 및 영향 분석',
    iso: 'ISO 13485 §4.1.4',
    icon: RefreshCw,
    route: '/change-control',
    accent: '#0284c7',
    soft: '#f0f9ff',
  },
  {
    id: 'production-control',
    label: '생산 제어 계획',
    desc: '공정 제어 계획 및 생산 파라미터 관리',
    iso: 'ISO 13485 §7.5.1',
    icon: Settings,
    route: '/production-control',
    accent: '#65a30d',
    soft: '#f7fee7',
  },
  {
    id: 'products',
    label: '제품 · 공정',
    desc: '제품 구조 및 공정 흐름 관리',
    iso: 'ISO 13485 §7.5',
    icon: Layers,
    route: '/products',
    accent: '#0f766e',
    soft: '#f0fdfa',
  },
  {
    id: 'regulatory',
    label: '인허가 관리',
    desc: '국내외 규제 요구사항 및 인허가 현황',
    iso: 'KFDA / CE / FDA',
    icon: Globe,
    route: '/regulatory',
    accent: '#9333ea',
    soft: '#faf5ff',
  },
]

/* ── card component ── */
function MenuCard({ item, onClick }) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onClick(item.route)}
      className="group w-full text-left rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: item.soft }}
        >
          <Icon size={20} color={item.accent} />
        </div>
        <ChevronRight
          size={16}
          className="mt-1 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--ink-faint)' }}
        />
      </div>
      <div className="mt-3">
        <div className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>
          {item.label}
        </div>
        <div className="text-[12px] mb-2" style={{ color: 'var(--ink-mute)' }}>
          {item.desc}
        </div>
        <span
          className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: item.soft, color: item.accent }}
        >
          {item.iso}
        </span>
      </div>
    </button>
  )
}

/* ── search bar ── */
function SearchBar({ query, onChange }) {
  return (
    <div className="relative mb-6">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="메뉴 검색..."
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none"
        style={{
          background: 'var(--bg-soft)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
        }}
      />
    </div>
  )
}

/* ── main component ── */
export default function DevHub() {
  const user = auth.current()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? MENU.filter(m =>
        m.label.includes(query) ||
        m.desc.includes(query) ||
        m.iso.toLowerCase().includes(query.toLowerCase())
      )
    : MENU

  return (
    <AppLayout user={user} title="개발" subtitle="설계·개발 관리 | ISO 13485 §7.3">
      <div className="px-6 lg:px-8 py-6 max-w-[1280px] mx-auto">

        <HubBanner
          title="개발 관리"
          subtitle="ISO 13485 §7.3 · 설계·개발 전 과정 관리 · DHF · DMR · 위험관리"
          icon={Code2}
          color="#6366F1"
          quickActions={[
            {label:'DHF 열기', icon:FileText, onClick:()=>navigate('/design-history'), primary:true},
            {label:'위험관리', icon:AlertTriangle, onClick:()=>navigate('/risk')},
          ]}
          workflow={['개발 기획','요구사항 정의','설계','프로토타입','검증','양산 이전']}
        />

        {/* search */}
        <SearchBar query={query} onChange={setQuery} />

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--ink-faint)' }}>
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-[14px]">"{query}"에 해당하는 메뉴가 없습니다</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(item => (
              <MenuCard key={item.id} item={item} onClick={navigate} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
