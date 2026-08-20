'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(action: 'signin' | 'signup') {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error, data } =
      action === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    if (action === 'signup' && !data.session) {
      setMessage('Check your email to confirm your account, then sign in.');
      setBusy(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">DataPractice</h1>
          <p className="text-sm text-gray-500 mt-1">
            Explain it out loud. Get coached. Actually understand it.
          </p>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit('signin');
          }}
        >
          <input
            type="email"
            required
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {message && <p className="text-sm text-red-600">{message}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('signup')}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
