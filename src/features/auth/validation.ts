import type { Role } from '@/types';

export interface CredentialsInput {
  email: string;
  password: string;
}

export interface RegistrationCredentialsInput extends CredentialsInput {
  passwordConfirmation: string;
}

export interface RegistrationProfileInput {
  name: string;
  studentNumber: string;
  requestedRole: Role;
}

export function validateCredentials({ email, password }: CredentialsInput): string | null {
  if (!email.trim()) return 'Email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) return 'Masukkan alamat email yang valid.';
  if (!password) return 'Kata sandi wajib diisi.';
  return null;
}

export function validateRegistration(input: RegistrationCredentialsInput): string | null {
  const credentialsError = validateCredentials(input);
  if (credentialsError) return credentialsError;
  if (!input.passwordConfirmation) return 'Konfirmasi kata sandi wajib diisi.';
  if (input.password !== input.passwordConfirmation) return 'Konfirmasi kata sandi tidak cocok.';
  return null;
}

export function validateProfile({ name, studentNumber, requestedRole }: RegistrationProfileInput): string | null {
  if (!name.trim()) return 'Nama lengkap wajib diisi.';
  if (requestedRole !== 'student' && requestedRole !== 'assistant') return 'Pilih jenis akun yang valid.';
  if (!studentNumber.trim()) return 'NIM wajib diisi untuk semua jenis akun.';
  return null;
}
