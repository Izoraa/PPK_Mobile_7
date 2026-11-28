import type { PaymentAttemptStatus } from './paymentStatusService';

export const paymentAttemptStatusLabels: Record<PaymentAttemptStatus, string> = {
  pending: 'Menunggu pembayaran',
  success: 'Berhasil',
  failed: 'Gagal atau kedaluwarsa',
};

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount);
}
