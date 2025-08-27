import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable is not set');
      return NextResponse.json(
        { 
          error: "OpenAI API key not configured",
          details: "Please set OPENAI_API_KEY environment variable"
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    
    // Validate required fields
    if (!body.performanceFeedback || !body.percentage || !body.mostMisalignedLandmarks) {
      return NextResponse.json(
        { error: "Missing required performance data" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "You are a supportive fitness trainer. Assume the user is warming up. Provide brief, encouraging feedback based on workout performance data. Identify a specific joint with the most noticeable form issue (provided as input). Focused on improving the joint's form. Example - Input: left shoulder, Output: Good! Try to keep your left shoulder steady and aligned."
      }, {
        role: "user",
        content: `Performance Level: ${body.performanceFeedback}
          Match Percentage: ${body.percentage.toFixed(1)}%
          Joint to improve: ${body.mostMisalignedLandmarks.join(', ')}`
      }],
      max_tokens: 100
    });

    return NextResponse.json({ 
      feedback: response.choices[0].message.content 
    });

  } catch (error) {
    console.error('Error generating AI feedback:', error);
    
    // Provide more specific error information
    let errorMessage = "Failed to generate feedback";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: "Check server logs for more information"
      },
      { status: 500 }
    );
  }
}
