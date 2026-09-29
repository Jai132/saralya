/** Dummy IFSC lookup keyed by the 4-letter bank prefix. Branch names are fictitious. */
export const BANKS: Record<string, { bank: string; branches: string[] }> = {
  SBIN: { bank: 'State Bank of India', branches: ['Main Branch', 'Civil Lines', 'Station Road', 'Market Yard'] },
  HDFC: { bank: 'HDFC Bank', branches: ['MG Road', 'Sadar Bazaar', 'Ring Road', 'Gandhi Chowk'] },
  ICIC: { bank: 'ICICI Bank', branches: ['Nehru Place', 'Tilak Nagar', 'Mall Road', 'Bus Stand Road'] },
  UTIB: { bank: 'Axis Bank', branches: ['Collectorate Road', 'Shastri Nagar', 'Old City', 'Industrial Area'] },
  PUNB: { bank: 'Punjab National Bank', branches: ['Ghanta Ghar', 'Kutchery Road', 'Subhash Marg', 'Grain Market'] },
  BARB: { bank: 'Bank of Baroda', branches: ['Raopura', 'Station Road', 'Nagar Palika', 'Transport Nagar'] },
  CNRB: { bank: 'Canara Bank', branches: ['Gandhi Bazaar', 'Temple Street', 'Town Hall', 'KR Circle'] },
  UBIN: { bank: 'Union Bank of India', branches: ['Main Road', 'Court Road', 'Sector 4', 'Kasba Peth'] },
  KKBK: { bank: 'Kotak Mahindra Bank', branches: ['Link Road', 'Park Street', 'Camp', 'Anna Salai'] },
  IDIB: { bank: 'Indian Bank', branches: ['Mount Road', 'T Nagar', 'Big Bazaar Street', 'Fort'] },
  BKID: { bank: 'Bank of India', branches: ['Fort', 'Sitabuldi', 'Ashok Rajpath', 'Raja Park'] },
  MAHB: { bank: 'Bank of Maharashtra', branches: ['Deccan Gymkhana', 'Shivaji Nagar', 'Sadar', 'Rajwada'] },
};

export function lookupIfsc(ifsc: string): { bank: string; branch: string } | null {
  const b = BANKS[ifsc.slice(0, 4).toUpperCase()];
  if (!b || ifsc.length !== 11) return null;
  // Deterministic branch pick from the branch code so the same IFSC always returns the same branch.
  const code = ifsc.slice(5);
  let h = 0;
  for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { bank: b.bank, branch: b.branches[h % b.branches.length] };
}
