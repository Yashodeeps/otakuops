// Clerk auth gate. Everything is private except the sign-in/sign-up routes.
// Pages: signed-out users are redirected to /sign-in.
// API routes: pass through (each route reads auth() and returns 401 itself),
// so API clients get JSON 401s instead of an HTML redirect.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isApi = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;
  const { userId, redirectToSignIn } = await auth();
  if (!userId && !isApi(req)) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    // run on everything except Next internals and static files…
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)",
    // …and always on API routes + Clerk's auto-proxy path
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
