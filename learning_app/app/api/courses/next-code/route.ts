import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const DEPT_CODE_MAP: Record<string, string> = {
  MAINTENANCE: 'MNT',
  PRODUCTION: 'PRD',
  QUALITY: 'QLT',
  SAFETY: 'SAF',
  HR: 'HR',
  DESIGN: 'DSG',
  DEVELOPMENT: 'DEV',
  IT: 'IT',
  AI: 'AI',
  CENTRAL_PROCESSING_ENGINEERING: 'CPE',
  STORE: 'STR',
  DISPATCH: 'DSP',
};

export async function getNextCourseCode(departments: string[] = [], categoryName?: string): Promise<string> {
  let deptCode = 'GEN';
  if (departments.length > 0 && departments[0]) {
    const d = departments[0].toUpperCase();
    deptCode = DEPT_CODE_MAP[d] || d.slice(0, 3);
  } else if (categoryName) {
    const cat = categoryName.toUpperCase();
    if (cat.includes('MAINT')) deptCode = 'MNT';
    else if (cat.includes('PROD') || cat.includes('MANUF')) deptCode = 'PRD';
    else if (cat.includes('SAFE')) deptCode = 'SAF';
    else if (cat.includes('QUAL')) deptCode = 'QLT';
    else if (cat.includes('ENG')) deptCode = 'ENG';
    else if (cat.includes('TOOL') || cat.includes('CNC')) deptCode = 'CNC';
    else deptCode = cat.replace(/[^A-Z]/g, '').slice(0, 3) || 'GEN';
  }

  const prefix = `JC-${deptCode}-`;

  try {
    const rows = await query<any[]>(
      'SELECT course_code FROM courses WHERE course_code LIKE ?',
      [`${prefix}%`]
    );

    let maxNum = 0;
    for (const r of rows) {
      if (!r.course_code) continue;
      const match = r.course_code.match(/JC-[A-Z]+-(\d+)/i);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }

    const nextNum = maxNum + 1;
    const numStr = String(nextNum).padStart(3, '0');
    return `${prefix}${numStr}`;
  } catch {
    return `${prefix}001`;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dept = searchParams.get('department') || '';
  const categoryName = searchParams.get('category') || '';
  const depts = dept ? dept.split(',').map((d) => d.trim()).filter(Boolean) : [];

  const code = await getNextCourseCode(depts, categoryName);
  return NextResponse.json({ code });
}
