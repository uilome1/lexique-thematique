import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-server'

// GET - Récupérer toutes les entries (optionnel: filtrer par dossier)
export async function GET(request: Request) {
  try {
    const { supabase, userId } = await getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const dossierId = searchParams.get('dossier_id')

    let query = supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)

    if (dossierId) {
      query = query.eq('dossier_id', dossierId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching entries:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST - Créer une nouvelle entry
export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getSupabaseClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        dossier_id: body.dossier_id,
        mot: body.mot,
        definition: body.definition,
        source: body.source || 'manuel',
        traduction: body.traduction,
        mots_proches: body.mots_proches,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error creating entry:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
