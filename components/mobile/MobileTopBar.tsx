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
    <header className="md:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={logoSrc}
          onError={onLogoError}
          alt="Lucraí"
          className="h-9 w-9 object-contain"
        />
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-gray-900 truncate">{title}</div>
          <div className="text-[11px] text-gray-500 truncate">Feito para celular</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onMenu}
        className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
      >
        Menu
      </button>
    </header>
  );
}


