import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const { videoId, approved, adminUserId } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    if (approved === undefined) {
      return NextResponse.json({ error: 'Approval status is required' }, { status: 400 });
    }

    // Update video approval status
    const result = await sql`
      UPDATE user_videos
      SET
        is_approved = ${approved},
        approved_date = ${approved ? 'NOW()' : null},
        approved_by = ${approved ? adminUserId || 'admin' : null}
      WHERE id = ${videoId}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Video ${approved ? 'approved' : 'rejected'} successfully`,
      video: result.rows[0]
    });

  } catch (error) {
    console.error('Video approval error:', error);
    return NextResponse.json({ error: 'Failed to update video approval status' }, { status: 500 });
  }
}

// GET endpoint to list videos pending approval
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'rejected'

    let result;

    if (status === 'pending') {
      result = await sql`
        SELECT id, user_id, filename, original_name, file_size, mime_type, upload_date, is_approved, approved_date, approved_by
        FROM user_videos
        WHERE is_active = true AND is_approved = false
        ORDER BY upload_date DESC
      `;
    } else if (status === 'approved') {
      result = await sql`
        SELECT id, user_id, filename, original_name, file_size, mime_type, upload_date, is_approved, approved_date, approved_by
        FROM user_videos
        WHERE is_active = true AND is_approved = true
        ORDER BY upload_date DESC
      `;
    } else {
      result = await sql`
        SELECT id, user_id, filename, original_name, file_size, mime_type, upload_date, is_approved, approved_date, approved_by
        FROM user_videos
        WHERE is_active = true
        ORDER BY upload_date DESC
      `;
    }

    return NextResponse.json({
      success: true,
      videos: result.rows
    });

  } catch (error) {
    console.error('Video list error:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
