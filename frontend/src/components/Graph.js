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

import { useTheme } from '../context/ThemeContext';

function Graph({ data, title = 'Energy Usage Analytics', colorHex = '#0EA5E9' }) {
    const { isDarkMode } = useTheme();

    const chartData = {
        labels: data.map(item =>
            new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        ),
        datasets: [
            {
                label: 'Power (W)',
                data: data.map(item => item.power),
                borderColor: colorHex,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    
                    const hexToRgb = (hex) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '14, 165, 233';
                    };
                    const rgb = hexToRgb(colorHex);

                    gradient.addColorStop(0, `rgba(${rgb}, ${isDarkMode ? '0.35' : '0.25'})`);
                    gradient.addColorStop(1, `rgba(${rgb}, 0.0)`);
                    return gradient;
                },
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: colorHex,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }
        ]
    };

    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const tickColor = isDarkMode ? '#94a3b8' : '#64748b';

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
                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                titleColor: isDarkMode ? '#94a3b8' : '#475569',
                bodyColor: isDarkMode ? '#f8fafc' : '#0f172a',
                titleFont: {
                    family: 'Inter',
                    size: 11,
                    weight: '600',
                },
                bodyFont: {
                    family: 'JetBrains Mono',
                    size: 13,
                    weight: '500',
                },
                padding: 12,
                cornerRadius: 10,
                displayColors: false,
            }
        },
        scales: {
            x: {
                grid: {
                    color: gridColor,
                    drawBorder: false,
                },
                ticks: {
                    color: tickColor,
                    font: {
                        family: 'JetBrains Mono',
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
                    color: gridColor,
                    drawBorder: false,
                },
                ticks: {
                    color: tickColor,
                    font: {
                        family: 'JetBrains Mono',
                        size: 10,
                    },
                    maxTicksLimit: 5,
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
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-title-md font-inter font-bold text-slate-900 dark:text-white">
                        {title}
                    </h2>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: colorHex }}>
                            show_chart
                        </span>
                        <span className="text-data-mono font-mono text-[11px] font-bold">
                            LIVE
                        </span>
                    </div>
                </div>
            )}
            <div className="flex-1 w-full min-h-[150px]">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );

}

export default Graph;
