export function Logo({ className = "logo" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#1E4A38" />
      <rect x="8" y="8" width="48" height="48" rx="12" fill="#FBF7F1" />
      <path d="M12 46.5h40" stroke="#CDB89A" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 46.5c2.2-5.2 6.8-8.2 12.4-8.2H38c5.4 0 9.8 2.9 12 8.2" fill="#E6D3B8" />
      <rect x="20" y="18" width="10" height="24" rx="1.5" fill="#B33A2B" />
      <rect x="30" y="16" width="14" height="26" rx="1.5" fill="#FFFDF9" stroke="#CDB89A" strokeWidth="1.4" />
      <path d="M33 21h8M33 25.5h8M33 30h6" stroke="#E4D3BE" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="44" cy="20" r="3.2" fill="#1E4A38" />
      <path d="M44 23.2V28" stroke="#1E4A38" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
