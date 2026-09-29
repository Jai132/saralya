import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LS_PREFIX } from '../lib/storage';

export type Occupation = 'business' | 'professional' | 'salaried';

export interface Profile {
  // Personal
  fullName: string;
  dob: string;
  gender: string;
  pan: string;
  aadhaarLast4: string;
  aadhaarVerified: boolean;
  email: string;
  address: string;
  pin: string;
  city: string;
  state: string;
  residenceType: string;
  yearsAtAddress: string;
  // Occupation & income
  occupation: Occupation | '';
  monthlyIncome: string;
  existingEmi: string;
  dependants: string;
  // Business
  businessName: string;
  constitution: string;
  udyam: string;
  gstin: string;
  gstNotRegistered: boolean;
  industry: string;
  businessAddressSame: boolean;
  businessAddress: string;
  vintage: string;
  turnoverBand: string;
  // Bank
  accountHolder: string;
  accountNumber: string;
  accountNumberConfirm: string;
  ifsc: string;
  bankName: string;
  branch: string;
  accountType: string;
  pennyDropVerified: boolean;
  // Consents
  consents: Record<string, boolean>;
}

export const emptyProfile: Profile = {
  fullName: '',
  dob: '',
  gender: '',
  pan: '',
  aadhaarLast4: '',
  aadhaarVerified: false,
  email: '',
  address: '',
  pin: '',
  city: '',
  state: '',
  residenceType: '',
  yearsAtAddress: '',
  occupation: '',
  monthlyIncome: '',
  existingEmi: '',
  dependants: '',
  businessName: '',
  constitution: '',
  udyam: '',
  gstin: '',
  gstNotRegistered: false,
  industry: '',
  businessAddressSame: true,
  businessAddress: '',
  vintage: '',
  turnoverBand: '',
  accountHolder: '',
  accountNumber: '',
  accountNumberConfirm: '',
  ifsc: '',
  bankName: '',
  branch: '',
  accountType: '',
  pennyDropVerified: false,
  consents: {},
};

interface ProfileState {
  /** Profiles keyed by mobile number so separate demo logins stay separate. */
  byMobile: Record<string, { profile: Profile; step: number; complete: boolean }>;
  update: (mobile: string, patch: Partial<Profile>) => void;
  setStep: (mobile: string, step: number) => void;
  complete: (mobile: string) => void;
  /** Replace a profile wholesale and mark onboarding complete (demo login). */
  seed: (mobile: string, profile: Profile) => void;
}

const entry = (s: ProfileState, m: string) => s.byMobile[m] ?? { profile: emptyProfile, step: 0, complete: false };

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      byMobile: {},
      update: (m, patch) =>
        set((s) => {
          const e = entry(s, m);
          return { byMobile: { ...s.byMobile, [m]: { ...e, profile: { ...e.profile, ...patch } } } };
        }),
      setStep: (m, step) => set((s) => ({ byMobile: { ...s.byMobile, [m]: { ...entry(s, m), step } } })),
      complete: (m) => set((s) => ({ byMobile: { ...s.byMobile, [m]: { ...entry(s, m), complete: true } } })),
      seed: (m, profile) => set((s) => ({ byMobile: { ...s.byMobile, [m]: { profile, step: 4, complete: true } } })),
    }),
    { name: `${LS_PREFIX}profile` },
  ),
);
