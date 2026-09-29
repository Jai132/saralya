import { Navigate, useNavigate } from 'react-router-dom';
import { Camera, FileText } from 'lucide-react';
import { BorrowerPage } from './BorrowerLayout';
import { Button, Card, KV, Stepper } from '../../components/ui';
import { useMe } from '../../store/useMe';
import { PRODUCTS } from '../../data/products';
import { dateIN, lakh } from '../../lib/format';

const TRACK = ['Submitted', 'Evidence verified', 'Under credit review', 'Sanctioned'];
const STATUS_INDEX = { draft: -1, submitted: 0, evidence: 1, review: 2, sanctioned: 3 } as const;

export default function Home() {
  const nav = useNavigate();
  const me = useMe();
  if (!me.mobile) return <Navigate to="/b/login" replace />;
  if (!me.app) return <Navigate to="/b/loan" replace />;
  const app = me.app;
  const meta = PRODUCTS[app.product];

  return (
    <BorrowerPage title="My application">
      <h1 className="mb-1 text-[24px] font-semibold">Namaste, {me.profile.fullName.split(' ')[0] || 'there'}</h1>
      <p className="mb-5 text-sm text-ink-soft">Here’s where your application stands.</p>

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="font-serif text-lg font-semibold text-navy">{meta.title}</div>
            <div className="text-xs text-ink-faint">
              {app.id} · started {dateIN(app.createdAt)}
            </div>
          </div>
          <FileText className="h-5 w-5 text-teal" />
        </div>
        <KV k="Amount requested" v={lakh(app.amount)} />
        <KV k="Tenure" v={`${app.tenureMonths} months`} />
        <KV k="Purpose" v={app.purpose} />
        <div className="mt-4">
          <Stepper steps={TRACK} current={STATUS_INDEX[app.status] + 1} />
        </div>
      </Card>

      {app.status === 'draft' && (
        <Card className="border-teal/30 bg-teal-tint p-4">
          <div className="mb-1 font-semibold text-navy">Inspection pending</div>
          <p className="mb-3 text-sm text-ink-soft">{meta.inspection}. It takes a few minutes and replaces the field visit.</p>
          <Button block onClick={() => nav('/b/loan')} icon={<Camera className="h-4 w-4" />}>
            Continue to inspection
          </Button>
        </Card>
      )}
    </BorrowerPage>
  );
}
