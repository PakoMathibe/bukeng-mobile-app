// Add to app/api/transactions/route.ts before creating transaction
import { FraudService } from '@/domains/fraud/fraudService';
import { DeviceFingerprinter } from '@/modules/FraudDetector/deviceFingerprint';

// Inside POST handler, after validation:
const deviceFingerprint = await DeviceFingerprinter.generate();
const fraudCheck = await FraudService.assessTransactionRisk(
  { id: user.id, email: user.email, ...user },
  { amount: validated.total_amount },
  deviceFingerprint
);

if (fraudCheck.isFraudulent) {
  await supabaseAdmin.from('fraud_logs').insert({
    user_id: user.id,
    risk_score: fraudCheck.riskScore,
    reason: fraudCheck.flags.join(', '),
    device_info: deviceFingerprint,
  });

  return NextResponse.json(
    { error: 'Transaction blocked for security review' },
    { status: 403 }
  );
}
