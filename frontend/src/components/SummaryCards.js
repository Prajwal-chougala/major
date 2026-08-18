function SummaryCards({ insights }) {

    const cards = [
        {
            title: "Total Power",
            value: `${insights.totalPower}`,
            unit: "W",
            icon: "bolt",
            color: "deep-sky-blue",
            glowClass: "hover:shadow-[0_0_15px_rgba(139,92,246,0.4)]"
        },
        {
            title: "Highest Device",
            value: insights.highestDevice,
            unit: "",
            icon: "local_fire_department",
            color: "sky-blue",
            glowClass: "hover:shadow-[0_0_15px_rgba(0,209,255,0.4)]"
        },
        {
            title: "Highest Power",
            value: `${insights.highestPower}`,
            unit: "W",
            icon: "trending_up",
            color: "tertiary",
            glowClass: "hover:shadow-[0_0_15px_rgba(255,186,73,0.4)]"
        },
        {
            title: "Devices Active",
            value: insights.deviceCount,
            unit: "",
            icon: "devices",
            color: "primary",
            glowClass: "hover:shadow-[0_0_15px_rgba(164,230,255,0.4)]"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`
                        glass-card-hover p-card-padding
                        relative overflow-hidden group
                        ${card.glowClass}
                    `}
                >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-blue/5 to-deep-sky-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-label-caps font-inter text-on-surface-variant uppercase tracking-widest mb-3">
                                {card.title}
                            </p>
                            <h2 className="text-headline-lg font-inter text-on-surface flex items-baseline gap-1">
                                {card.value}
                                {card.unit && (
                                    <span className="text-data-mono font-mono text-on-surface-variant">
                                        {card.unit}
                                    </span>
                                )}
                            </h2>
                        </div>

                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            bg-${card.color}/20 text-${card.color}
                            border border-${card.color}/30
                            group-hover:shadow-[0_0_15px_currentColor] transition-shadow duration-300
                        `}>
                            <span className="material-symbols-outlined text-[20px]">
                                {card.icon}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SummaryCards;
