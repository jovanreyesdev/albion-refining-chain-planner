/**
 * Floating quick-access buttons pinned to the bottom-right of the viewport.
 *
 * Two stacked circular icons (Discord + Ko-fi) with their brand colors so
 * they read instantly. Hover label slides out to the left.
 *
 * Position: fixed bottom-right, with safe-area padding on mobile.
 * z-index sits above page content but below the qty modal overlay (which uses z-50).
 */
export default function FloatingLinks() {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-3">
      <FloatingLink
        href="https://discord.gg/RT6CdKRn"
        bgClass="bg-[#5865F2] hover:bg-[#4752C4]"
        label="Join the Discord"
        title="Join the community on Discord"
        icon={<DiscordIcon />}
      />
      <FloatingLink
        href="https://ko-fi.com/medjoskambag"
        bgClass="bg-[#FF5E5B] hover:bg-[#E04E4B]"
        label="Buy me a coffee"
        title="Support the project on Ko-fi"
        icon={<KofiIcon />}
      />
    </div>
  );
}

/**
 * A single floating circular button.
 * On hover (desktop), a tooltip-like label slides in to the left.
 * On touch devices it just shows the icon — no hover state needed.
 */
function FloatingLink({ href, bgClass, label, title, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`group relative flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg
        transition-transform duration-200 hover:scale-110 ${bgClass}`}
    >
      {icon}
      {/* Hover label — desktop only (mobile hover doesn't trigger this) */}
      <span
        className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded bg-stone-900/95 px-2.5 py-1
          text-xs font-semibold text-amber-100 shadow opacity-0 translate-x-2 transition
          group-hover:opacity-100 group-hover:translate-x-0"
      >
        {label}
      </span>
    </a>
  );
}

/** Discord wordmark icon (official "Clyde" logo, simplified path). */
function DiscordIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037 13.6 13.6 0 0 0-.6 1.232 18.27 18.27 0 0 0-5.487 0 12.5 12.5 0 0 0-.61-1.232.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 5.677 4.37a.07.07 0 0 0-.032.027C2.04 9.795 1.063 15.061 1.55 20.262a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.3 14.3 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.199.373.293a.077.077 0 0 1-.006.127c-.598.349-1.22.645-1.873.892a.077.077 0 0 0-.04.107c.36.698.771 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-6.013-.838-11.236-3.549-15.866a.061.061 0 0 0-.03-.029zM8.02 17.114c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.957-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.957 2.418-2.157 2.418zm7.974 0c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

/** Ko-fi cup icon (simplified version of the official logo). */
function KofiIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-6 h-6"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.244 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.012 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
    </svg>
  );
}
