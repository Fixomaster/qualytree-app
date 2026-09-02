import React, { useState, useMemo, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
Home,
IdCard,
Megaphone,
TrendingUp,
ShoppingCart,
Factory,
ShieldCheck,
Code2,
FileText,
Wrench,
GraduationCap,
BarChart3,
ChevronRight,
Crown,
Settings,
BadgeCheck,
FileCheck2,
Globe,
Building2,
  Share2,
  Users,
  Printer,
} from 'lucide-react'
import Logo from './Logo'
import { auth } from '../lib/auth'
import { menuPermissions } from '../lib/menuPermissions'
import { deptAuth, DEPT_LIST } from '../lib/deptAuth'
import GlobalSearch from './GlobalSearch'

// Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© STEP3(Ã¬Â¡Â°Ã¬Â§ÂÃ«ÂÂ)Ã¬ÂÂÃ¬ÂÂ Ã«ÂÂ±Ã«Â¡ÂÃ­ÂÂ Ã«Â¶ÂÃ¬ÂÂ Ã¬ÂÂ´Ã«Â¦ÂÃ¬ÂÂ Ã¬ÂÂ½Ã¬ÂÂ´, Ã«Â·Â° Ã¬Â ÂÃ­ÂÂ Ã«ÂªÂ©Ã«Â¡Â(DEPT_LIST)Ã¬ÂÂ Ã­ÂÂÃ¬ÂÂ¬ Ã¬ÂÂ¤Ã¬Â Â
// Ã¬Â¡Â°Ã¬Â§ÂÃ¬ÂÂ Ã«Â§ÂÃ¬Â¶Â° Ã¬Â¶ÂÃ«Â Â¤Ã«ÂÂ¸Ã«ÂÂ¤. Ã«Â§Â¤Ã¬Â¹Â­Ã«ÂÂÃ«ÂÂ ÃªÂ²Â ÃªÂ±Â°Ã¬ÂÂ Ã¬ÂÂÃ¬ÂÂ¼Ã«Â©Â´(Ã¬ÂÂ: Ã¬ÂÂ¨Ã«Â³Â´Ã«ÂÂ© Ã¬Â Â) Ã¬Â ÂÃ¬Â²Â´ Ã«ÂªÂ©Ã«Â¡ÂÃ¬ÂÂ ÃªÂ·Â¸Ã«ÂÂÃ«Â¡Â Ã«Â³Â´Ã¬ÂÂ¬Ã¬Â¤ÂÃ«ÂÂ¤.
function loadOnboardingDeptNames() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return []
    const ob = JSON.parse(raw)
    return (ob.departments || []).map((d) => d.name).filter(Boolean)
  } catch { return [] }
}
function loadLeafDeptNames() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return []
    const ob = JSON.parse(raw)
    const depts = ob.departments || []
    const childIds = new Set(depts.map(d => d.parentId).filter(Boolean))
    return depts.filter(d => !childIds.has(d.id) || !d.parentId).map(d => d.name).filter(Boolean)
  } catch { return [] }
}
function relevantDeptOptions() {
  try {
    const raw = localStorage.getItem('qualytree.onboarding')
    if (!raw) return DEPT_LIST
    const ob = JSON.parse(raw)
    const depts = ob.departments || []
    if (!depts.length) return DEPT_LIST
    const childIds = new Set(depts.map(d => d.parentId).filter(Boolean))
    const leafDepts = depts.filter(d => !childIds.has(d.id) || !d.parentId)
    if (!leafDepts.length) return DEPT_LIST
    return leafDepts.map(d => ({ code: d.id, icon: 'Ã°ÂÂÂ¢', label: d.name }))
  } catch { return DEPT_LIST }
}

const DOMAINS = [
{
label: 'Ã¬ÂÂÃ¬Â£Â¼ÃÂ·ÃªÂ³Â ÃªÂ°Â', icon: TrendingUp,
items: [
{ to: '/sales', label: 'Ã¬ÂÂÃ¬ÂÂ Ã­ÂÂÃ­ÂÂ©' },
{ to: '/customer-req', label: 'ÃªÂ³Â ÃªÂ°Â Ã¬ÂÂÃªÂµÂ¬Ã¬ÂÂ¬Ã­ÂÂ­ ÃªÂ²ÂÃ­ÂÂ ' },
{ to: '/complaints', label: 'ÃªÂ³Â ÃªÂ°ÂÃ«Â¶ÂÃ«Â§Â ÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'ÃªÂµÂ¬Ã«Â§Â¤ÃÂ·Ã¬ÂÂÃ¬ÂÂ¬', icon: ShoppingCart,
items: [
{ to: '/purchase', label: 'ÃªÂµÂ¬Ã«Â§Â¤ Ã­ÂÂÃ­ÂÂ©' },
{ to: '/supplier', label: 'ÃªÂ³ÂµÃªÂ¸ÂÃ¬ÂÂÃ¬Â²Â´ ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/purchase-info', label: 'ÃªÂµÂ¬Ã«Â§Â¤Ã¬Â ÂÃ«Â³Â´ÃÂ·Ã¬ÂÂÃ¬ÂÂÃªÂ²ÂÃ¬ÂÂ¬' },
],
},
{
label: 'Ã¬ÂÂÃ¬ÂÂ°ÃÂ·Ã¬Â ÂÃ¬Â¡Â°', icon: Factory,
items: [
{ to: '/manufacturing', label: 'Ã¬ÂÂÃ¬ÂÂ° Ã­ÂÂÃ­ÂÂ©' },
{ to: '/process-validation', label: 'ÃªÂ³ÂµÃ¬Â ÂÃ¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸(Ã¬ÂÂ¤Ã­ÂÂ)' },
{ to: '/traceability', label: 'Ã¬Â ÂÃ­ÂÂÃ¬Â¶ÂÃ¬Â ÂÃ¬ÂÂ±ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/product-id', label: 'Ã¬Â ÂÃ­ÂÂÃ¬ÂÂÃ«Â³ÂÃÂ·Ã¬ÂÂÃ­ÂÂ' },
{ to: '/customer-property', label: 'ÃªÂ³Â ÃªÂ°ÂÃ¬ÂÂÃ¬ÂÂ°ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/preservation', label: 'Ã¬Â ÂÃ­ÂÂÃ«Â³Â´Ã¬Â¡Â´ÃÂ·Ã¬Â·Â¨ÃªÂ¸Â' },
{ to: '/inventory', label: 'Ã¬ÂÂ¬ÃªÂ³Â ÃÂ·Ã¬Â¶ÂÃªÂ³Â ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/cleanliness', label: 'Ã¬Â²Â­ÃªÂ²Â°ÃÂ·Ã¬ÂÂ¤Ã¬ÂÂ¼ ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/sterile', label: 'Ã«Â©Â¸ÃªÂ·Â  Ã¬ÂÂÃ«Â£ÂÃªÂ¸Â°ÃªÂ¸Â°' },
{ to: '/service', label: 'Ã¬ÂÂ¤Ã¬Â¹ÂÃÂ·Ã¬ÂÂÃ«Â¹ÂÃ¬ÂÂ¤' },
],
},
{
label: 'Ã­ÂÂÃ¬Â§ÂÃÂ·ÃªÂ²ÂÃ¬ÂÂ¬', icon: ShieldCheck,
items: [
{ to: '/inspection', label: 'ÃªÂ³ÂµÃ¬Â ÂÃÂ·Ã¬ÂµÂÃ¬Â¢Â ÃªÂ²ÂÃ¬ÂÂ¬' },
{ to: '/quality', label: 'NCRÃÂ·Ã«Â¶ÂÃ¬Â ÂÃ­ÂÂ©' },
{ to: '/containment', label: 'ÃªÂ²Â©Ã«Â¦Â¬ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/improvement', label: 'CAPAÃÂ·ÃªÂ°ÂÃ¬ÂÂ ' },
{ to: '/change-control',label: 'Ã«Â³ÂÃªÂ²Â½ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/audit', label: 'Ã«ÂÂ´Ã«Â¶ÂÃªÂ°ÂÃ¬ÂÂ¬' },
{ to: '/workenv', label: 'Ã¬ÂÂÃ¬ÂÂÃ­ÂÂÃªÂ²Â½ÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/measurement', label: 'Ã¬Â¸Â¡Ã¬Â ÂÃÂ·Ã«Â¶ÂÃ¬ÂÂÃÂ·ÃªÂ°ÂÃ¬ÂÂ ' },
{ to: '/kpi-dashboard', label: 'Ã­ÂÂÃ¬Â§Â KPI' },
    { to: '/post-market-safety', label: 'Ã¬ÂÂÃ­ÂÂÃ­ÂÂÃ¬ÂÂÃ¬Â ÂÃªÂ´ÂÃ«Â¦Â¬' },
    { to: '/csv', label: 'CSV Ã¬ÂÂ Ã­ÂÂ¨Ã¬ÂÂ±Ã­ÂÂÃ¬ÂÂ¸' },
    { to: '/stability', label: 'Ã¬ÂÂÃ¬Â ÂÃ¬ÂÂ± Ã¬ÂÂÃ­ÂÂ ÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'Ã¬ÂÂ¤ÃªÂ³ÂÃÂ·ÃªÂ°ÂÃ«Â°Â', icon: Code2,
items: [
{ to: '/products', label: 'Ã¬Â ÂÃ­ÂÂÃÂ·Ã¬ÂÂ¤ÃªÂ³ÂÃªÂ°ÂÃ«Â°Â' },
{ to: '/design-history', label: 'Ã¬ÂÂ¤ÃªÂ³ÂÃ¬ÂÂ´Ã«Â Â¥Ã­ÂÂÃ¬ÂÂ¼(DHF)' },
],
},
{
label: 'Ã«Â¬Â¸Ã¬ÂÂÃÂ·ÃªÂ·ÂÃ¬Â Â', icon: FileText,
items: [
{ to: '/qms-overview', label: 'QMS ÃªÂ°ÂÃ¬ÂÂ' },
{ to: '/record-master', label: 'ÃªÂ¸Â°Ã«Â¡Â Ã«ÂÂÃ¬ÂÂ¥' },
{ to: '/document-control', label: 'Ã«Â¬Â¸Ã¬ÂÂÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'Ã¬ÂÂ¤Ã«Â¹ÂÃÂ·ÃªÂµÂÃ¬Â Â', icon: Wrench,
items: [
{ to: '/equipment', label: 'Ã¬ÂÂ¤Ã«Â¹Â Ã­ÂÂÃ­ÂÂ©' },
{ to: '/calibration', label: 'ÃªÂµÂÃ¬Â ÂÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/infrastructure', label: 'Ã¬ÂÂ¸Ã­ÂÂÃ«ÂÂ¼ÃªÂ´ÂÃ«Â¦Â¬' },
],
},
{
label: 'ÃªÂµÂÃ¬ÂÂ¡ÃÂ·Ã¬ÂÂ¸Ã«Â Â¥', icon: GraduationCap,
items: [
{ to: '/training', label: 'ÃªÂµÂÃ¬ÂÂ¡Ã­ÂÂÃ«Â Â¨' },
{ to: '/competency', label: 'Ã¬ÂÂ­Ã«ÂÂÃªÂ´ÂÃ«Â¦Â¬' },
{ to: '/org-responsibility', label: 'Ã¬Â¡Â°Ã¬Â§ÂÃÂ·Ã¬Â±ÂÃ¬ÂÂ' },
{ to: '/resource-plan', label: 'Ã¬ÂÂÃ¬ÂÂ ÃªÂ³ÂÃ­ÂÂ' },
],
},
{
label: 'ÃªÂ²Â½Ã¬ÂÂÃÂ·Ã¬Â ÂÃ«ÂÂµ', icon: BarChart3,
items: [
{ to: '/management-review', label: 'ÃªÂ²Â½Ã¬ÂÂÃªÂ²ÂÃ­ÂÂ ' },
{ to: '/quality-plan', label: 'Ã­ÂÂÃ¬Â§ÂÃªÂ³ÂÃ­ÂÂ' },
{ to: '/management-commitment', label: 'ÃªÂ²Â½Ã¬ÂÂÃ¬ÂÂÃ¬Â§ÂÃÂ·Ã­ÂÂÃ¬Â§ÂÃ«Â°Â©Ã¬Â¹Â¨ÃÂ·Ã«ÂªÂ©Ã­ÂÂ' },
],
},
]

const IMP_ITEMS = [
{ to: '/foreign-manufacturers', label: 'Ã¬ÂÂ¸ÃªÂµÂ­Ã¬Â ÂÃ¬Â¡Â°Ã¬ÂÂ GMP' },
{ to: '/import-products', label: 'Ã­ÂÂÃ«ÂªÂ© Ã­ÂÂÃªÂ°Â Ã­ÂÂÃ­ÂÂ©' },
{ to: '/import-clearance', label: 'Ã¬ÂÂ�