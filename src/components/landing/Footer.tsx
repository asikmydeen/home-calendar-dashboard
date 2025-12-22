'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10">
              <span className="text-xl">◉</span>
            </div>
            <span className="text-lg font-semibold text-white">PersonalPod</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-8">
            <a
              href="#"
              className="text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-white/50 hover:text-white/80 text-sm transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-white/30 text-sm">
            © {currentYear} PersonalPod. All rights reserved.
          </p>
        </div>

        {/* Decorative gradient line */}
        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        
        {/* Made with love */}
        <div className="mt-6 text-center">
          <p className="text-white/20 text-sm flex items-center justify-center gap-1">
            Made with <span className="text-red-400">♥</span> for families everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
