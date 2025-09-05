-- Create user_settings table to store all user preferences
-- This table consolidates all user settings in one place for better management

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    fitness_goal VARCHAR(100),
    focus_area VARCHAR(100),
    wearable VARCHAR(100),
    feedback_interval VARCHAR(100),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Add comments for documentation
COMMENT ON TABLE user_settings IS 'Stores all user preferences and settings in one consolidated table';
COMMENT ON COLUMN user_settings.user_id IS 'Unique identifier for the user session';
COMMENT ON COLUMN user_settings.fitness_goal IS 'User selected fitness goal (e.g., lose-weight, build-muscle)';
COMMENT ON COLUMN user_settings.focus_area IS 'User selected focus area (e.g., upper-body, lower-body, core, full-body)';
COMMENT ON COLUMN user_settings.wearable IS 'User selected wearable device (e.g., apple, whoop, garmin, none)';
COMMENT ON COLUMN user_settings.feedback_interval IS 'User selected feedback frequency (e.g., frequent, balanced, minimal, smart)';
COMMENT ON COLUMN user_settings.is_premium IS 'Whether the user has premium access (true/false)';
