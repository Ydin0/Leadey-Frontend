export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center">
          <span className="text-on-ink text-[18px] font-semibold">L</span>
        </div>
        <span className="text-[20px] font-semibold text-ink">Leadey</span>
      </div>
      {children}
      <div id="clerk-captcha" />
    </div>
  );
}
