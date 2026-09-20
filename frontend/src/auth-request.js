// Keep account UI responsive even if initialization or the network stalls.
export async function withAuthDeadline(operation, milliseconds = 20000) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('AUTH_TIMEOUT')), milliseconds);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

export function authErrorMessage(error) {
  if (error?.message === 'AUTH_TIMEOUT' || ['AbortError', 'TimeoutError'].includes(error?.name)) return 'Sign-in service timed out. Check your connection, reload this page, and try again.';
  if (error?.code === 'email_not_confirmed') return 'Confirm your email using the Supabase email link, then sign in.';
  if (error?.code === 'invalid_credentials') return 'Email or password is incorrect.';
  if (error?.status === 429) return 'Too many attempts. Please wait before trying again.';
  if (error?.code === 'signup_disabled') return 'Account creation is disabled for this project.';
  return 'Account request failed. Check your credentials and connection, then try again.';
}
