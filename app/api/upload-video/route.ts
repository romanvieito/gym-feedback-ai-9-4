import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get('video') as File;
    const userId = data.get('userId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 500MB' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${userId}_${timestamp}_${originalName}`;
    
    // Use /tmp directory for Vercel production environment
    const isProduction = process.env.NODE_ENV === 'production';
    const uploadDir = isProduction ? '/tmp/uploads' : join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, fileName);

    // Create uploads directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save file metadata to database
    try {
      await sql`
        INSERT INTO user_videos (user_id, filename, original_name, file_size, mime_type, upload_date, is_active, is_approved)
        VALUES (${userId}, ${fileName}, ${file.name}, ${file.size}, ${file.type}, NOW(), TRUE, FALSE)
        RETURNING id, filename, original_name;
      `;
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save video metadata' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Video uploaded successfully, pending review.',
      video: {
        id: fileName,
        filename: fileName,
        original_name: file.name
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
