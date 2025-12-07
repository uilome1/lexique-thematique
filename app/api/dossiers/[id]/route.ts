import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-server'

// DELETE - Supprimer un dossier
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await getSupabaseClient()
    const { id } = await params

    // Vérifier que le dossier appartient à l'utilisateur
    const { data: dossier } = await supabase
      .from('dossiers')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier not found' }, { status: 404 })
    }

    // Supprimer les entries associées d'abord
    await supabase
      .from('entries')
      .delete()
      .eq('dossier_id', id)

    // Puis supprimer le dossier
    const { error } = await supabase
      .from('dossiers')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting dossier:', error)
    return NextResponse.json({ error: 'Failed to delete dossier' }, { status: 500 })
  }
}
