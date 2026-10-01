import { useState } from 'react';
import { Layers, Send } from 'lucide-react';
import { BottomBar, Button, Callout, Card, Chip, SimChip } from '../../../components/ui';
import { RectifiedPanel } from '../../../components/vehicle/RectifiedPanel';
import { VehicleDiagram } from '../../../components/vehicle/VehicleDiagram';
import { PartTemplate, useTemplates } from '../../../components/vehicle/templates';
import { DAMAGE, PART_SOURCES, SEVERITY_COLOR } from '../../../data/vehicles';
import { useBlobUrl } from '../../../lib/useBlobUrl';
import type { VehicleKind } from '../../../store/application';
import type { Calibration } from './state';

const TYPE_LABEL = { dent: 'Dent', scratch: 'Scratch', crack: 'Crack', rust: 'Rust', repaint: 'Repaint', chip: 'Chips' };

function Panel({ t, cal, selected, onSelect }: { t: PartTemplate; cal?: Calibration; selected: boolean; onSelect: () => void }) {
  const url = useBlobUrl(cal?.rectBlobId);
  const marks = DAMAGE[t.id] ?? [];
  return (
    <button onClick={onSelect} className={`rounded-xl border bg-white p-2 text-left transition ${selected ? 'border-teal ring-2 ring-teal/20' : 'border-line'}`}>
      <RectifiedPanel template={t} imageUrl={url} marks={marks} />
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="truncate text-[12px] font-medium text-navy">{t.part}</span>
        {marks.length ? <span className="text-[10px] text-ember">{marks.length} note{marks.length > 1 ? 's' : ''}</span> : <span className="text-[10px] text-teal">clean</span>}
      </div>
      {!t.planar && <div className="text-[9px] text-ink-faint">curved · approximate</div>}
    </button>
  );
}

export function ConditionStage({ kind, calibrations, onSubmit }: { kind: VehicleKind; calibrations: Record<string, Calibration>; onSubmit: () => void }) {
  const templates = useTemplates();
  const parts = PART_SOURCES[kind].filter((p) => !p.closeup).map((p) => p.templateId);
  const [sel, setSel] = useState<string>(parts.find((p) => DAMAGE[p]?.length) ?? parts[0]);
  const marks = DAMAGE[sel] ?? [];
  const selT = templates?.[sel];
  const selUrl = useBlobUrl(calibrations[sel]?.rectBlobId);

  return (
    <div className="animate-fadeUp space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Condition</div>
        <h1 className="text-[22px] font-semibold leading-tight">Condition notes</h1>
        <p className="mt-1 text-sm text-ink-soft">What we noted on each panel, mapped onto standard templates. Your officer reviews these with you.</p>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-navy">Whole vehicle</div>
          <SimChip />
        </div>
        <VehicleDiagram kind={kind} selected={sel} onSelect={setSel} />
      </Card>

      {selT && (
        <Card className="p-4">
          <div className="mb-2 font-semibold text-navy">{selT.part}</div>
          <RectifiedPanel template={selT} imageUrl={selUrl} marks={marks} />
          {marks.length ? (
            <ol className="mt-3 space-y-2">
              {marks.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: SEVERITY_COLOR[m.severity] }}>
                    {i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium text-navy">{TYPE_LABEL[m.type]}</span> · {m.zone}
                    <span className="block text-xs text-ink-soft">{m.note}</span>
                  </span>
                  <Chip tone={m.severity === 'minor' ? 'amber' : m.severity === 'moderate' ? 'ember' : 'red'}>{m.severity}</Chip>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-teal">No findings on this panel.</p>
          )}
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
          <Layers className="h-4 w-4 text-teal" /> Rectified panels
        </div>
        <div className="grid grid-cols-2 gap-2">
          {templates && parts.map((p) => templates[p] && <Panel key={p} t={templates[p]} cal={calibrations[p]} selected={sel === p} onSelect={() => setSel(p)} />)}
        </div>
      </div>

      <Callout tone="navy" title="Why templates matter">
        Every note sits in the panel’s own coordinates, not the photo’s — so the same door can be compared across valuers and over time
        (today vs a month-12 re-capture vs any future inspection). It settles “was that damage already there?” without argument.
      </Callout>

      <BottomBar>
        <Button block size="lg" onClick={onSubmit} icon={<Send className="h-5 w-5" />}>
          Submit inspection
        </Button>
      </BottomBar>
    </div>
  );
}
