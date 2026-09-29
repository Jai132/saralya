import { useAuth } from './auth';
import { emptyProfile, useProfileStore, Profile } from './profile';
import { useApplications } from './application';

/** Convenience hook for the signed-in borrower's profile and application. */
export function useMe() {
  const mobile = useAuth((s) => s.mobile);
  const entry = useProfileStore((s) => (mobile ? s.byMobile[mobile] : undefined));
  const update = useProfileStore((s) => s.update);
  const setStepRaw = useProfileStore((s) => s.setStep);
  const completeRaw = useProfileStore((s) => s.complete);
  const app = useApplications((s) => (mobile ? s.byMobile[mobile] : undefined));

  return {
    mobile,
    profile: entry?.profile ?? emptyProfile,
    step: entry?.step ?? 0,
    onboarded: entry?.complete ?? false,
    app,
    patch: (p: Partial<Profile>) => mobile && update(mobile, p),
    setStep: (n: number) => mobile && setStepRaw(mobile, n),
    completeOnboarding: () => mobile && completeRaw(mobile),
  };
}
