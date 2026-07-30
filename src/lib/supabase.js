import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Ключ уходит в HTTP-заголовок, а заголовки допускают только ASCII.
// Незаполненный .env.local иначе роняет fetch невнятной ошибкой про ISO-8859-1.
const ascii = (s) => typeof s === 'string' && s.length > 0 && /^[\x20-\x7E]+$/.test(s)

export const isConfigured =
  ascii(url) &&
  ascii(anonKey) &&
  /^https?:\/\//i.test(url) &&
  !url.includes('your-project') &&
  !anonKey.includes('your-anon')

if (!isConfigured) {
  console.error(
    'Нет ключей Supabase. Впишите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local и перезапустите npm run dev.'
  )
}

export const supabase = createClient(
  isConfigured ? url : 'https://placeholder.supabase.co',
  isConfigured ? anonKey : 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
)
