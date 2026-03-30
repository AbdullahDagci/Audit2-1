"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">Hata</h1>
        <p className="text-xl text-gray-600 mb-6">Bir şeyler yanlış gitti</p>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          {error.message || "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."}
        </p>
        <button
          onClick={() => reset()}
          className="inline-block bg-primary-800 hover:bg-primary-900 text-white font-medium px-6 py-3 rounded-lg transition"
        >
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
