import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { sql } from '@vercel/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // Validate filename format (should be userId_timestamp_filename)
    const filenameParts = filename.split('_');
    if (filenameParts.length < 3) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const userId = filenameParts[0];

    // Verify the video belongs to the requesting user and is approved
    const videoResult = await sql`
      SELECT id, filename, mime_type FROM user_videos
      WHERE user_id = ${userId} AND filename = ${filename} AND is_active = true AND is_approved = true
    `;

    if (videoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Video not found or access denied' }, { status: 404 });
    }

    const video = videoResult.rows[0];

    // Use /tmp directory for Vercel production environment
    const isProduction = process.env.NODE_ENV === 'production';
    const uploadDir = isProduction ? '/tmp/uploads' : join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, filename);

    try {
      const fileBuffer = await readFile(filePath);

      // Return the video with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': video.mime_type || 'video/mp4',
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Video serving error:', error);
    return NextResponse.json({ error: 'Failed to serve video' }, { status: 500 });
  }
}
