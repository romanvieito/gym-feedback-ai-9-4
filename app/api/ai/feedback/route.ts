import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    // Utilities kept local to scope for clarity
    const humanizeJoint = (joint: string) => (joint || '').replace(/_/g, ' ');
    const formatList = (items: string[]) => {
      if (!Array.isArray(items) || items.length === 0) return '';
      if (items.length === 1) return humanizeJoint(items[0]);
      const rest = items.slice(0, -1).map(humanizeJoint).join(', ');
      const last = humanizeJoint(items[items.length - 1]);
      return `${rest} and ${last}`;
    };

    const inferExerciseType = (workout: any): string => {
      const raw = (workout?.type || workout?.title || '').toLowerCase();
      if (raw.includes('squat')) return 'squat';
      if (raw.includes('pushup') || raw.includes('push-up')) return 'pushup';
      if (raw.includes('plank')) return 'plank';
      if (raw.includes('lunge')) return 'lunge';
      return 'general';
    };

    // No joint prioritization; preserve provided order

    const contextualFallback = (
      performanceFeedback: string,
      percentage: number,
      joints: string[],
      userSettings?: { fitnessGoal?: string; focusArea?: string },
      workout?: any
    ) => {
      const level = performanceFeedback || 'Unknown';
      const pct = Number.isFinite(percentage) ? percentage.toFixed(1) : '0.0';
      const exercise = inferExerciseType(workout);
      const listText = (Array.isArray(joints) && joints.length > 0) ? formatList(joints) : 'your alignment';

      const levelTemplates: Record<string, string> = {
        Excellent: `Outstanding form (${pct}%)! A tiny tweak to ${listText} will make it perfect.`,
        Good: `Good work (${pct}%)! Focus on ${listText} alignment to level up.`,
        Fair: `Nice effort (${pct}%)! Let’s tidy up ${listText} for better form.`,
        Poor: `You're building solid habits (${pct}%) — keep going! Start by aligning ${listText}.`
      };

      // Bias to user focus area if present
      const focus = userSettings?.focusArea?.toLowerCase();
      if ((!Array.isArray(joints) || joints.length === 0) && focus) {
        return `Good work (${pct}%)! Keep steady and focus on ${focus}. Smooth, controlled movement.`;
      }

      return levelTemplates[level] || `Great job (${pct}%)! Let’s improve ${listText}. Keep it steady and aligned.`;
    };

    const body = await req.json();

    const performanceFeedback = typeof body.performanceFeedback === 'string' ? body.performanceFeedback : 'Unknown';
    const percentageRaw = body.percentage;
    const mostMisalignedLandmarks = Array.isArray(body.mostMisalignedLandmarks) ? body.mostMisalignedLandmarks : [];
    const userSettings = body.userSettings || {};
    const workout = body.selectedWorkout || {};

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
        feedback: contextualFallback(performanceFeedback, percentage, mostMisalignedLandmarks, userSettings, workout)
      });
    }

    // Build enhanced, contextual prompt
    const exerciseType = inferExerciseType(workout);
    const listText = (Array.isArray(mostMisalignedLandmarks) && mostMisalignedLandmarks.length > 0)
      ? formatList(mostMisalignedLandmarks)
      : '';

    const tone = percentage >= 90
      ? 'Provide advanced fine-tuning tips; keep it concise and confident.'
      : percentage >= 75
      ? 'Offer specific improvement cues with supportive tone.'
      : percentage >= 60
      ? 'Give clear, basic guidance with encouragement.'
      : 'Focus on foundational form cues; be patient and positive.';

    const contextLines = [
      `Fitness Goal: ${userSettings?.fitnessGoal || 'General fitness'}`,
      `Focus Area: ${userSettings?.focusArea || 'Full body'}`,
      `Workout: ${workout?.title || workout?.type || 'General workout'} (${exerciseType})`,
      `Performance Level: ${performanceFeedback}`,
      `Match Percentage: ${percentage.toFixed(1)}%`,
      `Joints to improve: ${listText || 'none'}`
    ].join('\n');

    const systemContent = [
      'You are a supportive fitness trainer providing real-time, actionable form feedback.',
      'Constraints: 1-2 short sentences. Start with encouragement, give concise cues covering all listed joints (no prioritization), end with motivation.',
      'If no issue provided, deliver a brief positive reinforcement only.'
    ].join(' ');

    const userContent = [
      contextLines,
      'Provide specific, actionable feedback touching each listed joint briefly (no prioritization).',
      `Tone: ${tone}`
    ].join('\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent }
      ],
      max_tokens: 90,
      temperature: 0.7
    });

    return NextResponse.json({ 
      feedback: response.choices?.[0]?.message?.content || contextualFallback(performanceFeedback, percentage, mostMisalignedLandmarks, userSettings, workout)
    });

  } catch (error) {
    console.error('Error generating AI feedback:', error);
    // Return graceful fallback so client still gets helpful guidance
    return NextResponse.json({
      feedback: 'Great effort! Keep your alignment steady and move with control. Focus on smooth, balanced form.'
    });
  }
}
