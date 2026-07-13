// The lock. Only active when APP_PASSPHRASE is set (always set it before a
// public deploy). Local dev with no passphrase stays open. This closes the
// open-wallet hole: without it, anyone could POST to /api/parse or /api/ask
// on a public URL and burn your ANTHROPIC_API_KEY.
import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "otakuops_key";

export function middleware(req: NextRequest) {
  const passphrase = process.env.APP_PASSPHRASE;
  if (!passphrase) return NextResponse.next(); // open in local dev

  const authed = req.cookies.get(COOKIE)?.value === passphrase;
  if (authed) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  return NextResponse.redirect(url);
}

// Everything except static assets, the unlock page, and the unlock endpoint.
export const config = {
  matcher: ["/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon).*)"],
};
