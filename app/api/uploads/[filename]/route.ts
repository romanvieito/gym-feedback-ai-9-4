import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { join } from 'path';
import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      const fileStat = await stat(filePath);
      const fileSize = fileStat.size;
      const range = request.headers.get('range');
      const contentType = video.mime_type || 'video/mp4';

      if (range) {
        // Parse Range: bytes=start-end
        const bytesPrefix = 'bytes=';
        if (!range.startsWith(bytesPrefix)) {
          return NextResponse.json({ error: 'Invalid range header' }, { status: 416 });
        }
        const rangeStr = range.substring(bytesPrefix.length);
        const [startStr, endStr] = rangeStr.split('-');
        let start = parseInt(startStr, 10);
        let end = endStr ? parseInt(endStr, 10) : fileSize - 1;
        if (isNaN(start) || isNaN(end) || start > end || start < 0 || end >= fileSize) {
          return NextResponse.json({ error: 'Invalid range' }, { status: 416 });
        }
        const chunkSize = end - start + 1;
        const nodeStream = createReadStream(filePath, { start, end });
        const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }

      // No Range header: return entire file stream
      const nodeStream = createReadStream(filePath);
      const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
      return new NextResponse(webStream, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
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
