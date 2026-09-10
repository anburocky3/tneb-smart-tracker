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

export default function BillChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <p>No billing data available.</p>;

  return (
    <div className="w-full h-80 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e5e7eb"
          />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />

          <YAxis
            yAxisId="left"
            stroke="#3b82f6"
            fontSize={12}
            label={{
              value: "Units (kWh)",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#3b82f6" },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10b981"
            fontSize={12}
            label={{
              value: "Amount (₹)",
              angle: 90,
              position: "insideRight",
              style: { fill: "#10b981" },
            }}
          />

          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="units"
            name="Units Consumed"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="amount"
            name="Bill Amount (₹)"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
