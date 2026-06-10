import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes accessible without any login
const isPublic = createRouteMatcher([
  '/upload(.*)',                           // QR upload pages — scanned from phone, no account needed
  '/api/lms/lessons/(.*)/title',           // lesson title for QR page header
  '/api/lms/lessons/(.*)/screenshots',     // POST from lesson QR upload page
  '/api/lms/courses/(.*)/title',           // course title for QR page header
  '/api/lms/courses/(.*)/screenshots',     // POST from course QR upload page
  '/api/uploadthing(.*)',                  // UploadThing file handler
  '/sign-in(.*)',
  '/sign-up(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublic(req)) auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
