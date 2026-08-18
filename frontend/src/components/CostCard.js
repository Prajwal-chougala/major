function CostCard({ cost }) {

    return (

        <div className="glass-card-hover p-card-padding relative overflow-hidden h-full">

            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-deep-sky-blue/5 to-sky-blue/5 opacity-50" />

            <div className="relative z-10">

                <div className="flex justify-between items-start mb-8">
                    <h2 className="text-title-md font-inter text-on-surface">
                        Cost Analysis
                    </h2>
                    <div className="w-10 h-10 rounded-full bg-deep-sky-blue/20 flex items-center justify-center text-deep-sky-blue border border-deep-sky-blue/30">
                        <span className="material-symbols-outlined text-[20px]">
                            payments
                        </span>
                    </div>
                </div>

                <div className="space-y-6">

                    {/* Estimated Cost - Hero metric */}
                    <div>
                        <p className="text-label-caps font-inter text-on-surface-variant uppercase tracking-widest mb-2">
                            Estimated Cost
                        </p>
                        <h3 className="text-display-lg font-inter gradient-text">
                            ₹{cost.estimatedCost}
                        </h3>
                    </div>

                    <div className="w-full h-px bg-glass-stroke" />

                    {/* Secondary metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container/80 backdrop-blur-md rounded-xl p-4 border border-glass-stroke">
                            <p className="text-label-caps font-inter text-on-surface-variant uppercase mb-2">
                                Total Units
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-title-md font-inter text-on-surface">
                                    {cost.totalUnits}
                                </span>
                                <span className="text-data-mono font-mono text-on-surface-variant">
                                    kWh
                                </span>
                            </div>
                        </div>

                        <div className="bg-surface-container/80 backdrop-blur-md rounded-xl p-4 border border-glass-stroke">
                            <p className="text-label-caps font-inter text-on-surface-variant uppercase mb-2">
                                Rate/Unit
                            </p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-title-md font-inter text-sky-blue">
                                    ₹{cost.ratePerUnit}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </div>

    );

}

export default CostCard;
