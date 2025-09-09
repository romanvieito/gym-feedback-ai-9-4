import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      fitnessGoal,
      focusArea,
      wearable,
      feedbackInterval,
      isPremium,
      updateExisting = true
    } = await request.json();
    
    console.log('Received user settings data:', {
      userId,
      fitnessGoal,
      focusArea,
      wearable,
      feedbackInterval,
      isPremium,
      updateExisting
    });
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    let result;
    let action = 'inserted';
    
    if (updateExisting) {
      // First check if user already has settings record
      const existingSettings = await sql`
        SELECT * FROM user_settings 
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      
      if (existingSettings.rows.length > 0) {
        // Update existing record
        console.log('Updating existing user settings record');
        result = await sql`
          UPDATE user_settings
          SET
            fitness_goal = ${fitnessGoal || null},
            focus_area = ${focusArea || null},
            wearable = ${wearable || null},
            feedback_interval = ${feedbackInterval || null},
            is_premium = ${isPremium !== undefined ? isPremium : existingSettings.rows[0].is_premium},
            updated_at = NOW()
          WHERE user_id = ${userId}
          RETURNING *
        `;
        action = 'updated';
      } else {
        // Insert new record if none exists
        console.log('Creating new user settings record');
        result = await sql`
          INSERT INTO user_settings (user_id, fitness_goal, focus_area, wearable, feedback_interval, is_premium, created_at, updated_at)
          VALUES (${userId}, ${fitnessGoal || null}, ${focusArea || null}, ${wearable || null}, ${feedbackInterval || null}, ${isPremium || false}, NOW(), NOW())
          RETURNING *
        `;
        action = 'inserted';
      }
    } else {
      // Simple insert for backward compatibility
      result = await sql`
        INSERT INTO user_settings (user_id, fitness_goal, focus_area, wearable, feedback_interval, is_premium, created_at, updated_at)
        VALUES (${userId}, ${fitnessGoal || null}, ${focusArea || null}, ${wearable || null}, ${feedbackInterval || null}, ${isPremium || false}, NOW(), NOW())
        RETURNING *
      `;
    }

    console.log('User settings saved successfully:', {
      action,
      savedData: result.rows[0]
    });

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      action: action
    });

  } catch (error) {
    console.error('Error saving user settings:', error);
    return NextResponse.json(
      { error: 'Failed to save user settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Missing userId or email parameter' },
        { status: 400 }
      );
    }

    let result;
    
    if (userId) {
      // Get the user's settings by userId
      result = await sql`
        SELECT * FROM user_settings 
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
    } else if (email) {
      // Get the user's settings by email (using email hash)
      const emailHash = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
      const emailUserId = `email_${emailHash}`;
      
      result = await sql`
        SELECT * FROM user_settings 
        WHERE user_id = ${emailUserId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
    }

    const res = NextResponse.json({ 
      success: true, 
      data: result.rows[0] || null
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
  }
}
