import React, { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Title,
    Tooltip,
    Legend
);

function Graph({ data = [], title = 'Consumption Profile (Live)', colorHex = '#0EA5E9', defaultMetric = 'energy', threshold = null }) {
    const [selectedMetric, setSelectedMetric] = useState(defaultMetric);

    const isEnergy = selectedMetric === 'energy';
    const activeColor = isEnergy ? '#35259B' : colorHex;

    const values = data.map(item => {
        if (isEnergy) {
            return item.energy !== undefined ? Number(item.energy) : Number(item.energyKWh || 0);
        }
        return Number(item.power) || 0;
    });

    const chartData = {
        labels: data.map(item =>
            new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        ),
        datasets: [
            {
                label: isEnergy ? 'Energy Consumption (kWh)' : 'Power Draw (W)',
                data: values,
                borderColor: activeColor,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
                    const hexToRgb = (hex) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '53, 37, 155';
                    };
                    const rgb = hexToRgb(activeColor);
                    gradient.addColorStop(0, `rgba(${rgb}, 0.3)`);
                    gradient.addColorStop(1, `rgba(${rgb}, 0.0)`);
                    return gradient;
                },
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                pointRadius: values.length > 25 ? 0 : 3,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: activeColor,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                titleColor: '#94a3b8',
                bodyColor: '#f8fafc',
                titleFont: {
                    family: 'Inter',
                    size: 11,
                    weight: '600',
                },
                bodyFont: {
                    family: 'JetBrains Mono, monospace',
                    size: 13,
                    weight: '600',
                },
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const val = context.parsed.y;
                        return isEnergy 
                            ? ` Energy: ${Number(val).toFixed(4)} kWh`
                            : ` Power: ${Number(val).toFixed(1)} W`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.04)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        family: 'JetBrains Mono, monospace',
                        size: 10,
                    },
                    maxTicksLimit: 6,
                },
                border: {
                    display: false,
                },
            },
            y: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.04)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        family: 'JetBrains Mono, monospace',
                        size: 10,
                    },
                    maxTicksLimit: 5,
                    callback: (value) => isEnergy ? `${Number(value).toFixed(3)} kWh` : `${value} W`,
                },
                border: {
                    display: false,
                },
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full">
            {title && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-inter">
                            {title}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {isEnergy ? "Continuous Cumulative Electric Energy" : "Real-time Instantaneous Power Draw"}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                            <button
                                type="button"
                                onClick={() => setSelectedMetric('energy')}
                                className={`px-3 py-1 rounded-md transition-all ${isEnergy ? 'bg-white text-[#35259B] shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                ⚡ Energy (kWh)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedMetric('power')}
                                className={`px-3 py-1 rounded-md transition-all ${!isEnergy ? 'bg-white text-[#0EA5E9] shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                🔌 Power (W)
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold font-mono tracking-wider">LIVE</span>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex-1 w-full min-h-[160px]">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}

export default Graph;
