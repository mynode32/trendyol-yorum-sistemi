import bcrypt from "bcryptjs";

// 2026 için çevrimiçi yönetim panelinde kabul edilebilir maliyet. Yeni hash'ler
// daha pahalı üretilir; bcrypt eski hash'leri de doğrulamaya devam eder.
const SALT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
