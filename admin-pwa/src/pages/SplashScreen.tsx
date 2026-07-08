// Shown while the app checks auth state on startup

export default function SplashScreen() {
  return (
    <div className="min-h-dvh bg-primary flex flex-col items-center justify-center gap-6">
      {/* Soccer ball icon */}
      <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
          <path
            d="M12 7l-2.5 2 1 3h3l1-3L12 7zM9.5 9L7 10.5M14.5 9L17 10.5M9.5 12H7.5l-1 3M14.5 12H16.5l1 3M9.5 15l1 2.5M14.5 15l-1 2.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold text-white tracking-wide">Gobron</h1>
        <p className="text-white/70 text-sm">Maydon egasi paneli</p>
      </div>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
