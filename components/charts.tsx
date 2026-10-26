"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/present";

const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #dbe7ef",
  borderRadius: 10,
  color: "#142640",
  fontSize: 11,
  padding: "8px 10px",
} as const;

export function TrendChart({
  points,
  color,
  height = 260,
}: {
  points: TrendPoint[];
  color: string;
  height?: number;
}) {
  const gradientId = `trend-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  if (points.length < 2) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed border-line text-[12px] text-muted"
        style={{ height }}
      >
        Not enough hourly readings to draw a trend yet.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.value));
  const upper = Math.max(120, Math.ceil((max + 20) / 25) * 25);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#dbe7ef"
            strokeDasharray="2 6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
             tick={{ fill: "#607895", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, upper]}
            ticks={[0, 50, 100, 200].filter((tick) => tick <= upper)}
             tick={{ fill: "#607895", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
             labelStyle={{ color: "#607895", fontSize: 11 }}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.full ?? String(_label)
            }
            formatter={(value) => [`API ${String(value)}`, "Reading"]}
          />
          <ReferenceLine
            y={100}
            stroke="#e8894b"
            strokeOpacity={0.3}
            strokeDasharray="3 5"
          />
          <ReferenceLine
            y={50}
            stroke="#5fcb8a"
            strokeOpacity={0.22}
            strokeDasharray="3 5"
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
             activeDot={{ r: 3.5, fill: color, stroke: "#ffffff", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type MonthlyRow = Record<string, string | number | null>;

export function MonthlyChart({
  rows,
  series,
  unit,
  height = 280,
}: {
  rows: MonthlyRow[];
  series: { key: string; label: string; color: string }[];
  unit: string;
  height?: number;
}) {
  if (rows.length < 2) {
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed border-line text-[12px] text-muted"
        style={{ height }}
      >
        No monthly history available.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#dbe7ef" strokeDasharray="2 6" vertical={false} />
          <XAxis
            dataKey="label"
             tick={{ fill: "#607895", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={36}
            interval="preserveStartEnd"
          />
          <YAxis
             tick={{ fill: "#607895", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
             labelStyle={{ color: "#607895", fontSize: 11 }}
            formatter={(value) => [`${String(value)} ${unit}`, ""]}
          />
          <Legend
             wrapperStyle={{ fontSize: 11, color: "#607895", paddingTop: 8 }}
            iconType="plainline"
          />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={1.7}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
