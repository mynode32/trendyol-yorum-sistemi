import { jsonError } from "./errors";

/**
 * Cookie ile çalışan admin uçlarında cross-site istekleri reddeder. Origin
 * header'ı tarayıcı tarafından konur; API yalnızca kendi admin arayüzü için
 * olduğundan header'sız yazma isteklerini de bilerek kabul etmeyiz.
 */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return jsonError("INVALID_ORIGIN", "İsteğin kaynağı doğrulanamadı", 403);
  }

  try {
    if (new URL(origin).origin !== new URL(request.url).origin) {
      return jsonError("INVALID_ORIGIN", "Bu işlem yalnızca yönetim panelinden yapılabilir", 403);
    }
  } catch {
    return jsonError("INVALID_ORIGIN", "İsteğin kaynağı doğrulanamadı", 403);
  }

  return null;
}
