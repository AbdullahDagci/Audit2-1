"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BranchData {
  name: string;
  score: number;
}

interface BranchPerformanceProps {
  branches: BranchData[];
}

export default function BranchPerformance({ branches }: BranchPerformanceProps) {
  if (!branches || branches.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Sube Performansi
        </h3>
        <p className="text-sm text-gray-500 text-center py-10">
          Henuz sube verisi bulunmuyor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
        Sube Performansi
      </h3>
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={branches} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            {/* @ts-ignore */}
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            {/* @ts-ignore */}
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            {/* @ts-ignore */}
            <Tooltip
              formatter={(value: number) => [`${value} puan`, "Puan"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="score" fill="#2E7D32" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
