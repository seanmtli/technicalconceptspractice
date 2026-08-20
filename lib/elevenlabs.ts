/** ElevenLabs Scribe speech-to-text. Server-side only. */

export async function transcribe(audio: Blob): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  const form = new FormData();
  form.append('file', audio, 'answer.webm');
  form.append('model_id', 'scribe_v1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs STT failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  if (typeof data.text !== 'string') throw new Error('ElevenLabs STT returned no text');
  return data.text;
}
