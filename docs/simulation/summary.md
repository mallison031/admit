# Admit Solvency Simulation Report

This report presents Monte Carlo solvency analysis for Admit health deposit guarantee pools over a **24-month horizon** across 10,000 iterations per scenario.

## Executive Summary

| Scenario | Runs | Months | P(Insolvent) | P(Denied by Cap) | Mean Final Balance | 5th Percentile Balance |
|---|---|---|---|---|---|---|
| **Normal** | 10,000 | 24 | **0.00%** | **0.00%** | $6030.06 | $5435.73 |
| **Bad Year** | 10,000 | 24 | **0.00%** | **0.03%** | $3259.23 | $2231.20 |
| **Exit Wave** | 10,000 | 24 | **0.00%** | **0.00%** | $4067.82 | $3539.53 |

---

## Solvency Criteria Verification (A-10.3)
- **Target:** $P(\text{insolvent}) < 5\%$ under the `normal` scenario.
- **Achieved:** **0.00%** — well below the 5% risk threshold.
- The default pool parameters ($5/month contribution, $100 base limit, $25/month tenure growth up to $400, 70% pool coverage, 80% max exposure cap) ensure robust long-term pool solvency while maintaining high guarantee availability.

---

## Scenario Descriptions

### 1. Normal Scenario
- **Emergency rate:** 2.5% monthly probability per member (~26% annual chance).
- **Bill distribution:** Lognormal median $100, 95th percentile $250.
- **Repayment default rate:** 1%.
- **Outcome:** Pool grows steadily as member contributions comfortably outpace settled emergency claims.

### 2. Bad Year (Stress Scenario)
- **Emergency rate:** 5.5% monthly probability per member (~50% annual chance).
- **Bill distribution:** Elevated median $121, 95th percentile $320.
- **Repayment default rate:** 8%.
- **Outcome:** Pool absorbs catastrophic spikes through the 80% exposure cap and council multiplier checks.

### 3. Exit Wave (Run-on-Pool Scenario)
- **Emergency rate:** Normal (2.5% monthly).
- **Shock event:** At Month 12, **35% of active members** initiate contract exits simultaneously.
- **Outcome:** The 30-day exit notice and 3-month lock period successfully stagger capital withdrawals without compromising active emergency reservations.

---

## Trajectory Chart

The 24-month pool balance trajectory chart is saved to `docs/simulation/chart.png` and full tabular figures are in `docs/simulation/results.csv`.
