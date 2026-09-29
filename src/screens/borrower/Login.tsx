import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { BorrowerPage } from './BorrowerLayout';
import { BottomBar, Button, TextField } from '../../components/ui';
import { DEMO_OTP, useAuth } from '../../store/auth';
import { useProfileStore } from '../../store/profile';
import { digits, v } from '../../lib/validate';

export default function Login() {
  const nav = useNavigate();
  const { login, registered } = useAuth();
  const byMobile = useProfileStore((s) => s.byMobile);
  const [stage, setStage] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const known = registered.includes(mobile);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(resendIn - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const sendOtp = () => {
    const e = v.mobile(mobile);
    setErr(e);
    if (e) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStage('otp');
      setResendIn(30);
    }, 700);
  };

  const verify = () => {
    if (otp !== DEMO_OTP) {
      setErr('Incorrect OTP. In this demo the OTP is always 123456.');
      return;
    }
    login(mobile);
    const p = byMobile[mobile];
    nav(p?.complete ? '/b' : '/b/onboarding', { replace: true });
  };

  return (
    <BorrowerPage title={stage === 'mobile' ? 'Sign up or log in' : 'Verify your number'} onBack={stage === 'otp' ? () => setStage('mobile') : () => nav('/')}>
      <div className="animate-fadeUp">
        {stage === 'mobile' ? (
          <>
            <h1 className="mb-1 text-[26px] font-semibold leading-tight">Welcome</h1>
            <p className="mb-6 text-sm text-ink-soft">
              Enter your mobile number. New here? We’ll create your account. Already applied? You’ll pick up where you left off.
            </p>
            <TextField
              label="Mobile number"
              prefix="+91"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={mobile}
              onChange={(s) => {
                setMobile(digits(s, 10));
                setErr(null);
              }}
              error={err}
              onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              autoFocus
            />
          </>
        ) : (
          <>
            <h1 className="mb-1 text-[26px] font-semibold leading-tight">Enter the OTP</h1>
            <p className="mb-6 text-sm text-ink-soft">
              Sent to +91 {mobile.slice(0, 5)} {mobile.slice(5)}.{' '}
              {known ? 'Welcome back.' : 'We’ll set up your profile next.'}
            </p>
            <TextField
              autoFocus
              label="6-digit OTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="field-input text-center font-mono text-xl tracking-[0.5em]"
              value={otp}
              onChange={(s) => {
                setOtp(digits(s, 6));
                setErr(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              error={err}
            />
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-ember-tint px-3.5 py-2.5 text-sm text-ember">
              <MessageSquareText className="h-4 w-4 shrink-0" />
              <span>
                Demo hint: the OTP is always <b className="font-mono">123456</b>
              </span>
            </div>
            <button
              disabled={resendIn > 0}
              onClick={() => setResendIn(30)}
              className="text-sm font-medium text-teal disabled:text-ink-faint"
            >
              {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
            </button>
          </>
        )}
      </div>
      <BottomBar>
        {stage === 'mobile' ? (
          <Button block size="lg" onClick={sendOtp} loading={sending} disabled={mobile.length !== 10}>
            Get OTP
          </Button>
        ) : (
          <Button block size="lg" onClick={verify} disabled={otp.length !== 6}>
            Verify and continue
          </Button>
        )}
        <p className="mt-2 text-center text-[11px] text-ink-faint">By continuing you agree to receive an OTP. No SMS is sent in this demo.</p>
      </BottomBar>
    </BorrowerPage>
  );
}
