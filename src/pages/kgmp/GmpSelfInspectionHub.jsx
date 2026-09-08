import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, ChevronDown, ChevronRight, ExternalLink,
  BarChart2, FileText, Save, RotateCcw, AlertTriangle, CheckCircle2,
  XCircle, MinusCircle, Info, Printer
} from 'lucide-react'
import AppLayout from '../../components/AppLayout'
import { auth } from '../../lib/auth'

const LS_KEY = 'qualytree.gmp_self_inspection_v3'
