import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes publiques (accessibles sans connexion)
const isPublicRoute = createRouteMatcher([
  '/',           // Landing page
  '/app(.*)',    // App accessible en mode hors ligne
  '/sign-in(.*)', 
  '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}