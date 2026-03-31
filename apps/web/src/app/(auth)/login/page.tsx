"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login(email, password);
      setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      document.cookie = "auth-session=true; path=/";
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Giriş başarısız. Email ve şifrenizi kontrol edin.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
      <div className="w-full max-w-md px-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-float border border-white/20 p-10">
          <div className="text-center mb-10">
            <img src="/logo-transparent.png" alt="ERTANSA" className="h-20 w-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-primary-900 tracking-tight">
              ERTANSA
            </h1>
            <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest">
              Denetim Sistemi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                E-posta Adresi
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-ios"
                placeholder="ornek@ertansa.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-ios"
                placeholder="********"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            ERTANSA Denetim Yonetim Sistemi
          </p>
        </div>
      </div>
    </div>
  );
}
