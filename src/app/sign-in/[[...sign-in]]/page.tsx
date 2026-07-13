import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
      <div className="text-center">
        <div className="label mb-2">private command center</div>
        <h1 className="display text-2xl">
          Sign in to <span className="text-[var(--accent)]">OtakuOps</span>
        </h1>
      </div>
      <SignIn />
    </div>
  );
}
