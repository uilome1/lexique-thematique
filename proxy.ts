import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes publiques (accessibles sans connexion)
const isPublicRoute = createRouteMatcher([
  '/',           // Landing page
  '/app(.*)',    // App accessible
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/api(.*)',    // API routes publiques
])

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect()
    }
  },
  {
    // Passer explicitement la clé
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  }
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}