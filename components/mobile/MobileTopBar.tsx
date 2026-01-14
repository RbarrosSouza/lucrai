import React from 'react';

export function MobileTopBar({
  title,
  logoSrc,
  onLogoError,
  onMenu,
}: {
  title: string;
  logoSrc: string;
  onLogoError: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="md:hidden sticky top-0 z-10 bg-gradient-to-r from-lucrai-600 to-lucrai-700 px-4 h-14 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Logo sem moldura, tamanho maior */}
        <img
          src={logoSrc}
          onError={onLogoError}
          alt="Lucraí"
          className="h-10 w-10 object-contain"
        />
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-white truncate">{title}</div>
          <div className="text-[10px] text-white/70 truncate">Feito para celular</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onMenu}
        className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
      >
        Menu
      </button>
    </header>
  );
}
