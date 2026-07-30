import { createClient } from '@supabase/supabase-js';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export async function sendMagicLink(email:string){if(!supabase)throw new Error('Cloud sync is not configured in this build.');const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:'nextstep://account'}});if(error)throw error;}
