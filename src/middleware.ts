import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes accessible without any login
const isPublic = createRouteMatcher([
  '/upload(.*)',                        // QR screenshot upload — scanned from phone, no account needed
  '/api/lms/lessons/(.*)/title',        // lesson title for QR upload page header
  '/api/lms/lessons/(.*)/screenshots',  // POST from QR upload page, GET also kept open here
  '/api/uploadthing(.*)',               // UploadThing file upload handler
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
