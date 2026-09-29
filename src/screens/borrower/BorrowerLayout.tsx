import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { LogoMark } from '../../components/Logo';
import { useAuth } from '../../store/auth';
import { useSettings } from '../../store/settings';

/** Mobile-first page frame: sticky header, prototype note, 412px column. */
export function BorrowerPage({
  title,
  back,
  onBack,
  children,
  bare,
}: {
  title?: ReactNode;
  back?: string | true;
  onBack?: () => void;
  children: ReactNode;
  bare?: boolean;
}) {
  const nav = useNavigate();
  const mobile = useAuth((s) => s.mobile);
  const logout = useAuth((s) => s.logout);
  const openSettings = useSettings((s) => s.openSettings);
  const [menu, setMenu] = useState(false);

  const goBack = () => {
    if (onBack) onBack();
    else if (back === true) nav(-1);
    else if (back) nav(back);
  };

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto flex min-h-full max-w-[440px] flex-col bg-paper sm:border-x sm:border-line">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-2">
            {back || onBack ? (
              <button onClick={goBack} className="rounded-full p-2 text-navy hover:bg-slate-100" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={() => nav('/')} className="p-2" aria-label="Home">
                <LogoMark size={26} />
              </button>
            )}
            <div className="min-w-0 flex-1 truncate font-serif text-[17px] font-semibold text-navy">{title ?? 'Saralya'}</div>
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="rounded-full p-2 text-ink-soft hover:bg-slate-100" aria-label="Menu">
                <Settings className="h-5 w-5" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-card">
                    {mobile && <div className="px-3.5 py-2 text-xs text-ink-faint">Signed in as +91 {mobile}</div>}
                    <button
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setMenu(false);
                        openSettings(true);
                      }}
                    >
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                    {mobile && (
                      <button
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          logout();
                          nav('/b/login');
                        }}
                      >
                        <LogOut className="h-4 w-4" /> Log out
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-teal-tint py-1 text-[11px] font-medium text-teal">
            <ShieldCheck className="h-3 w-3" /> Prototype — nothing leaves your browser
          </div>
        </header>
        <main className={`flex flex-1 flex-col ${bare ? '' : 'px-4 pt-5'}`}>{children}</main>
      </div>
    </div>
  );
}
