"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoGalleryProps {
  photos: string[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            className="aspect-square bg-gray-200 rounded-lg overflow-hidden hover:opacity-80 transition-opacity flex items-center justify-center text-gray-400 text-xs"
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-gray-500 text-xs font-medium">
                Foto {idx + 1}
              </span>
            </div>
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X size={28} />
          </button>
          {selectedIndex > 0 && (
            <button
              onClick={() => setSelectedIndex(selectedIndex - 1)}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={36} />
            </button>
          )}
          {selectedIndex < photos.length - 1 && (
            <button
              onClick={() => setSelectedIndex(selectedIndex + 1)}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors"
            >
              <ChevronRight size={36} />
            </button>
          )}
          <div className="max-w-3xl w-full mx-4 aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center">
            <span className="text-gray-400 text-lg">
              Foto {selectedIndex + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
