-- Create user_videos table to store uploaded video metadata
-- This table tracks videos uploaded by premium users

CREATE TABLE IF NOT EXISTS user_videos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_date TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_videos_user_id ON user_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_videos_upload_date ON user_videos(upload_date DESC);

-- Add comments for documentation
COMMENT ON TABLE user_videos IS 'Stores metadata for videos uploaded by premium users';
COMMENT ON COLUMN user_videos.user_id IS 'ID of the user who uploaded the video';
COMMENT ON COLUMN user_videos.filename IS 'Unique filename stored on server';
COMMENT ON COLUMN user_videos.original_name IS 'Original filename from user upload';
COMMENT ON COLUMN user_videos.file_size IS 'Size of the video file in bytes';
COMMENT ON COLUMN user_videos.mime_type IS 'MIME type of the video file';
COMMENT ON COLUMN user_videos.upload_date IS 'When the video was uploaded';
COMMENT ON COLUMN user_videos.is_active IS 'Whether the video is still available';
