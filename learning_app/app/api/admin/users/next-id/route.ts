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

export async function getNextEmployeeId(department?: string): Promise<string> {
  let deptCode = 'EMP';
  if (department) {
    const d = department.toUpperCase().trim();
    deptCode = DEPT_CODE_MAP[d] || d.slice(0, 3);
  }

  const prefix = `JC-${deptCode}-`;

  try {
    const rows = await query<any[]>(
      'SELECT employee_id FROM users WHERE employee_id LIKE ?',
      [`${prefix}%`]
    );

    let maxNum = 0;
    for (const r of rows) {
      if (!r.employee_id) continue;
      const match = r.employee_id.match(/JC-[A-Z]+-(\d+)/i);
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
  const department = searchParams.get('department') || '';
  const employeeId = await getNextEmployeeId(department);
  return NextResponse.json({ employee_id: employeeId });
}
