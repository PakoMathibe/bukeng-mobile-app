// types/user.ts
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  fullName: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditProfile {
  id: string;
  userId: string;
  creditScore: number | null;
  creditLimit: number | null;
  availableCredit: number | null;
  riskLevel: string | null;
  updatedAt: Date;
}

export interface UserWithCredit extends User {
  creditProfile: CreditProfile | null;
}