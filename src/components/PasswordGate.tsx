import { FormEvent, ReactNode, useState } from "react";
import { LockKeyhole } from "lucide-react";

const PASSWORD_HASH =
  "68c6c36871ca685062e73f9c02aea4d3cab58abb440fc0f8c376364a5285f60f";
const SESSION_KEY = "ai-analytics-auth";

type PasswordGateProps = {
  children: ReactNode;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === PASSWORD_HASH,
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsChecking(true);

    try {
      const hash = await sha256(password);

      if (hash !== PASSWORD_HASH) {
        setError("Wrong password.");
        setPassword("");
        return;
      }

      sessionStorage.setItem(SESSION_KEY, hash);
      setIsAuthenticated(true);
    } catch {
      setError("Password check is unavailable in this browser.");
    } finally {
      setIsChecking(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 text-ink">
      <form
        className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm"
        onSubmit={onSubmit}
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-normal text-muted">
              AI agents dashboard
            </p>
            <h1 className="text-lg font-semibold text-ink">Access required</h1>
          </div>
        </div>

        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          autoFocus
          className="mb-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-lg bg-accent px-3 py-2 font-semibold text-white hover:bg-[#2648bd] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isChecking || !password}
          type="submit"
        >
          {isChecking ? "Checking..." : "Open"}
        </button>
      </form>
    </main>
  );
}
