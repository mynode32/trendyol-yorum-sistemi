"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin/products");
    } else {
      setError("Şifre hatalı");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Admin Girişi</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Şifre"
      />
      <button type="submit">Giriş Yap</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
