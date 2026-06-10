import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public API endpoints (called by the no-auth upload pages)
const isPublicApi = createRouteMatcher([
  '/api/lms/lessons/(.*)/title',
  '/api/lms/lessons/(.*)/screenshots',
  '/api/lms/courses/(.*)/title',
  '/api/lms/courses/(.*)/screenshots',
  '/api/uploadthing(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicApi(req)) auth.protect()
})

export const config = {
  matcher: [
    // Exclude /upload/* entirely from middleware — Clerk never runs on QR upload pages
    '/((?!_next|upload|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
