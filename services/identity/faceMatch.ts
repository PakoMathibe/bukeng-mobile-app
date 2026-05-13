// services/identity/faceMatch.ts
export interface FaceMatchResult {
  isMatch: boolean;
  similarity: number;
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export class FaceMatchService {
  static async match(
    selfieBase64: string,
    idPhotoBase64: string
  ): Promise<FaceMatchResult> {
    // In production, integrate with facial recognition API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock result
    const similarity = 0.92;

    return {
      isMatch: similarity > 0.7,
      similarity,
      thresholds: {
        low: 0.5,
        medium: 0.7,
        high: 0.85,
      },
    };
  }

  static async getLivenessCheck(selfieVideo: Blob): Promise<{
    isAlive: boolean;
    confidence: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return {
      isAlive: true,
      confidence: 0.98,
    };
  }
}
