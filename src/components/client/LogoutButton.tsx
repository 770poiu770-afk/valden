"use client";
export function LogoutButton({ className = "whitespace-nowrap rounded px-3 py-2 text-left text-sm text-steel-600 hover:bg-white hover:text-deep" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    }}>Sign out</button>
  );
}
