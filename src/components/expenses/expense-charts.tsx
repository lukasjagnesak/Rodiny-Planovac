"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "var(--ink-subtle)" };

/** Vývoj útraty po měsících. */
export function MonthlyTrend({
  data,
  currency,
  highlight,
}: {
  data: { month: string; label: string; total: number }[];
  currency: string;
  highlight: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          width={54}
          tickFormatter={(v: number) => formatMoney(v, currency, true)}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--ink)",
          }}
          formatter={(value) => [formatMoney(Number(value), currency), "Celkem"]}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.month}
              fill={d.month === highlight ? "var(--brand)" : "var(--line-strong)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Rozdělení útraty podle kategorií. */
export function CategoryDonut({
  data,
  currency,
}: {
  data: { name: string; value: number; color: string }[];
  currency: string;
}) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={190}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={80}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            fontSize: 12,
            color: "var(--ink)",
          }}
          formatter={(value, name) => [formatMoney(Number(value), currency), String(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
