const DEFAULT_RATE_PER_KWH = 8;

const getRatePerKWh = () => {
  const configuredRate = Number(process.env.RATE_PER_KWH);
  return Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : DEFAULT_RATE_PER_KWH;
};

const calculateTariff = (unitsKWh, ratePerKWh = getRatePerKWh()) => {
  const units = Number.isFinite(Number(unitsKWh))
    ? Math.max(0, Number(unitsKWh))
    : 0;
  const rate = Number.isFinite(Number(ratePerKWh)) && Number(ratePerKWh) > 0
    ? Number(ratePerKWh)
    : DEFAULT_RATE_PER_KWH;
  const dailyCost = Number((units * rate).toFixed(2));

  return {
    units: Number(units.toFixed(4)),
    totalUnits: Number(units.toFixed(4)),
    ratePerKWh: rate,
    ratePerUnit: rate,
    dailyCost,
    estimatedCost: dailyCost,
    projectedMonthlyCost: Number((dailyCost * 30).toFixed(2)),
    currency: "₹",
    currencyCode: "INR",
  };
};

module.exports = {
  calculateTariff,
  getRatePerKWh,
};
