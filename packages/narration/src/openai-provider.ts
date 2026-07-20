import type { NarrationProvider } from "./provider.js";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

export interface OpenAiTtsOptions {
  apiKey?: string;
  model?: string;
  voice?: string;
}

/** Default NarrationProvider (PROJECT_PLAN.md Phase 5) — OpenAI's audio/speech endpoint, a stable REST TTS API needing no extra client library. */
export class OpenAiTtsProvider implements NarrationProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly voice: string;

  constructor(options: OpenAiTtsOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY env var — see .env.example (Phase 5: TTS narration)");
    }
    this.apiKey = apiKey;
    this.model = options.model ?? "tts-1";
    this.voice = options.voice ?? "onyx";
  }

  async synthesize(text: string): Promise<Buffer> {
    const response = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        voice: this.voice,
        input: text,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI TTS request failed (${response.status}): ${body}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
