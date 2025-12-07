import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ À ajouter dans .env.local

export async function getSupabaseClient() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Utiliser la SERVICE KEY côté serveur pour bypasser RLS
  // puis filtrer manuellement par userId
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  })

  return { supabase, userId }
}