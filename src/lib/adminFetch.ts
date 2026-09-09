function redirectToLogin(): void {
  // Bu düz bir kütüphane fonksiyonu (React bileşeni değil), useRouter() kullanamaz.
  // Tam sayfa yönlendirmesi ayrıca oturum süresi dolduğunda tüm React state'ini
  // sıfırlaması bakımından burada tercih edilir.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/admin/login";
}

/** Admin panel sayfalarının fetch çağrıları için: oturum süresi dolduğunda (401)
 * kırık bir sayfa göstermek yerine login'e yönlendirir. */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  onUnauthorized: () => void = redirectToLogin
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) {
    onUnauthorized();
  }
  return response;
}
