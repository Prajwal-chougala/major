/**
 * Indian Electricity Billing & Tariff Calculator
 * In India: 1 Unit = 1 kWh (1,000 Watt-hours)
 * 
 * Standard Indian Progressive Telescopic Tariff Structure:
 * Slab 1: 0 - 100 Units (kWh)   -> ₹4.75 / Unit
 * Slab 2: 101 - 200 Units (kWh) -> ₹6.50 / Unit
 * Slab 3: > 200 Units (kWh)     -> ₹8.50 / Unit
 * + 5% State Electricity Duty (ED)
 */

const calculateIndianTariff = (unitsKWh, period = "daily") => {
  const units = Math.max(0, Number(unitsKWh) || 0);

  // If calculating for daily energy, project to monthly to determine the realistic Indian slab bracket
  const monthlyUnits = period === "monthly" ? units : units * 30;

  let monthlyEnergyCharge = 0;
  if (monthlyUnits <= 100) {
    monthlyEnergyCharge = monthlyUnits * 4.75;
  } else if (monthlyUnits <= 200) {
    monthlyEnergyCharge = (100 * 4.75) + ((monthlyUnits - 100) * 6.50);
  } else {
    monthlyEnergyCharge = (100 * 4.75) + (100 * 6.50) + ((monthlyUnits - 200) * 8.50);
  }

  // 5% state electricity duty on energy charges as per Indian norms
  const monthlyDuty = monthlyEnergyCharge * 0.05;
  const monthlyTotal = monthlyEnergyCharge + monthlyDuty;

  // Effective average rate per unit in India
  const effectiveRate = monthlyUnits > 0 ? (monthlyTotal / monthlyUnits) : 7.20;

  // Daily cost calculated from effective rate
  const dailyCost = units * effectiveRate;

  return {
    units: Number(units.toFixed(4)),
    effectiveRatePerUnit: Number(effectiveRate.toFixed(2)),
    dailyCost: Number(dailyCost.toFixed(2)),
    projectedMonthlyCost: Number(monthlyTotal.toFixed(2)),
    currency: "₹",
    currencyCode: "INR",
  };
};

module.exports = {
  calculateIndianTariff,
};
