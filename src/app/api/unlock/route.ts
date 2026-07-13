import { NextResponse } from "next/server";

// Verify the shared passphrase and drop an httpOnly cookie. No-op (always ok)
// when APP_PASSPHRASE is unset, so local dev never needs to unlock.
export async function POST(req: Request) {
  const passphrase = process.env.APP_PASSPHRASE;
  if (!passphrase) return NextResponse.json({ ok: true });

  const { key } = (await req.json().catch(() => ({}))) as { key?: string };
  if (key !== passphrase) {
    return NextResponse.json({ ok: false, error: "wrong passphrase" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("otakuops_key", passphrase, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}
