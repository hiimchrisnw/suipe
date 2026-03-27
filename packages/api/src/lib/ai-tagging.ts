interface AnthropicMessage {
  content: Array<{ type: string; text?: string }>
}

export async function suggestTags(
  imageBase64: string,
  mediaType: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: 'You are tagging images for a visual inspiration database focused on product personality, design, and creative direction. Generate 5-10 relevant tags for this image. Tags should be lowercase, single words or hyphenated (e.g. "brutalist", "warm-tones", "hand-drawn"). Return ONLY a JSON array of strings, no other text.',
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) return []

    const data = (await res.json()) as AnthropicMessage
    const text = data.content[0]?.text
    if (!text) return []

    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed) || !parsed.every((t) => typeof t === "string")) return []

    return parsed as string[]
  } catch {
    return []
  }
}
