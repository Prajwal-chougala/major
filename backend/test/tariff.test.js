const assert = require("node:assert/strict");
const test = require("node:test");
const { calculateTariff, getRatePerKWh } = require("../utils/tariff");

test("tariff estimates use configured flat rate and return INR contract fields", () => {
  const previousRate = process.env.RATE_PER_KWH;
  process.env.RATE_PER_KWH = "9.5";
  try {
    assert.equal(getRatePerKWh(), 9.5);
    assert.deepEqual(calculateTariff(2), {
      units: 2,
      totalUnits: 2,
      ratePerKWh: 9.5,
      ratePerUnit: 9.5,
      dailyCost: 19,
      estimatedCost: 19,
      projectedMonthlyCost: 570,
      currency: "₹",
      currencyCode: "INR",
    });
  } finally {
    if (previousRate === undefined) {
      delete process.env.RATE_PER_KWH;
    } else {
      process.env.RATE_PER_KWH = previousRate;
    }
  }
});
