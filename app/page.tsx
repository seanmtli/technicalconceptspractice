import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  async function signOut() {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">DataPractice</h1>
        <form action={signOut}>
          <button className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
        </form>
      </div>
      <p className="mt-4 text-sm text-gray-500">Signed in as {user.email}</p>
      {/* Practice dashboard lands in step 5 */}
    </main>
  );
}
