import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribe } from '@/lib/elevenlabs';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'NO_AUDIO' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'AUDIO_TOO_LARGE' }, { status: 413 });
  }

  try {
    const transcript = await transcribe(audio);
    return NextResponse.json({ transcript });
  } catch (e) {
    console.error('transcribe failed:', e);
    return NextResponse.json({ error: 'STT_FAILED' }, { status: 502 });
  }
}
