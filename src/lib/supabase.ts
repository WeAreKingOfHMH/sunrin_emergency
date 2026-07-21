import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// 브라우저 클라이언트용
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 환경(API 라우트 등)용
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
