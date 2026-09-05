/**
 * DR Smoke Test Script
 * Qualytree QMS — 재해복구 점검
 * 실행: node scripts/dr-smoke-test.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
let passed = 0, failed = 0

async function check(label, fn) {
  try {
    await fn()
    console.log('PASS:', label)
    passed++
  } catch (err) {
    console.error('FAIL:', label, '--', err.message)
    failed++
  }
}

// 1. DB 응답 확인
await check('Supabase DB 연결', async () => {
  const { error } = await supabase.from('ncr').select('id').limit(1)
  if (error && error.code !== 'PGRST116') throw new Error(error.message)
})

// 2. Auth 엔드포인트 응답
await check('Auth 서비스 응답', async () => {
  const { error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
})

// 3. Storage 버킷 목록 조회
await check('Storage 서비스 응답', async () => {
  const { error } = await supabase.storage.listBuckets()
  // 권한 오류는 서비스 가용성을 방해하지 않음
  if (error && !error.message.includes('permission')) throw new Error(error.message)
})

// 4. 핵심 테이블 존재 확인
const coreTables = ['ncr', 'capa', 'audit_log', 'improvements']
for (const table of coreTables) {
  await check('테이블 존재: ' + table, async () => {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error && !['PGRST116', '42501'].includes(error.code)) throw new Error(error.message)
  })
}

console.log('\n=== DR 점검 결과 ===')
console.log('통과:', passed, '/ 실패:', failed)

if (failed > 0) {
  console.error('DR 점검 실패 항목이 있습니다.')
  process.exit(1)
}
console.log('모든 DR 점검 통과')
