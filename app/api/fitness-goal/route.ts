import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const { userId, goalValue, goalText } = await request.json();
    
    if (!userId || !goalValue) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and goalValue' },
        { status: 400 }
      );
    }

    // Insert the user's fitness goal (simple insert for now)
    const result = await sql`
      INSERT INTO user_fitness_goals (user_id, goal_value, goal_text, created_at, updated_at)
      VALUES (${userId}, ${goalValue}, ${goalText || ''}, NOW(), NOW())
      RETURNING *
    `;

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });

  } catch (error) {
    console.error('Error saving fitness goal:', error);
    return NextResponse.json(
      { error: 'Failed to save fitness goal' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get the user's fitness goals
    const result = await sql`
      SELECT * FROM user_fitness_goals 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    });

  } catch (error) {
    console.error('Error fetching fitness goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fitness goals' },
      { status: 500 }
    );
  }
}
