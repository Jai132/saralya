export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export const RESIDENCE_TYPES = [
  { value: 'owned', label: 'Owned' },
  { value: 'rented', label: 'Rented' },
  { value: 'family', label: 'Family-owned' },
];

export const OCCUPATIONS = [
  { value: 'business', label: 'Self-employed business' },
  { value: 'professional', label: 'Self-employed professional' },
  { value: 'salaried', label: 'Salaried' },
] as const;

export const CONSTITUTIONS = ['Proprietorship', 'Partnership', 'LLP', 'Private limited'];

export const INDUSTRIES = [
  'Kirana / general store',
  'Wholesale trading',
  'Garments & textiles',
  'Hardware & building material',
  'Pharmacy',
  'Electronics & mobile',
  'Restaurant / food',
  'Manufacturing (small unit)',
  'Transport / logistics',
  'Services',
  'Other',
];

export const TURNOVER_BANDS = [
  'Up to ₹10 L',
  '₹10 L – ₹40 L',
  '₹40 L – ₹1 Cr',
  '₹1 Cr – ₹5 Cr',
  'Above ₹5 Cr',
];

export const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings' },
  { value: 'current', label: 'Current' },
  { value: 'od', label: 'Overdraft / CC' },
];

export const STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Delhi', 'Gujarat', 'Haryana', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

/** Onboarding consents. All unchecked by default. `required` gates the Continue button. */
export const ONBOARDING_CONSENTS = [
  {
    id: 'bureau',
    label: 'Credit bureau pull',
    sub: 'Fetch your credit report from CIBIL/Experian to assess this application. A soft enquiry for pre-approval.',
    required: true,
  },
  {
    id: 'aa',
    label: 'Account Aggregator: 12 months of bank statements (demo)',
    sub: 'Share statements through an RBI-licensed Account Aggregator, once, for this application. You can revoke it any time.',
    required: false,
  },
  {
    id: 'camera',
    label: 'Camera and location for this inspection session only',
    sub: 'Used only while you run the guided inspection. Access ends when you finish or leave the capture screen.',
    required: true,
  },
  {
    id: 'india',
    label: 'Data stored in India',
    sub: 'Your captures and records are stored on servers located in India (simulated statement in this prototype).',
    required: true,
  },
  {
    id: 'terms',
    label: 'Terms and privacy',
    sub: 'I have read the terms of use and privacy notice, and I confirm the details I entered are true.',
    required: true,
  },
];
