import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth';
import { query, pool } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

    if (!user && !allowBypass) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user && user.role !== 'admin' && !allowBypass) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. MySQL Database Status & Telemetry
    const startTime = Date.now();
    let dbStatus = 'disconnected';
    let dbVersion = '';
    let dbLatencyMs = 0;
    let tablesCount = 0;
    let recordsCount = {
      users: 0,
      courses: 0,
      lessons: 0,
      certificates: 0,
    };

    try {
      const [verRows]: any = await pool.query('SELECT VERSION() as version');
      dbVersion = verRows[0]?.version || '8.0+';
      dbLatencyMs = Math.max(1, Date.now() - startTime);
      dbStatus = 'healthy';

      // Count core tables
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
    } catch (dbErr: any) {
      dbStatus = 'error';
      console.error('Database check error:', dbErr);
    }

    // 2. Video Storage Inspection
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
        console.warn('Could not read public/videos directory:', fsErr);
      }
    }

    // Convert bytes to MB
    const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

    // 3. Fetch app_settings values
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
      console.warn('Could not read app_settings table:', sErr);
    }

    // 4. Fetch live course categories
    let categoriesList: { id: string; name: string; slug: string }[] = [];
    try {
      const catRows = await query<any[]>('SELECT id, name, slug FROM categories ORDER BY name ASC');
      categoriesList = (catRows || []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      }));
    } catch (cErr) {
      console.warn('Could not read categories table:', cErr);
    }

    return NextResponse.json({
      success: true,
      currentUserDepartment: user?.department || 'GLOBAL',
      isSuperAdmin: isSuperAdmin(user),
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
    });
  } catch (error: any) {
    console.error('Admin Settings GET Error:', error);
    return NextResponse.json({ error: 'Failed to load system settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const allowBypass = process.env.ALLOW_ADMIN_BYPASS === 'true';

    if (!user && !allowBypass) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user && user.role !== 'admin' && !allowBypass) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdmin = isSuperAdmin(user) || allowBypass;
    const body = await req.json();
    const {
      supportEmail,
      enforceAntiSkip,
      allowYouTubeEmbeds,
      platformName,
      orgName,
      issuerName,
      signatoryTitle,
    } = body;

    // Super Admin Exclusive Settings (HR / Maintenance)
    if (superAdmin) {
      if (typeof platformName === 'string' && platformName.trim()) {
        await query(
          `INSERT INTO app_settings (setting_key, setting_value) 
           VALUES ('platform_name', ?) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [platformName.trim()]
        );
      }
      if (typeof orgName === 'string' && orgName.trim()) {
        await query(
          `INSERT INTO app_settings (setting_key, setting_value) 
           VALUES ('org_name', ?) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [orgName.trim()]
        );
      }
      if (typeof issuerName === 'string' && issuerName.trim()) {
        await query(
          `INSERT INTO app_settings (setting_key, setting_value) 
           VALUES ('issuer_name', ?) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [issuerName.trim()]
        );
      }
      if (typeof signatoryTitle === 'string' && signatoryTitle.trim()) {
        await query(
          `INSERT INTO app_settings (setting_key, setting_value) 
           VALUES ('signatory_title', ?) 
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [signatoryTitle.trim()]
        );
      }
    }

    // Operational Settings (all admins)
    if (typeof supportEmail === 'string' && supportEmail.trim()) {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value) 
         VALUES ('support_email', ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [supportEmail.trim()]
      );
    }

    if (typeof enforceAntiSkip === 'boolean') {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value) 
         VALUES ('enforce_anti_skip', ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [enforceAntiSkip ? 'true' : 'false']
      );
    }

    if (typeof allowYouTubeEmbeds === 'boolean') {
      await query(
        `INSERT INTO app_settings (setting_key, setting_value) 
         VALUES ('allow_youtube_embeds', ?) 
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [allowYouTubeEmbeds ? 'true' : 'false']
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Operational & corporate settings saved successfully.',
    });
  } catch (error: any) {
    console.error('Admin Settings PUT Error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
