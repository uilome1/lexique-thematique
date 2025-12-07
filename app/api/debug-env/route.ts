import { NextResponse } from 'next/server'

export async function GET() {
  // Logs serveur (visibles dans Vercel Logs)
  console.log('=== CLERK ENV VARS DEBUG ===')
  console.log('CLERK_SECRET_KEY is present:', !!process.env.CLERK_SECRET_KEY)
  console.log('Key prefix:', process.env.CLERK_SECRET_KEY?.substring(0, 7))
  console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is present:', !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  console.log('CLERK_PUBLISHABLE_KEY (alt) is present:', !!process.env.CLERK_PUBLISHABLE_KEY)
  console.log('Publishable key prefix:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 7))
  console.log('CLERK_ENCRYPTION_KEY is present:', !!process.env.CLERK_ENCRYPTION_KEY)
  console.log('============================')

  // Réponse JSON (visible dans le navigateur)
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    clerk: {
      // Test avec NEXT_PUBLIC_ prefix
      hasPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      publishableKeyPrefix: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 10) || 'MISSING',
      
      // Test SANS NEXT_PUBLIC_ prefix
      hasPublishableKeyAlt: !!process.env.CLERK_PUBLISHABLE_KEY,
      publishableKeyAltPrefix: process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 10) || 'MISSING',
      
      hasSecretKey: !!process.env.CLERK_SECRET_KEY,
      secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 7) || 'MISSING',
      hasEncryptionKey: !!process.env.CLERK_ENCRYPTION_KEY,
      encryptionKeyLength: process.env.CLERK_ENCRYPTION_KEY?.length || 0,
    },
    supabase: {
      // Test avec NEXT_PUBLIC_ prefix
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 25) || 'MISSING',
      
      // Test SANS NEXT_PUBLIC_ prefix
      hasUrlAlt: !!process.env.SUPABASE_URL,
      urlAltPrefix: process.env.SUPABASE_URL?.substring(0, 25) || 'MISSING',
      
      // Test avec NEXT_PUBLIC_ prefix
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) || 'MISSING',
      
      // Test SANS NEXT_PUBLIC_ prefix
      hasAnonKeyAlt: !!process.env.SUPABASE_ANON_KEY,
      anonKeyAltPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 10) || 'MISSING',
      
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || 'MISSING',
    },
    deepl: {
      hasApiKey: !!process.env.DEEPL_API_KEY,
      apiKeyPrefix: process.env.DEEPL_API_KEY?.substring(0, 10) || 'MISSING',
    },
  })
}