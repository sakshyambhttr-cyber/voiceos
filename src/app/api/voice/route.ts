import { NextRequest, NextResponse } from "next/server";
import { config } from "@/config";

// Strip markdown/formatting so Murf speaks clean prose
function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/#{1,6}\s/g, "") // headings
    .replace(/\n{2,}/g, ". ") // double newlines → pause
    .replace(/\n/g, ", ") // single newlines → brief pause
    .replace(/[*_~]/g, "") // leftover markdown chars
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceId } = body as { text: string; voiceId?: string };

    if (!text || typeof text !== "string" || text.trim() === "") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const murfApiKey = config.apiKeys.murf;

    // If no Murf key, return a signal so the frontend falls back gracefully
    if (!config.features.enableMurfTts) {
      return NextResponse.json({ error: "MURF_API_KEY not configured" }, { status: 503 });
    }

    const speechText = cleanForSpeech(text.trim());
    const selectedVoice = voiceId || "en-US-miles";
    const selectedLocale = selectedVoice.includes("-")
      ? selectedVoice.split("-").slice(0, 2).join("-")
      : "en-US";

    // Call Murf Falcon streaming endpoint — receives raw audio bytes
    const murfRes = await fetch(config.constants.murfStreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": murfApiKey,
      },
      body: JSON.stringify({
        text: speechText,
        voiceId: selectedVoice,
        model: "FALCON",
        locale: selectedLocale,
        format: "MP3",
        sampleRate: 24000,
        channelType: "MONO",
      }),
    });

    if (!murfRes.ok) {
      const errText = await murfRes.text().catch(() => "unknown");
      console.error("[/api/voice] Murf error", murfRes.status, errText);
      return NextResponse.json(
        { error: `Murf API error: ${murfRes.status}` },
        { status: murfRes.status }
      );
    }

    // Stream the audio bytes directly back to the browser as MP3
    const audioBuffer = await murfRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("[/api/voice]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
