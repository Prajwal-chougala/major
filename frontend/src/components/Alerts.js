function Alerts({ alerts }) {

    return (

        <div>

            <div className="flex justify-between items-end border-b border-glass-stroke pb-4 mb-6">
                <div>
                    <h2 className="text-headline-lg font-inter text-on-surface">
                        System Alerts
                    </h2>
                    <p className="text-body-md font-inter text-on-surface-variant mt-1">
                        Active notifications and warnings.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-error-red">
                        notification_important
                    </span>
                    <span className="text-data-mono font-mono">
                        {alerts.length}
                    </span>
                </div>
            </div>

            <div className="space-y-3">

                {alerts.map((alert, index) => {

                    const isNormal = alert.includes('normally');

                    return (
                        <div
                            key={index}
                            className={`
                                backdrop-blur-xl rounded-xl p-5 flex items-start gap-4
                                border transition-all duration-200
                                ${isNormal
                                    ? 'bg-sky-blue/5 border-sky-blue/20 hover:border-sky-blue/40'
                                    : 'bg-error/5 border-error/20 hover:border-error/40'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                ${isNormal
                                    ? 'bg-sky-blue/20 text-sky-blue'
                                    : 'bg-error/20 text-error-red'
                                }
                            `}>
                                <span className="material-symbols-outlined text-[18px]">
                                    {isNormal ? 'check_circle' : 'warning'}
                                </span>
                            </div>

                            <div className="flex-1">
                                <p className={`
                                    font-inter text-body-md
                                    ${isNormal ? 'text-sky-blue' : 'text-error-red'}
                                `}>
                                    {alert}
                                </p>
                                <p className="text-label-caps font-inter text-on-surface-variant/50 uppercase tracking-widest mt-2">
                                    {new Date().toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    );
                })}

            </div>

        </div>

    );

}

export default Alerts;
