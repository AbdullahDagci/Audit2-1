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

interface BranchComparisonProps {
  branches: BranchData[];
}

export default function BranchComparison({ branches }: BranchComparisonProps) {
  if (branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Karşılaştırılacak şube verisi bulunamadı.
      </div>
    );
  }

  const sorted = [...branches].sort((a, b) => b.score - a.score);

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={90}
          />
          <Tooltip
            formatter={(value: number) => [`${value} puan`, "Puan"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="score" fill="#2E7D32" radius={[0, 4, 4, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
