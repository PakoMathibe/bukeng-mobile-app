// modules/CreditEngine/scoreUser.ts
import { User, OnboardingProgress } from '@/types/user';

export interface CreditScoreResult {
  score: number;
  tier: number;
  limit: number;
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  factors: CreditFactor[];
}

export interface CreditFactor {
  name: string;
  score: number;
  maxScore: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export class CreditScoreEngine {
  static calculate(user: Partial<User>, progress: OnboardingProgress): CreditScoreResult {
    let score = 300; // Base score
    const factors: CreditFactor[] = [];
    
    // Factor 1: Verification Status (max 200 points)
    let verificationScore = 0;
    if (progress.emailVerified) verificationScore += 30;
    if (progress.phoneVerified) verificationScore += 30;
    if (progress.idVerified) verificationScore += 50;
    if (progress.selfieVerified) verificationScore += 40;
    if (progress.bankUploaded) verificationScore += 50;
    
    score += verificationScore;
    factors.push({
      name: 'Identity Verification',
      score: verificationScore,
      maxScore: 200,
      impact: verificationScore > 100 ? 'positive' : verificationScore > 50 ? 'neutral' : 'negative',
    });
    
    // Factor 2: Account Age (max 100 points)
    const accountAgeDays = user.createdAt 
      ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 0;
    const ageScore = Math.min(accountAgeDays * 2, 100);
    score += ageScore;
    factors.push({
      name: 'Account Age',
      score: ageScore,
      maxScore: 100,
      impact: accountAgeDays > 30 ? 'positive' : accountAgeDays > 7 ? 'neutral' : 'negative',
    });
    
    // Factor 3: Payment History (would come from database)
    // For now, assume perfect history for demo
    const paymentScore = 100;
    score += paymentScore;
    factors.push({
      name: 'Payment History',
      score: paymentScore,
      maxScore: 100,
      impact: 'positive',
    });
    
    // Determine tier and limit based on score
    let tier: number;
    let limit: number;
    let rating: CreditScoreResult['rating'];
    
    if (score >= 700) {
      tier = 3;
      limit = 5000;
      rating = 'excellent';
    } else if (score >= 550) {
      tier = 2;
      limit = 1500;
      rating = 'good';
    } else if (score >= 400) {
      tier = 1;
      limit = 500;
      rating = 'fair';
    } else {
      tier = 0;
      limit = 0;
      rating = 'poor';
    }
    
    return { score, tier, limit, rating, factors };
  }
}