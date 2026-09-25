import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseClientConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

// Guard: only create real client when credentials are present
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

/**
 * Format Indian mobile number to email-like identifier for Supabase
 * If user enters 10-digit phone, we create a deterministic email from it
 */
export function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned}@tela.app`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `${cleaned.slice(2)}@tela.app`;
  }
  return phone; // Already an email
}

/**
 * Detect if input is a phone number (10 digits) or email
 */
export function isPhoneNumber(input: string): boolean {
  const cleaned = input.replace(/\D/g, '');
  return /^\d{10}$/.test(cleaned) || (/^\d{12}$/.test(cleaned) && cleaned.startsWith('91'));
}

/**
 * Sign up a new shop owner with Supabase Auth
 */
export async function signUpWithSupabase(
  emailOrPhone: string,
  password: string,
  metadata: { shopName: string; ownerName: string; phone: string; businessType: string }
): Promise<{ user: User | null; session: Session | null }> {
  const email = isPhoneNumber(emailOrPhone) ? phoneToEmail(emailOrPhone) : emailOrPhone;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        shop_name: metadata.shopName,
        owner_name: metadata.ownerName,
        phone: metadata.phone,
        business_type: metadata.businessType,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // Auto-confirm the user for immediate login using the backend API
  if (data.user && !data.session) {
    // User created but not auto-confirmed — sign in directly
    const loginResult = await signInWithSupabase(emailOrPhone, password);
    return loginResult;
  }

  return { user: data.user, session: data.session };
}

/**
 * Sign in an existing shop owner with Supabase Auth
 */
export async function signInWithSupabase(
  emailOrPhone: string,
  password: string
): Promise<{ user: User | null; session: Session | null }> {
  const email = isPhoneNumber(emailOrPhone) ? phoneToEmail(emailOrPhone) : emailOrPhone;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Translate Supabase error messages to user-friendly text
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Incorrect email/phone or password. Please check and try again.');
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Account created but email not confirmed. Please check your inbox or contact admin.');
    }
    throw new Error(error.message);
  }

  return { user: data.user, session: data.session };
}

/**
 * Get current Supabase session
 */
export async function getSupabaseSession(): Promise<{ user: User | null; session: Session | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  return { user: session?.user ?? null, session };
}

/**
 * Sign out user from Supabase
 */
export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}

/**
 * Send password reset email
 */
export async function resetPasswordForEmail(emailOrPhone: string): Promise<void> {
  const email = isPhoneNumber(emailOrPhone) ? phoneToEmail(emailOrPhone) : emailOrPhone;
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });

  if (error) {
    if (error.message.includes('not found')) {
      throw new Error('No account found with this email or phone number.');
    }
    throw new Error(error.message);
  }
}
