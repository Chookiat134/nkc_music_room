import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware((auth, req) => {
  // you can add custom logic here if needed
}, {
  publicRoutes: ['/', '/sign-in', '/sign-up'],
  ignoredRoutes: ['/api/webhooks/clerk'],
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
