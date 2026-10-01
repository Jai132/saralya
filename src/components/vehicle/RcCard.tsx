import { ShieldCheck, FileBadge2 } from 'lucide-react';
import { Card, KV, SimChip, SourceBadge } from '../ui';
import type { RcRecord } from '../../data/vehicles';
import { formatReg } from '../../data/vehicles';

/** The DigiLocker-style signed RC record. */
export function RcCard({ rc, cv }: { rc: RcRecord; cv: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <FileBadge2 className="h-5 w-5 text-teal-light" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/60">Registration certificate</div>
            <div className="font-mono text-lg font-bold tracking-wider">{formatReg(rc.regNo)}</div>
          </div>
        </div>
        <SourceBadge kind="signed" />
      </div>
      <div className="divide-y divide-line px-4">
        <KV k="Owner" v={rc.ownerMasked} />
        <KV k="Make / model" v={`${rc.make} ${rc.model}`} />
        <KV k="Variant · year" v={`${rc.variant} · ${rc.year}`} />
        <KV k="Body type" v={rc.bodyType} />
        <KV k="Fuel · colour" v={`${rc.fuel} · ${rc.colour}`} />
        <KV k="Chassis no." v={rc.chassisMasked} mono />
        <KV k="Engine no." v={rc.engineMasked} mono />
        <KV k="Registering authority" v={rc.registeredAt} />
        <KV
          k="Hypothecation (VAHAN)"
          v={
            <span className="inline-flex items-center gap-1 text-teal">
              <ShieldCheck className="h-3.5 w-3.5" /> {rc.hypothecation}
            </span>
          }
        />
        <KV k="Prior charges" v={rc.priorCharges} />
        <KV k="Insurance valid until" v={rc.insuranceUpto} />
        {cv && (
          <>
            <KV k="Fitness valid until" v={rc.fitnessUpto} />
            <KV k="Permit" v={`${rc.permitType} · until ${rc.permitUpto}`} />
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-slate-50 px-4 py-2 text-[11px] text-ink-soft">
        <span>DigiLocker signature valid · pulled just now</span>
        <SimChip />
      </div>
    </Card>
  );
}
