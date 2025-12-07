import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-server'

// GET - Récupérer tous les dossiers de l'utilisateur
export async function GET() {
  try {
    const { supabase, userId } = await getSupabaseClient()

    const { data, error } = await supabase
      .from('dossiers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching dossiers:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST - Créer un nouveau dossier
export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getSupabaseClient()
    const { nom } = await request.json()

    if (!nom || nom.trim() === '') {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('dossiers')
      .insert({ user_id: userId, nom: nom.trim() })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error creating dossier:', error)
    return NextResponse.json({ error: 'Failed to create dossier' }, { status: 500 })
  }
}
