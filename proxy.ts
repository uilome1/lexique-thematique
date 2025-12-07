

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const CLERK_PUBLISHABLE_KEY = 'pk_test_Y2hhcm1pbmctcHVwLTc4LmNsZXJrLmFjY291bnRzLmRldiQ' // ← Mettre ta clé ici

const isPublicRoute = createRouteMatcher([
  '/',
  '/app(.*)',
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/api(.*)',
])

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  },
  {
    publishableKey: CLERK_PUBLISHABLE_KEY,
  }
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}