import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">Sayfa bulunamadı</p>
        <p className="text-gray-500 mb-8">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link
          href="/dashboard"
          className="inline-block bg-primary-800 hover:bg-primary-900 text-white font-medium px-6 py-3 rounded-lg transition"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
