import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "OpenAI API key not configured",
          details: "Please set OPENAI_API_KEY environment variable",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const text: string | undefined = body?.text;
    const voice: string = body?.voice || "alloy";
    // Map legacy 'format' to OpenAI 'response_format'; accept common aliases
    const requestedFormat: string | undefined = body?.format || body?.response_format;
    type RespFmt = "mp3" | "wav" | "opus" | "aac" | "flac" | "pcm";
    const isRespFmt = (v: unknown): v is RespFmt =>
      v === "mp3" || v === "wav" || v === "opus" || v === "aac" || v === "flac" || v === "pcm";

    const normalizedReq = (requestedFormat || "").toString().toLowerCase();
    let response_format: RespFmt = "mp3";
    if (normalizedReq === "ogg") {
      response_format = "opus";
    } else if (isRespFmt(normalizedReq)) {
      response_format = normalizedReq;
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing text for TTS" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input: text,
      response_format,
    });

    const arrayBuffer = await result.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType =
      response_format === "mp3"
        ? "audio/mpeg"
        : response_format === "wav"
        ? "audio/wav"
        : response_format === "aac"
        ? "audio/aac"
        : response_format === "flac"
        ? "audio/flac"
        : response_format === "pcm"
        ? "audio/wave; codecs=1"
        : "audio/ogg"; // treat opus as ogg container for browser playback

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generating TTS:", error);
    return NextResponse.json(
      {
        error: "Failed to synthesize speech",
        details:
          typeof error?.message === "string" ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}




