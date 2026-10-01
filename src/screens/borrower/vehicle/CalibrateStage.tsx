import { useState } from 'react';
import { Check, ChevronRight, Crosshair, Info } from 'lucide-react';
import { BottomBar, Button, Callout, Card, Chip } from '../../../components/ui';
import { CalibrationEditor, CalibrationResult } from '../../../components/vehicle/CalibrationEditor';
import { useTemplates } from '../../../components/vehicle/templates';
import { ANGLE_LABELS, PART_SOURCES } from '../../../data/vehicles';
import { useBlobUrl } from '../../../lib/useBlobUrl';
import { blobs } from '../../../lib/storage';
import { useCaptures } from '../../../store/captures';
import type { VehicleKind } from '../../../store/application';
import type { Calibration } from './state';

const MIN_PARTS = 3;

function sourceCaptureId(src: (typeof PART_SOURCES)['car'][number], angleCaps: Record<string, string>, closeCaps: Record<string, string>) {
  if (src.closeup === 'plate') return closeCaps.plate;
  if (src.closeup === 'chassis') return closeCaps['chassis-c'];
  return angleCaps[`angle-${src.angle}`];
}

function PartRow({ templateId, label, captureId, sourceLabel, cal, onOpen }: { templateId: string; label: string; captureId?: string; sourceLabel: string; cal?: Calibration; onOpen: () => void }) {
  const blobId = useCaptures((s) => s.items.find((c) => c.id === captureId)?.blobId);
  const photo = useBlobUrl(blobId);
  const rect = useBlobUrl(cal?.rectBlobId);
  return (
    <button onClick={onOpen} disabled={!captureId} className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:opacity-50" data-part={templateId}>
      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-200">
        {(rect ?? photo) && <img src={rect ?? photo!} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-navy">{label}</div>
        <div className="text-[11px] text-ink-faint">
          From: {sourceLabel}
          {cal?.pxPerMm ? ` · ${cal.pxPerMm.toFixed(2)} px/mm` : ''}
        </div>
      </div>
      {cal ? (
        <Chip tone="teal" icon={<Check className="h-3 w-3" />}>
          Calibrated
        </Chip>
      ) : (
        <ChevronRight className="h-5 w-5 text-ink-faint" />
      )}
    </button>
  );
}

export function CalibrateStage({
  appId,
  kind,
  angleCaps,
  closeCaps,
  calibrations,
  onSaved,
  onNext,
}: {
  appId: string;
  kind: VehicleKind;
  angleCaps: Record<string, string>;
  closeCaps: Record<string, string>;
  calibrations: Record<string, Calibration>;
  onSaved: (templateId: string, c: Calibration) => void;
  onNext: () => void;
}) {
  const templates = useTemplates();
  const [open, setOpen] = useState<string | null>(null);
  const items = PART_SOURCES[kind];
  const openSrc = items.find((p) => p.templateId === open);
  const openCaptureId = openSrc ? sourceCaptureId(openSrc, angleCaps, closeCaps) : undefined;
  const openBlobId = useCaptures((s) => s.items.find((c) => c.id === openCaptureId)?.blobId);
  const openUrl = useBlobUrl(openBlobId);
  const count = Object.keys(calibrations).length;

  const save = async (r: CalibrationResult) => {
    if (!open || !openCaptureId) return;
    const rectBlobId = `rect_${appId}_${open}`;
    await blobs.put(rectBlobId, r.rectified);
    onSaved(open, { corners: r.corners, captureId: openCaptureId, rectBlobId, pxPerMm: r.pxPerMm, at: Date.now() });
    setOpen(null);
  };

  return (
    <div className="animate-fadeUp">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">Condition layer</div>
      <h1 className="text-[22px] font-semibold leading-tight">Calibrate the panels</h1>
      <p className="mb-4 mt-1 text-sm text-ink-soft">
        For each part, drag four handles onto its corners. We straighten the photo onto a standard template so the same panel can be
        compared at every inspection.
      </p>
      <Card className="mb-4 divide-y divide-line overflow-hidden">
        {templates &&
          items.map((p) => {
            const t = templates[p.templateId];
            const cid = sourceCaptureId(p, angleCaps, closeCaps);
            return (
              <PartRow
                key={p.templateId}
                templateId={p.templateId}
                label={t?.part ?? p.templateId}
                captureId={cid}
                sourceLabel={p.closeup ? (p.closeup === 'plate' ? 'Number plate close-up' : 'Chassis close-up') : ANGLE_LABELS[p.angle!]}
                cal={calibrations[p.templateId]}
                onOpen={() => setOpen(p.templateId)}
              />
            );
          })}
      </Card>
      <Callout tone="teal" icon={<Info className="h-4 w-4 text-teal" />}>
        Calibrate at least {MIN_PARTS} parts to continue — the more you do, the more precise the condition report. The number plate also gives
        us real-world scale.
      </Callout>

      <BottomBar>
        <Button block size="lg" disabled={count < MIN_PARTS} onClick={onNext} icon={<Crosshair className="h-5 w-5" />}>
          {count < MIN_PARTS ? `Calibrate ${MIN_PARTS - count} more` : `Continue with ${count} part${count > 1 ? 's' : ''}`}
        </Button>
      </BottomBar>

      {open && templates && openUrl && (
        <CalibrationEditor
          imageUrl={openUrl}
          template={templates[open]}
          initial={calibrations[open]?.corners}
          onSave={save}
          onCancel={() => setOpen(null)}
        />
      )}
    </div>
  );
}
