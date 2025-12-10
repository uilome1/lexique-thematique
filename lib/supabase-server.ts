// @/lib/supabase-server.ts

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// ⚠️ CLÉ PUBLIQUE (ANON KEY) UTILISÉE POUR LES REQUÊTES UTILISATEUR SOUMISES AU RLS
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 

export async function getSupabaseClient() {
  const { userId, getToken } = await auth()
  
  if (!userId) {
    // Si l'utilisateur n'est pas authentifié, on lève une erreur 401
    throw new Error('Unauthorized')
  }
console.log(`[SERVER LOG] User ID found: ${userId}. Attempting to get JWT...`);
  // 2. Obtenir le JWT de Clerk avec le template 'supabase'
  const token = await getToken({ template: 'supabase' }) 
console.log('[SERVER LOG] JWT generated successfully. Creating Supabase client...');
  // 3. Créer le client Supabase avec la CLÉ PUBLIQUE (Anon Key)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        // 4. Injecter le JWT dans l'en-tête Authorization
        Authorization: `Bearer ${token}`, 
      },
    },
    auth: {
      persistSession: false
    }
  })

  return { supabase, userId }
}