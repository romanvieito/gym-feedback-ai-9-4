import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's approved uploaded videos
    const result = await sql`
      SELECT id, filename, original_name, file_size, mime_type, upload_date
      FROM user_videos
      WHERE user_id = ${userId} AND is_active = true AND is_approved = true
      ORDER BY upload_date DESC
    `;

    // Transform the data to match the workout format
    const userVideos = result.rows.map(row => ({
      id: `user_video_${row.id}`,
      title: row.original_name.replace(/\.[^/.]+$/, ""), // Remove file extension
      image: '/images/3.png', // Use a default image for uploaded videos
      video: `/api/uploads/${row.filename}`, // Use our secure API endpoint
      duration: 'Custom',
      description: 'Your uploaded workout',
      isUserVideo: true,
      uploadDate: row.upload_date,
      fileSize: row.file_size
    }));

    const res = NextResponse.json({
      success: true,
      videos: userVideos
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;

  } catch (error) {
    console.error('Error fetching user videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
