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
    if (!body.performanceHistory || !body.challengeName || !body.totalDuration) {
      return NextResponse.json(
        { error: "Missing required workout data" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    // Calculate performance statistics
    const performanceHistory = body.performanceHistory;
    const averagePerformance = performanceHistory.length > 0 
      ? performanceHistory.reduce((sum: number, p: any) => sum + p.percentage, 0) / performanceHistory.length 
      : 0;

    const performanceLevels = performanceHistory.reduce((acc: any, p: any) => {
      acc[p.performanceLevel] = (acc[p.performanceLevel] || 0) + 1;
      return acc;
    }, {});

    const bestPerformance = performanceHistory.length > 0 
      ? Math.max(...performanceHistory.map((p: any) => p.percentage))
      : 0;

    const worstPerformance = performanceHistory.length > 0 
      ? Math.min(...performanceHistory.map((p: any) => p.percentage))
      : 0;

    // Create a concise prompt for workout summary
    const systemPrompt = `You are an enthusiastic fitness coach providing brief, personalized workout summaries. 
    Your role is to analyze workout performance data and provide encouraging, constructive feedback.
    
    Guidelines:
    - Be positive and encouraging while being honest about performance
    - Keep the summary very concise (1-2 short paragraphs max)
    - Include key metrics and one specific improvement tip
    - Use a warm, supportive tone
    - End with brief motivation`;

    const userPrompt = `Provide a brief, personalized workout summary for:

    Challenge: ${body.challengeName}
    Duration: ${Math.floor(body.totalDuration / 60)}m ${Math.floor(body.totalDuration % 60)}s
    Average Performance: ${averagePerformance.toFixed(1)}%
    Best/Worst: ${bestPerformance.toFixed(1)}%/${worstPerformance.toFixed(1)}%
    Performance Levels: ${JSON.stringify(performanceLevels)}
    Goal: ${body.fitnessGoal || 'General fitness'}
    Focus: ${body.focusArea || 'Full body'}

    Keep it concise: celebrate completion, highlight key performance, give one improvement tip, and motivate briefly.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const summaryText = response.choices[0].message.content;

    return NextResponse.json({ 
      summary: summaryText,
      statistics: {
        averagePerformance: averagePerformance.toFixed(1),
        bestPerformance: bestPerformance.toFixed(1),
        worstPerformance: worstPerformance.toFixed(1),
        totalDataPoints: performanceHistory.length,
        performanceLevels
      }
    });

  } catch (error) {
    console.error('Error generating AI workout summary:', error);
    return NextResponse.json(
      { 
        error: "Failed to generate workout summary",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
