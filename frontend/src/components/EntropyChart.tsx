import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { EntropyBreakdown } from '../types';
import { useTheme } from '../ThemeContext';

interface EntropyChartProps {
    data: EntropyBreakdown[];
}

export default function EntropyChart({ data }: EntropyChartProps) {
    const { theme } = useTheme();

    if (!data || data.length === 0) {
        return <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">Sin datos</p>;
    }

    const chartData = data.map((d) => ({
        position: `${d.position}`,
        cumulative: d.cumulative,
        bits: d.bits,
        char: d.char,
        type: d.type,
    }));

    const typeColorMap: Record<string, string> = {
        lowercase: '#9b1b2f',
        uppercase: '#3b82f6',
        digit: '#f59e0b',
        symbol: '#ef4444',
        other: '#6b7280',
    };

    const axisColor = theme === 'dark' ? '#6b7280' : '#9ca3af';
    const gridColor = theme === 'dark' ? '#374151' : '#d1d5db';

    return (
        <div>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="entropyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9b1b2f" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#9b1b2f" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="position"
                            tick={{ fontSize: 11, fill: axisColor }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: axisColor }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                            unit=" bits"
                        />
                        <Tooltip
                            contentStyle={{
                                background: theme === 'dark' ? '#1f2937' : '#ffffff',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                borderRadius: '6px',
                                color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                                fontSize: '13px',
                            }}
                            formatter={(value: number) => [`${value} bits`, 'Entropía acumulada']}
                            labelFormatter={(label) => {
                                const item = chartData[parseInt(label) - 1];
                                return item ? `Posición ${label}: "${item.char}" (${item.type})` : `Posición ${label}`;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="cumulative"
                            stroke="#9b1b2f"
                            strokeWidth={2}
                            fill="url(#entropyGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Character type legend */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {data.map((d, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold border border-gray-200 dark:border-gray-700"
                        style={{ color: typeColorMap[d.type] || '#6b7280' }}
                        title={`${d.type}: +${d.bits} bits`}
                    >
                        {d.char}
                    </span>
                ))}
            </div>
        </div>
    );
}
