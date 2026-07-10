"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const BRAND = "#2563eb";
const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b", "#0ea5e9"];
const axis = { fontSize: 12, fill: "hsl(215 16% 47%)" };

export function BandDistributionChart({ data }: { data: { band: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis dataKey="band" tick={axis} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgb(37 99 235 / 0.06)" }} />
        <Bar dataKey="count" fill={BRAND} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillAveragesChart({ data }: { data: { skill: string; band: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis dataKey="skill" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 9]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgb(37 99 235 / 0.06)" }} />
        <Bar dataKey="band" fill="#10b981" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ActivityChart({ data }: { data: { date: string; submissions: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="submissions"
          stroke={BRAND}
          strokeWidth={2}
          fill="url(#actFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BandTrendChart({
  data,
  target
}: {
  data: { label: string; band: number }[];
  target?: number | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 9]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip />
        {target != null ? (
          <ReferenceLine
            y={target}
            stroke="#10b981"
            strokeDasharray="4 4"
            label={{ value: `Target ${target.toFixed(1)}`, position: "insideTopRight", fontSize: 11, fill: "#10b981" }}
          />
        ) : null}
        <Area type="monotone" dataKey="band" stroke={BRAND} strokeWidth={2} fill="url(#bandFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((entry, i) => (
            <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
