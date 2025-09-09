import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      isPremium,
      subscriptionId,
      plan
    } = await request.json();
    
    console.log('Received subscription update data:', {
      email,
      isPremium,
      subscriptionId,
      plan
    });
    
    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    // First, try to find a user with this email in the user_settings table
    // We'll use a simple approach: create a userId based on email hash for consistency
    const emailHash = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const userId = `email_${emailHash}`;

    let result;
    let action = 'inserted';
    
    // Check if user already has settings record
    const existingSettings = await sql`
      SELECT * FROM user_settings 
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    
    if (existingSettings.rows.length > 0) {
      // Update existing record
      console.log('Updating existing user settings record for email:', email);
      result = await sql`
        UPDATE user_settings
        SET
          is_premium = ${isPremium !== undefined ? isPremium : existingSettings.rows[0].is_premium},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING *
      `;
      action = 'updated';
    } else {
      // Insert new record
      console.log('Creating new user settings record for email:', email);
      result = await sql`
        INSERT INTO user_settings (user_id, is_premium, created_at, updated_at)
        VALUES (${userId}, ${isPremium || false}, NOW(), NOW())
        RETURNING *
      `;
      action = 'inserted';
    }

    console.log('Subscription update saved successfully:', {
      action,
      email,
      savedData: result.rows[0]
    });

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      action: action,
      email: email
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription status' },
      { status: 500 }
    );
  }
}
