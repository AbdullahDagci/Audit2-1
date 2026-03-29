"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { date: "Oca", score: 72 },
  { date: "Sub", score: 74 },
  { date: "Mar", score: 71 },
  { date: "Nis", score: 76 },
  { date: "May", score: 78 },
  { date: "Haz", score: 75 },
  { date: "Tem", score: 80 },
  { date: "Agu", score: 79 },
  { date: "Eyl", score: 82 },
  { date: "Eki", score: 81 },
  { date: "Kas", score: 84 },
  { date: "Ara", score: 78.5 },
];

export default function TrendChart() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Puan Trendi
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis domain={[60, 100]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [`${value} puan`, "Ortalama Puan"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#2E7D32"
              strokeWidth={2}
              dot={{ fill: "#2E7D32", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
