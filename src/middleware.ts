import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

// If you need to customize public or ignored routes, use the exported config below or refer to Clerk's latest docs.

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
