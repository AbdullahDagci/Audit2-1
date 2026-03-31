"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface TrendDataPoint {
  month: string;
  genel: number;
}

interface TrendAnalysisProps {
  data: TrendDataPoint[];
}

export default function TrendAnalysis({ data }: TrendAnalysisProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64 text-gray-500">
        Trend analizi icin yeterli veri bulunmuyor. En az 2 aylik denetim verisi gereklidir.
      </div>
    );
  }

  return (
    <div className="h-64 sm:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          {/* @ts-ignore */}
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          {/* @ts-ignore */}
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          {/* @ts-ignore */}
          <Tooltip
            formatter={(value: number) => [`${value} puan`, "Ortalama Puan"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
          {/* @ts-ignore */}
          <Legend />
          <Line
            type="monotone"
            dataKey="genel"
            name="Genel Ortalama"
            stroke="#2E7D32"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
