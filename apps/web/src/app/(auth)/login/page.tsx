"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      const role = data.user?.role || "inspector";
      document.cookie = "auth-session=true; path=/; SameSite=Lax; max-age=604800";
      document.cookie = `user-role=${role}; path=/; SameSite=Lax; max-age=604800`;
      if (role === "manager") router.push("/dashboard/manager");
      else if (role === "inspector") router.push("/dashboard/inspections");
      else router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Giriş başarısız. Email ve şifrenizi kontrol edin.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Sol: Yeşil gradient panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-green-900 via-green-800 to-green-700 relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Dekoratif daireler */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-10 w-24 h-24 rounded-full bg-white/[0.03]" />

        <div className="relative z-10 text-center">
          <div className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-8">
            <img src="/logo-transparent.png" alt="ERTANSA" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-wider mb-3">ERTANSA</h1>
          <p className="text-green-200 text-base font-medium mb-6">Denetim Yönetim Sistemi</p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full">
            <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-200 text-sm font-semibold">Kalite & Gıda Güvenliği</span>
          </div>

          <div className="mt-12 space-y-4 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
              </div>
              <span className="text-sm">Tesis denetimlerini dijital olarak yönetin</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd"/></svg>
              </div>
              <span className="text-sm">Anlık raporlar ve performans takibi</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              </div>
              <span className="text-sm">Düzeltici faaliyet ve kanıt yönetimi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ: Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-4 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobil logo - sadece lg altinda gorunur */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <img src="/logo-transparent.png" alt="ERTANSA" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-green-900">ERTANSA</h1>
            <p className="text-sm text-gray-500">Denetim Yönetim Sistemi</p>
          </div>

          {/* Form karti */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Hoş Geldiniz</h2>
              <p className="text-sm text-gray-500 mt-1">Devam etmek için giriş yapın</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* E-posta */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-posta
                </label>
                <div className={`flex items-center gap-2 border rounded-xl px-3 transition-all duration-200 ${
                  focusedField === "email" ? "border-green-600 ring-2 ring-green-100 bg-green-50/30" : "border-gray-200 bg-gray-50/50"
                }`}>
                  <svg className={`w-5 h-5 flex-shrink-0 transition-colors ${focusedField === "email" ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    className="flex-1 bg-transparent py-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
                    placeholder="ornek@ertansa.com"
                  />
                </div>
              </div>

              {/* Şifre */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Şifre
                </label>
                <div className={`flex items-center gap-2 border rounded-xl px-3 transition-all duration-200 ${
                  focusedField === "password" ? "border-green-600 ring-2 ring-green-100 bg-green-50/30" : "border-gray-200 bg-gray-50/50"
                }`}>
                  <svg className={`w-5 h-5 flex-shrink-0 transition-colors ${focusedField === "password" ? "text-green-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    className="flex-1 bg-transparent py-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Giriş butonu */}
              <button
                type="submit"
                disabled={loading || !email.trim() || !password.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-800 text-white font-semibold py-3 rounded-xl hover:from-green-800 hover:to-green-900 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                    <span>Giriş Yap</span>
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-300">Güvenli bağlantı ile korunmaktadır</span>
          </div>
        </div>
      </div>
    </div>
  );
}
