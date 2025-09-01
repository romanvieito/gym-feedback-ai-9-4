import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const defaultFallback = (performanceFeedback: string, percentage: number, joints: string[]) => {
      const jointPhrase = joints && joints.length > 0 ? joints.join(', ') : 'your alignment';
      const level = performanceFeedback || 'Unknown';
      const pct = Number.isFinite(percentage) ? percentage.toFixed(1) : '0.0';
      return `Good work (${pct}%)! Let's improve ${jointPhrase}. Keep steady, align your posture, and move with control. (${level})`;
    };

    const body = await req.json();

    const performanceFeedback = typeof body.performanceFeedback === 'string' ? body.performanceFeedback : 'Unknown';
    const percentageRaw = body.percentage;
    const mostMisalignedLandmarks = Array.isArray(body.mostMisalignedLandmarks) ? body.mostMisalignedLandmarks : [];

    // Validate presence and types without rejecting valid 0 values
    const percentage = typeof percentageRaw === 'number' && !Number.isNaN(percentageRaw)
      ? percentageRaw
      : 0;

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    // If no API key, immediately return graceful fallback
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set. Returning fallback feedback.');
      return NextResponse.json({
        feedback: defaultFallback(performanceFeedback, percentage, mostMisalignedLandmarks)
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "You are a supportive fitness trainer. Assume the user is warming up. Provide brief, encouraging feedback based on workout performance data. Identify a specific joint with the most noticeable form issue (provided as input). Focused on improving the joint's form. Example - Input: left shoulder, Output: Good! Try to keep your left shoulder steady and aligned."
      }, {
        role: "user",
        content: `Performance Level: ${performanceFeedback}
          Match Percentage: ${percentage.toFixed(1)}%
          Joint to improve: ${mostMisalignedLandmarks.join(', ')}`
      }],
      max_tokens: 100
    });

    return NextResponse.json({ 
      feedback: response.choices[0].message.content 
    });

  } catch (error) {
    console.error('Error generating AI feedback:', error);
    // Return graceful fallback so client still gets helpful guidance
    return NextResponse.json({
      feedback: 'Great effort! Keep your alignment steady and move with control. Focus on smooth, balanced form.'
    });
  }
}
