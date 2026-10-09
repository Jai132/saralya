import { useNavigate } from 'react-router-dom';
import { Settings, Smartphone, LayoutDashboard, ShieldCheck, Link2, Ruler, GitCompare, RefreshCw, ScanLine, Box, ArrowRight } from 'lucide-react';
import { Wordmark } from '../components/Logo';
import { Button } from '../components/ui';
import { useSettings } from '../store/settings';

const layers = [
  { n: 1, t: 'Capture', s: 'live, in-app only', icon: ScanLine },
  { n: 2, t: 'Trust', s: 'attestation & challenges', icon: ShieldCheck },
  { n: 3, t: 'Identity', s: 'bound to state records', icon: Link2 },
  { n: 4, t: 'Measure', s: 'ranges with confidence', icon: Ruler },
  { n: 5, t: 'Reconcile', s: 'data you can’t stage', icon: GitCompare },
  { n: 6, t: 'Lifecycle', s: 'monitor, recover, reuse', icon: RefreshCw },
];

export default function Landing() {
  const nav = useNavigate();
  const openSettings = useSettings((s) => s.openSettings);

  return (
    <div className="min-h-full bg-navy text-white">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-5 pb-8 pt-[max(env(safe-area-inset-top),20px)]">
        <header className="flex items-center justify-between py-3">
          <Wordmark light />
          <button
            onClick={() => openSettings(true)}
            className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        <main className="flex flex-1 flex-col justify-center py-10 md:py-16">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-light">
            Lending infrastructure for Indian NBFCs
          </div>
          <h1 className="max-w-2xl font-serif text-[34px] font-semibold leading-[1.12] text-white md:text-5xl">
            Get a loan without the paperwork runaround — your phone does the inspection.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-base">
            A live, sealed capture of your shop, property or vehicle — bound to government records and measured as honest ranges. No
            field visit to wait for.
          </p>

          <div className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row [&>button]:whitespace-nowrap">
            <Button size="lg" block icon={<Smartphone className="h-5 w-5" />} onClick={() => nav('/b')}>
              I’m a borrower
            </Button>
            <Button
              size="lg"
              variant="glass"
              block
              icon={<LayoutDashboard className="h-5 w-5" />}
              onClick={() => nav('/lender')}
            >
              Lender console (demo)
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
            {layers.map((l, i) => (
              <div
                key={l.n}
                className="animate-fadeUp rounded-xl border border-teal-light/25 bg-white/[0.04] p-3"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <l.icon className="mb-2 h-4 w-4 text-teal-light" />
                <div className="text-[13px] font-semibold">
                  {l.n} · {l.t}
                </div>
                <div className="text-[11px] text-white/55">{l.s}</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 rounded-lg bg-white/[0.06] px-3 py-2 text-center text-[11px] text-white/60">
            Immutable evidence store · hash-chained media · every number links to a frame or a signed record
          </div>

          <a
            href={`${import.meta.env.BASE_URL}house_model.html`}
            className="group mt-6 flex items-center gap-3 self-start rounded-xl border border-teal-light/25 bg-white/[0.04] px-4 py-3 transition hover:border-teal-light/60 hover:bg-white/[0.08]"
          >
            <Box className="h-5 w-5 shrink-0 text-teal-light" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-light">Showcase</div>
              <div className="text-[14px] font-semibold">House model — 3D walkaround reconstruction</div>
            </div>
            <ArrowRight className="ml-2 h-4 w-4 text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white" />
          </a>
        </main>

        <footer className="text-center text-[11px] text-white/40">
          Prototype for demonstration · all names, records and results are fictitious · nothing leaves your browser
        </footer>
      </div>
    </div>
  );
}
