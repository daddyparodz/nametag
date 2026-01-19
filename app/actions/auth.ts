'use server';

import { signOut } from '@/lib/auth';

export async function handleSignOut(callbackUrl?: string) {
  await signOut({ redirectTo: callbackUrl || '/login' });
}
