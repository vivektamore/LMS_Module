import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettingsManager, { SettingsData } from '@/components/admin/SettingsManager';
import { query, pool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

  if (!user && !allowBypass) {
    redirect('/login');
  }
  if (user && user.role !== 'admin' && !allowBypass) {
    redirect('/dashboard');
  }

  // Database stats & counts
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbVersion = '8.0+';
  let dbLatencyMs = 2;
  let tablesCount = 0;
  let recordsCount = { users: 0, courses: 0, lessons: 0, certificates: 0 };

  try {
    const [verRows]: any = await pool.query('SELECT VERSION() as version');
    dbVersion = verRows[0]?.version || '8.0+';
    dbLatencyMs = Math.max(1, Date.now() - startTime);
    dbStatus = 'healthy';

    const [tables]: any = await pool.query(
      "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE()"
    );
    tablesCount = tables[0]?.cnt || 0;

    const [userCnt]: any = await pool.query('SELECT COUNT(*) as cnt FROM users');
    const [courseCnt]: any = await pool.query('SELECT COUNT(*) as cnt FROM courses');
    const [lessonCnt]: any = await pool.query('SELECT COUNT(*) as cnt FROM lessons');
    const [certCnt]: any = await pool.query('SELECT COUNT(*) as cnt FROM certificates');

    recordsCount = {
      users: userCnt[0]?.cnt || 0,
      courses: courseCnt[0]?.cnt || 0,
      lessons: lessonCnt[0]?.cnt || 0,
      certificates: certCnt[0]?.cnt || 0,
    };
  } catch (err) {
    console.error('Settings DB error:', err);
    dbStatus = 'error';
  }

  // Video Storage Inspection
  const publicVideosDir = path.join(process.cwd(), 'public', 'videos');
  let videoFileCount = 0;
  let totalStorageBytes = 0;

  if (fs.existsSync(publicVideosDir)) {
    try {
      const files = fs.readdirSync(publicVideosDir);
      for (const file of files) {
        const filePath = path.join(publicVideosDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          videoFileCount++;
          totalStorageBytes += stats.size;
        }
      }
    } catch (fsErr) {
      console.warn('Could not read videos dir:', fsErr);
    }
  }

  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

  // App Settings table
  const settingsMap: Record<string, string> = {
    platform_name: 'Jolly Clamps Technical Training LMS',
    org_name: 'Jolly Clamps',
    support_email: 'admin@jollyclamps.com',
    issuer_name: 'Jolly Clamps Technical Training Academy',
    signatory_title: 'Head of Operations & Safety Directorate',
    enforce_anti_skip: 'true',
    allow_youtube_embeds: 'true',
    max_upload_limit_mb: '500',
  };

  try {
    const rows = await query<any[]>('SELECT setting_key, setting_value FROM app_settings');
    for (const row of rows || []) {
      settingsMap[row.setting_key] = row.setting_value;
    }
  } catch (sErr) {
    console.warn('Error reading app_settings:', sErr);
  }

  // Categories
  let categoriesList: { id: string; name: string; slug: string }[] = [];
  try {
    const catRows = await query<any[]>('SELECT id, name, slug FROM categories ORDER BY name ASC');
    categoriesList = (catRows || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    }));
  } catch (cErr) {
    console.warn('Error reading categories:', cErr);
  }

  const initialData: SettingsData = {
    currentUserDepartment: user?.department || 'GLOBAL',
    database: {
      status: dbStatus,
      version: dbVersion,
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3306,
      name: process.env.MYSQL_DATABASE || 'learning_app_db',
      latencyMs: dbLatencyMs,
      tablesCount,
      records: recordsCount,
    },
    storage: {
      type: 'Hybrid Disk & Cloud Delivery',
      path: 'public/videos/',
      videoCount: videoFileCount,
      storageUsedMB: totalStorageMB,
      maxUploadLimitMB: parseInt(settingsMap.max_upload_limit_mb || '500', 10),
    },
    branding: {
      platformName: settingsMap.platform_name,
      orgName: settingsMap.org_name,
      supportEmail: settingsMap.support_email,
      masterLogo: '/jolly-clamps-logo.png',
      issuerName: settingsMap.issuer_name,
      signatoryTitle: settingsMap.signatory_title,
    },
    learningRules: {
      enforceAntiSkip: settingsMap.enforce_anti_skip === 'true',
      allowYouTubeEmbeds: settingsMap.allow_youtube_embeds === 'true',
      minWatchPercentToComplete: 100,
      departments: [
        'HR', 'SAFETY', 'MAINTENANCE', 'PRODUCTION', 'QUALITY',
        'DESIGN', 'DEVELOPMENT', 'IT', 'AI',
        'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH'
      ],
    },
    categories: categoriesList,
  };

  return <SettingsManager initialData={initialData} />;
}
