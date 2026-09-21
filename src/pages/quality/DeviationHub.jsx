import React, { useState, useMemo } from 'react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const STORAGE_KEY = 'qualytree.deviations'

const STATUS_OPTIONS = ['발생', '조사중', '조치완료', '검증중', '종결']
const SEVERITY_OPTIONS = ['경미', '보통', '중대']
const PROCESS_OPTIONS = [
  '원자재 입고', '칭량/조제', '혼합', '성형/제조', '충진/포장',
  '라벨링', '멸균', '최종검사', '출하', '기타'
]

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const EMPTY = {
  devNo: '', date: '', process: '', description: '',
  detectedBy: '', severity: '보통', status: '발생',
  rootCause: '', action: '', verifiedBy: '', closedDate: '', notes: ''
}

export default function DeviationHub() {
  const user = auth.current()
  const [items, setItems] = useState(load)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (filterStatus && it.status !== filterStatus) return false
      if (filterSeverity && it.severity !== filterSeverity) return false
      if (search) {
        const q = search.toLowerCase()
        return (it.devNo + it.process + it.description + it.detectedBy).toLowerCase().includes(q)
      }
      return true
    }).sort((a, b) => b.id - a.id)
  }, [items, filterStatus, filterSeverity, search])

  const stats = useMemo(() => {
    const total = items.length
    const open = items.filter(i => !['종결'].includes(i.status)).length
    const critical = items.filter(i => i.severity === '중대').length
    const closed = items.filter(i => i.status === '종결').length
    return { total, open, critical, closed }
  }, [items])

  function openNew() {
    const count = items.length + 1
    const year = new Date().getFullYear()
    setForm({ ...EMPTY, devNo: `DEV-${year}-${String(count).padStart(3,'0')}`, date: new Date().toISOString().slice(0,10) })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(it) {
    setForm({ ...it })
    setEditing(it.id)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.date || !form.process || !form.description) {
      alert('날짜, 공정, 일탈 내용은 필수 입력입니다.')
      return
    }
    let next
    if (editing !== null) {
      next = items.map(it => it.id === editing ? { ...form, id: editing } : it)
    } else {
      next = [...items, { ...form, id: Date.now() }]
    }
    setItems(next); save(next)
    setShowForm(false); setForm(EMPTY); setEditing(null)
  }

  function handleDelete(id) {
    if (!confirm('이 일탈 기록을 삭제하시겠습니까?')) return
    const next = items.filter(it => it.id !== id)
    setItems(next); save(next)
  }

  function statusColor(s) {
    return { '발생': 'bg-red-100 text-red-700', '조사중': 'bg-orange-100 text-orange-700',
      '조치완료': 'bg-blue-100 text-blue-700', '검증중': 'bg-purple-100 text-purple-700',
      '종결': 'bg-green-100 text-green-700' }[s] || 'bg-gray-100 text-gray-600'
  }
  function severityColor(s) {
    return { '경미': 'bg-yellow-50 text-yellow-700', '보통': 'bg-orange-50 text-orange-700', '중대': 'bg-red-100 text-red-700' }[s] || ''
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">공정 일탈 관리</h1>
          <p className="text-sm text-gray-500 mt-1">ISO 13485 §4.1 / KGMP — 공정 일탈(Deviation) 발생 기록 및 조치 관리</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '전체', value: stats.total, color: 'text-gray-700' },
            { label: '진행중', value: stats.open, color: 'text-orange-600' },
            { label: '중대', value: stats.critical, color: 'text-red-600' },
            { label: '종결', value: stats.closed, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            + 일탈 등록
          </button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색 (번호·공정·내용·담당자)"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-48" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
            <option value="">전체 상태</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
            <option value="">전체 심각도</option>
            {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 text-sm">등록된 공정 일탈 기록이 없습니다.</p>
            <button onClick={openNew} className="mt-3 text-blue-600 text-sm hover:underline">첫 번째 일탈 등록하기</button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['일탈번호','날짜','공정','내용','심각도','상태','발견자','조치'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(it => (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-blue-700 font-medium cursor-pointer" onClick={() => openEdit(it)}>{it.devNo}</td>
                    <td className="px-3 py-2 text-gray-600">{it.date}</td>
                    <td className="px-3 py-2 text-gray-700">{it.process}</td>
                    <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={it.description}>{it.description}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor(it.severity)}`}>{it.severity}</span></td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(it.status)}`}>{it.status}</span></td>
                    <td className="px-3 py-2 text-gray-600">{it.detectedBy}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => openEdit(it)} className="text-blue-600 hover:text-blue-800 mr-2 text-xs">수정</button>
                      <button onClick={() => handleDelete(it.id)} className="text-red-500 hover:text-red-700 text-xs">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{editing !== null ? '일탈 수정' : '공정 일탈 등록'}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">일탈번호</label>
                    <input value={form.devNo} onChange={e => setForm(f => ({...f, devNo: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">발생일 *</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">공정 *</label>
                    <select value={form.process} onChange={e => setForm(f => ({...f, process: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option value="">선택</option>
                      {PROCESS_OPTIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">심각도</label>
                    <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">일탈 내용 *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                    rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="일탈 발생 시점 및 내용을 상세히 기술" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">발견자</label>
                    <input value={form.detectedBy} onChange={e => setForm(f => ({...f, detectedBy: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">상태</label>
                    <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">근본원인 분석</label>
                  <textarea value={form.rootCause} onChange={e => setForm(f => ({...f, rootCause: e.target.value}))}
                    rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="5-Why, 특성요인도 등 분석 결과" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">시정 조치 내용</label>
                  <textarea value={form.action} onChange={e => setForm(f => ({...f, action: e.target.value}))}
                    rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="즉각 조치 및 시정 조치" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">검증자</label>
                    <input value={form.verifiedBy} onChange={e => setForm(f => ({...f, verifiedBy: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">종결일</label>
                    <input type="date" value={form.closedDate} onChange={e => setForm(f => ({...f, closedDate: e.target.value}))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">비고</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                    rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => { setShowForm(false); setForm(EMPTY); setEditing(null) }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                <button onClick={handleSave}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">저장</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
