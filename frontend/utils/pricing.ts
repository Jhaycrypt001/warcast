// utils/pricing.ts

interface PricingParams {
  basePrice: number;          // Starting price in XLAYER
  timeElapsedMinutes: number; // How "stale" the intel is
  accuracyMultiplier: number; // Multiplier from the AI Commander's post-match analysis (1.0 to 5.0)
}

/**
 * WARCAST ENGINE: Dynamic Pricing Algorithm
 * Calculates the current market value of a tactical dispatch.
 */
export function calculateDispatchPrice({
  basePrice,
  timeElapsedMinutes,
  accuracyMultiplier,
}: PricingParams): string {
  // --- WARCAST ECONOMY CONSTANTS ---
  const DECAY_RATE_PER_MINUTE = 0.015; // 1.5% value lost per minute of staleness
  const MINIMUM_PRICE = 0.001;         // The hard floor price (intel never goes to absolute zero)

  // 1. Calculate the time decay factor (Intel degrades over time)
  // Example: 10 mins elapsed * 0.015 = 0.15. Factor becomes 0.85 (85% of original value)
  const decayFactor = Math.max(0, 1 - (DECAY_RATE_PER_MINUTE * timeElapsedMinutes));

  // 2. Apply the formula: (Base * Decay) * Accuracy Multiplier
  let currentPrice = basePrice * decayFactor * accuracyMultiplier;

  // 3. Enforce the market floor price
  if (currentPrice < MINIMUM_PRICE) {
    currentPrice = MINIMUM_PRICE;
  }

  // 4. Return as a formatted string to 4 decimal places for the UI
  return currentPrice.toFixed(4);
}

/**
 * Helper to calculate how many minutes ago a dispatch was minted.
 */
export function getMinutesElapsed(mintedTimestamp: number): number {
  const now = Date.now();
  const elapsedMs = now - mintedTimestamp;
  return Math.floor(elapsedMs / 60000); // Convert milliseconds to minutes
}