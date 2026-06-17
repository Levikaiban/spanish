import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages, missedWords } = await req.json();

  const missedContext = missedWords && missedWords.length > 0
    ? `The student's most-missed words (sorted by miss count):\n${missedWords
        .map((e: { spanish: string; english: string; missCount: number }) =>
          `  - "${e.spanish}" (${e.english}) — missed ${e.missCount}×`)
        .join('\n')}`
    : 'The student has no missed words recorded yet.';

  const system = `You are an AI Spanish coach in a game teaching students Spanish words through games. Give short but helpful tips and answer questions concisely unless the player specifically asks for a long answer.

Context about this student:
${missedContext}

Additional guidelines:
- Reference their specific missed words when relevant
- Give concrete memory tricks: cognates, visual stories, patterns, roots
- Keep responses concise and encouraging — this is a game, not a classroom
- If they ask something unrelated to Spanish learning, gently redirect`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        system,
        stream: true,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const text = JSON.parse(data)?.delta?.text ?? '';
                if (text) controller.enqueue(new TextEncoder().encode(text));
              } catch {}
            }
          }
        } finally { controller.close(); }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
