/**
 * Supabase Edge Function: generate-draft
 * Claude API 연동 + 회사별 월 사용 한도 체크
 *
 * Deploy: supabase functions deploy generate-draft
 * Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 회사 등급별 월 한도 (기본값)
const PLAN_LIMITS: Record<string, number> = {
  free:       10,
  starter:    50,
  pro:       200,
  enterprise: 999,
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // 1. 인증 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonErr('Unauthorized', 401)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return jsonErr('Unauthorized', 401)

    // 2. 요청 파싱
    const { docType, context, companyId } = await req.json()
    if (!docType || !companyId) return jsonErr('docType and companyId required', 400)

    // 3. 사용 한도 확인
    const ym = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
    const { data: usageRow } = await supabase
      .from('ai_usage_log')
      .select('count, plan')
      .eq('company_id', companyId)
      .eq('month', ym)
      .single()

    const plan  = usageRow?.plan ?? 'free'
    const used  = usageRow?.count ?? 0
    const limit = PLAN_LIMITS[plan] ?? 10

    if (used >= limit) {
      return jsonErr(`월 사용 한도 초과 (${used}/${limit}회). 플랜을 업그레이드하세요.`, 429)
    }

    // 4. 시스템 프롬프트 구성
    const systemPrompt = buildSystemPrompt(docType)
    const userPrompt   = buildUserPrompt(docType, context)

    // 5. Claude API 호출
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('Claude API error:', err)
      return jsonErr('AI 서비스 오류', 502)
    }

    const claudeData = await claudeRes.json()
    const draft = claudeData.content?.[0]?.text ?? ''

    // 6. 사용량 기록 (upsert)
    await supabase.from('ai_usage_log').upsert({
      company_id: companyId,
      month:      ym,
      plan,
      count:      used + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,month' })

    // 7. 감사 로그
    await supabase.from('audit_log').insert({
      user_id:    user.id,
      company_id: companyId,
      action:     'ai_draft_generated',
      target:     docType,
      meta:       { tokens_used: claudeData.usage?.output_tokens ?? 0 },
    })

    return new Response(JSON.stringify({
      draft,
      usage: { used: used + 1, limit, plan },
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (e) {
    console.error(e)
    return jsonErr('서버 오류', 500)
  }
})

function jsonErr(msg: string, status: number) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function buildSystemPrompt(docType: string): string {
  return `당신은 ISO 13485 및 KGMP(의약품 및 의료기기 GMP) 전문가입니다.
한국 의료기기 제조업체의 QMS 문서를 작성합니다.
규정 준수 언어를 사용하고, 명확하고 체계적인 한국어로 작성하십시오.
마크다운 형식으로 출력하십시오.
문서 유형: ${docType}`
}

function buildUserPrompt(docType: string, context: Record<string, string>): string {
  const templates: Record<string, (ctx: Record<string, string>) => string> = {
    ncr: (c) => `다음 정보를 바탕으로 부적합보고서(NCR) 초안을 작성하세요:
- 발견 부서: ${c.department ?? '미입력'}
- 제품/공정: ${c.product ?? '미입력'}
- 부적합 내용: ${c.description ?? '미입력'}
- 발견일: ${c.date ?? new Date().toLocaleDateString('ko-KR')}

원인분석(근본원인), 즉각조치, 시정조치 계획 섹션을 포함하세요.`,

    capa: (c) => `다음 정보를 바탕으로 CAPA(시정조치·예방조치) 문서 초안을 작성하세요:
- 원인: ${c.rootCause ?? '미입력'}
- 조치 담당: ${c.assignee ?? '미입력'}
- 목표 완료일: ${c.dueDate ?? '미입력'}

조치 계획, 검증 방법, 효과성 평가 기준을 포함하세요.`,

    sop: (c) => `다음 프로세스의 표준작업절차서(SOP) 초안을 작성하세요:
- 프로세스명: ${c.processName ?? '미입력'}
- 적용 부서: ${c.department ?? '미입력'}
- 관련 ISO 조항: ${c.isoClause ?? '미입력'}

목적, 적용 범위, 책임, 절차(단계별), 기록 섹션을 포함하세요.`,

    risk: (c) => `다음 의료기기에 대한 ISO 14971 위험 분석 초안을 작성하세요:
- 제품명: ${c.product ?? '미입력'}
- 용도: ${c.intendedUse ?? '미입력'}
- 위험 영역: ${c.hazardArea ?? '미입력'}

위험 식별, 위험 추정(심각도/발생가능성), 위험 평가, 위험 통제 섹션을 포함하세요.`,

    memo: (c) => `다음 주제로 내부 품질 메모(Memo)를 작성하세요:
- 주제: ${c.subject ?? '미입력'}
- 수신: ${c.to ?? '전 직원'}
- 내용 요점: ${c.body ?? '미입력'}`,
  }

  const fn = templates[docType]
  return fn ? fn(context) : `${docType} 문서 초안을 작성하세요. 컨텍스트: ${JSON.stringify(context)}`
}
