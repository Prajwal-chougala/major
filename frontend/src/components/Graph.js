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

function Graph({ data, title = 'Energy Usage Analytics', colorHex = '#0EA5E9' }) {

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
                    
                    // Convert hex to rgb for rgba strings
                    const hexToRgb = (hex) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '139, 92, 246';
                    };
                    const rgb = hexToRgb(colorHex);

                    gradient.addColorStop(0, `rgba(${rgb}, 0.4)`);
                    gradient.addColorStop(1, `rgba(${rgb}, 0.0)`);
                    return gradient;
                },
                borderWidth: 2,
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
                backgroundColor: 'rgba(10, 15, 18, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                titleColor: '#bbc9cf',
                bodyColor: '#DAE2FD',
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
                cornerRadius: 8,
                displayColors: false,
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.04)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#859399',
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
                    color: 'rgba(255, 255, 255, 0.04)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#859399',
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
                    <h2 className="text-title-md font-inter text-on-surface">
                        {title}
                    </h2>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]" style={{ color: colorHex }}>
                            show_chart
                        </span>
                        <span className="text-data-mono font-mono text-[11px]">
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
