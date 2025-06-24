"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceChartProps {
  data: {
    sourceName: string;
    averageScore: number;
    quizzesTaken: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-sm">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-primary">{`Average Score: ${payload[0].value}%`}</p>
        <p className="text-xs text-muted-foreground">{`Quizzes Taken: ${payload[0].payload.quizzesTaken}`}</p>
      </div>
    );
  }
  return null;
};

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
                dataKey="sourceName" 
                tick={{ fontSize: 12 }} 
                interval={0}
                angle={-45}
                textAnchor="end"
                height={100}
                tickFormatter={(value) => value.length > 25 ? `${value.substring(0, 25)}...` : value}
            />
            <YAxis unit="%" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            <Bar dataKey="averageScore" name="Average Score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
  );
}
