# User Settings Database Implementation

## Overview
This implementation provides comprehensive user settings persistence using both localStorage (fallback) and database (primary) storage. All user preferences are now properly saved and loaded from the database.

## Files Created/Modified

### 1. New API Route: `app/api/user-settings/route.ts`
- **POST endpoint**: Saves all user settings to database
- **GET endpoint**: Retrieves all user settings from database
- Supports both insert and update operations
- Handles missing fields gracefully

### 2. Updated Frontend: `app/page.tsx`
- Comprehensive settings loading from both localStorage and database
- Database-first approach (database values override localStorage)
- Automatic saving of all setting changes to database
- Consistent user ID management via sessionStorage
- Error handling with localStorage fallback

### 3. Database Schema: `database/user_settings_table.sql`
- Consolidated `user_settings` table for all preferences
- Unique constraint per user
- Indexed for fast lookups
- Comprehensive documentation

## Settings Covered

✅ **Fitness Goal** - Database persistence implemented
✅ **Focus Area** - Database persistence implemented  
✅ **Wearable Selection** - Database persistence implemented
✅ **Feedback Interval** - Database persistence implemented

## Key Features

### Dual Storage System
- **localStorage**: Serves as fallback for offline scenarios
- **Database**: Primary storage for cross-device persistence
- **Automatic sync**: Database values override localStorage on load

### User Session Management
- Consistent user ID via `sessionStorage`
- Auto-generated unique user IDs for new sessions
- Maintains user identity across page reloads

### Error Resilience
- Graceful fallback to localStorage if database fails
- Continues working even with database connectivity issues
- Comprehensive error logging

### Backward Compatibility
- Existing localStorage data is preserved
- Seamless migration from localStorage-only to database-backed system

## Database Setup

Run the following SQL to create the required table:

```sql
-- Create user_settings table to store all user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    fitness_goal VARCHAR(100),
    focus_area VARCHAR(100),
    wearable VARCHAR(100),
    feedback_interval VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
```

## API Endpoints

### POST `/api/user-settings`
Saves user settings to database.

**Request Body:**
```json
{
  "userId": "user_1234567890_abc123",
  "fitnessGoal": "lose-weight",
  "focusArea": "upper-body", 
  "wearable": "apple",
  "feedbackInterval": "balanced",
  "updateExisting": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": "user_1234567890_abc123",
    "fitness_goal": "lose-weight",
    "focus_area": "upper-body",
    "wearable": "apple", 
    "feedback_interval": "balanced",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "action": "updated"
}
```

### GET `/api/user-settings?userId=user_1234567890_abc123`
Retrieves user settings from database.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": "user_1234567890_abc123",
    "fitness_goal": "lose-weight",
    "focus_area": "upper-body",
    "wearable": "apple",
    "feedback_interval": "balanced",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

## How It Works

### Loading Settings
1. **Session ID**: Get or create consistent user ID from sessionStorage
2. **localStorage Fallback**: Load settings from localStorage first
3. **Database Override**: Fetch settings from database and override localStorage values
4. **State Update**: Update React state with final values
5. **UI Ready**: Mark preferences as loaded

### Saving Settings
1. **State Update**: Update React state immediately
2. **localStorage**: Save to localStorage for immediate availability
3. **Database**: Save to database for persistence
4. **Analytics**: Track setting changes with Mixpanel

### Error Handling
- Database failures don't break the UI
- localStorage serves as reliable fallback
- Comprehensive error logging for debugging
- User experience remains smooth

## Testing

To verify the implementation:

1. **Create Database Table**: Run the SQL script
2. **Set Settings**: Change any setting in the UI
3. **Check Database**: Verify settings are saved to `user_settings` table
4. **Reload Page**: Confirm settings are loaded from database
5. **Clear localStorage**: Test database-only loading
6. **Database Down**: Test localStorage fallback

## Benefits

- **Cross-device sync**: Settings persist across devices
- **Reliability**: Dual storage system ensures data availability
- **Performance**: Fast loading with indexed database queries
- **Scalability**: Consolidated table structure for easy management
- **User Experience**: Seamless settings persistence
- **Analytics**: Better tracking of user preferences
- **Maintenance**: Single source of truth for user settings

## Future Enhancements

- User authentication integration
- Settings export/import functionality
- Settings versioning and migration
- Bulk settings operations
- Settings sharing between users
- Advanced analytics on user preferences
