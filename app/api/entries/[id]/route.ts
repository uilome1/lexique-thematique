import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-server'

// PATCH - Mettre à jour une entry
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await getSupabaseClient()
    const { id } = await params
    const body = await request.json()

    // Vérifier que l'entry appartient à l'utilisateur
    const { data: entry } = await supabase
      .from('entries')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('entries')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating entry:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

// DELETE - Supprimer une entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await getSupabaseClient()
    const { id } = await params

    // Vérifier que l'entry appartient à l'utilisateur
    const { data: entry } = await supabase
      .from('entries')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting entry:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}