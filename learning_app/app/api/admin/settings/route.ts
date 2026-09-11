import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
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

    // 1. MySQL Database Status & Stats
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
      dbLatencyMs = Date.now() - startTime;
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

    return NextResponse.json({
      success: true,
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
        type: 'Local Server Storage',
        path: 'public/videos/',
        videoCount: videoFileCount,
        storageUsedMB: totalStorageMB,
        maxUploadLimitMB: 500,
      },
      branding: {
        platformName: 'Jolly Board LMS',
        supportEmail: 'admin@jollyboard.com',
        issuerName: 'Jolly Board Learning & Development Academy',
        signatoryTitle: 'Head of Operations & Safety Directorate',
      },
      learningRules: {
        enforceAntiSkip: true,
        allowYouTubeEmbeds: true,
        minWatchPercentToComplete: 100,
        departments: [
          'HR', 'SAFETY', 'MAINTENANCE', 'PRODUCTION', 'QUALITY',
          'DESIGN', 'DEVELOPMENT', 'IT', 'AI',
          'CENTRAL_PROCESSING_ENGINEERING', 'STORE', 'DISPATCH'
        ]
      }
    });
  } catch (error: any) {
    console.error('Admin Settings GET Error:', error);
    return NextResponse.json({ error: 'Failed to load system settings' }, { status: 500 });
  }
}
