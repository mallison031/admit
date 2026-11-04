import { limits, type Member, type Pool, type PoolParams } from "@admit/core";
import { SeededRng } from "./rng.js";
import { sampleBill } from "./sampleBill.js";
import { sampleEmergency } from "./sampleEmergency.js";
import type {
  MonthSnapshot,
  ScenarioConfig,
  ScenarioName,
  ScenarioSummary,
  SingleRunResult,
} from "./types.js";

export const defaultPoolParams: PoolParams = {
  monthly_contribution: "5000000", // $5/mo
  min_tenure_months: 1,
  base_limit: "100000000", // $100
  limit_per_month: "25000000", // $25/mo
  max_limit: "400000000", // $400
  late_limit_bps: 5000, // 50%
  max_exposure_bps: 8000, // 80%
  max_active_per_member: 2,
  cooldown: "2592000000000000", // 30 days
  guarantee_ttl: "604800000000000", // 7 days
  dispute_window: "1209600000000000", // 14 days
  pool_covered_bps: 7000, // 70% covered by pool
  cover_on_death: true,
  council_tier_multiplier: 3,
  exit_lock_months: 3,
  exit_notice: "2592000000000000", // 30 days
  time_scale: 1,
};

export const getScenarioConfigs = (runs = 10000): Record<ScenarioName, ScenarioConfig> => ({
  normal: {
    name: "normal",
    description: "Standard operations: 2.5% monthly emergency rate, 1% repayment default",
    runs,
    months: 24,
    initialMembers: 50,
    initialBalance: 1_000_000_000n, // $1,000 initial liquidity
    monthlyEmergencyProb: 0.025,
    billMu: 4.6052,
    billSigma: 0.55,
    defaultRate: 0.01,
    poolParams: defaultPoolParams,
  },
  bad_year: {
    name: "bad_year",
    description: "Stress scenario: 5.5% emergency rate, higher claim sizes, 8% default rate",
    runs,
    months: 24,
    initialMembers: 50,
    initialBalance: 1_000_000_000n,
    monthlyEmergencyProb: 0.055,
    billMu: 4.8, // Median ~$121
    billSigma: 0.6,
    defaultRate: 0.08,
    poolParams: defaultPoolParams,
  },
  exit_wave: {
    name: "exit_wave",
    description: "Run-on-pool scenario: 35% of members initiate exit at Month 12",
    runs,
    months: 24,
    initialMembers: 50,
    initialBalance: 1_000_000_000n,
    monthlyEmergencyProb: 0.025,
    billMu: 4.6052,
    billSigma: 0.55,
    defaultRate: 0.02,
    exitWaveMonth: 12,
    exitWaveFraction: 0.35,
    poolParams: defaultPoolParams,
  },
});

interface SimMember {
  id: number;
  joinedMonth: number;
  contributed: bigint;
  outstandingDebt: bigint;
  debtRepaymentPlan: bigint; // monthly repayment amount
  standing: "Good" | "Late" | "Default";
  exited: boolean;
  exitRequestedMonth: number | null;
}

export const runSimulation = (config: ScenarioConfig, rngSeed = 42): ScenarioSummary => {
  const rng = new SeededRng(rngSeed);
  const results: SingleRunResult[] = [];
  const monthlyBalanceTotals = new Array(config.months).fill(0n);
  const monthlyExposureTotals = new Array(config.months).fill(0);

  for (let r = 0; r < config.runs; r++) {
    let poolBalance = config.initialBalance;
    const poolReserved = 0n;
    let insolvent = false;
    let insolventMonth: number | null = null;
    let totalRequests = 0;
    let deniedByCap = 0;
    const snapshots: MonthSnapshot[] = [];

    // Initialize members
    const members: SimMember[] = [];
    for (let m = 0; m < config.initialMembers; m++) {
      members.push({
        id: m,
        joinedMonth: 0,
        contributed: 0n,
        outstandingDebt: 0n,
        debtRepaymentPlan: 0n,
        standing: "Good",
        exited: false,
        exitRequestedMonth: null,
      });
    }

    const monthlyContribution = BigInt(config.poolParams.monthly_contribution);

    // Simulate 24 months
    for (let month = 1; month <= config.months; month++) {
      const nowNs = BigInt(month) * limits.NS_PER_MONTH;
      let monthClaimsPaid = 0n;
      let monthEmergencies = 0;
      let monthDeniedByCap = 0;

      // Handle exit wave
      if (
        config.exitWaveMonth === month &&
        config.exitWaveFraction &&
        config.exitWaveFraction > 0
      ) {
        const activeMembers = members.filter((m) => !m.exited && m.exitRequestedMonth === null);
        const exitCount = Math.floor(activeMembers.length * config.exitWaveFraction);
        for (let i = 0; i < exitCount; i++) {
          if (activeMembers[i]) {
            activeMembers[i]!.exitRequestedMonth = month;
          }
        }
      }

      // Process monthly contributions and debt repayments
      for (const m of members) {
        if (m.exited) continue;

        // Execute pending exit if notice and lock period passed
        if (m.exitRequestedMonth !== null && month >= m.exitRequestedMonth + 1) {
          const refund = m.contributed > m.outstandingDebt ? m.contributed - m.outstandingDebt : 0n;
          if (refund > 0n && poolBalance >= refund) {
            poolBalance -= refund;
          }
          m.exited = true;
          continue;
        }

        // Pay monthly contribution
        m.contributed += monthlyContribution;
        poolBalance += monthlyContribution;

        // Pay debt repayment installment
        if (m.outstandingDebt > 0n) {
          if (rng.next() < config.defaultRate) {
            m.standing = "Default";
          } else {
            const installment = m.debtRepaymentPlan > 0n
              ? (m.outstandingDebt < m.debtRepaymentPlan ? m.outstandingDebt : m.debtRepaymentPlan)
              : (m.outstandingDebt < monthlyContribution ? m.outstandingDebt : monthlyContribution);
            m.outstandingDebt -= installment;
            poolBalance += installment;
            if (m.outstandingDebt === 0n) {
              m.debtRepaymentPlan = 0n;
              m.standing = "Good";
            }
          }
        }
      }

      // Organic member growth (1 new member joined per 2 months)
      if (month % 2 === 0) {
        members.push({
          id: members.length,
          joinedMonth: month,
          contributed: monthlyContribution,
          outstandingDebt: 0n,
          debtRepaymentPlan: 0n,
          standing: "Good",
          exited: false,
          exitRequestedMonth: null,
        });
        poolBalance += monthlyContribution;
      }

      // Check emergency events
      const activeMembers = members.filter((m) => !m.exited);
      for (const m of activeMembers) {
        if (sampleEmergency(rng, config.monthlyEmergencyProb)) {
          totalRequests++;
          monthEmergencies++;

          // Construct mock Member view for @admit/core limits
          const memberView: Member = {
            account: `member_${m.id}.testnet`,
            pool_id: 0,
            joined_at: (BigInt(m.joinedMonth) * limits.NS_PER_MONTH).toString(),
            contributed: m.contributed.toString(),
            outstanding: m.outstandingDebt.toString(),
            standing: m.standing,
            active_guarantees: 0,
            last_guarantee_at: null,
            delegates: [],
            exit_requested_at: null,
          };

          const poolView: Pool = {
            id: 0,
            name: "Pool",
            dao: "dao.testnet",
            token: "usdc.testnet",
            params: config.poolParams,
            council: [],
            hospitals: [],
            balance: poolBalance.toString(),
            reserved: poolReserved.toString(),
            written_off: "0",
            created_at: "0",
          };

          const memberLimit = limits.limit(memberView, config.poolParams, 0n, nowNs);
          const billAmount = sampleBill(rng, {
            meanLog: config.billMu,
            stdDevLog: config.billSigma,
          });

          // Check tier
          const t = limits.tier(billAmount, memberLimit, config.poolParams);
          if (t === "Rejected") {
            continue;
          }

          // Check exposure
          if (!limits.exposureOk(poolView, billAmount)) {
            deniedByCap++;
            monthDeniedByCap++;
            continue;
          }

          // Approved and settled
          const poolCoveredBps = BigInt(config.poolParams.pool_covered_bps);
          const poolShare = (billAmount * poolCoveredBps) / 10_000n;
          const memberShare = billAmount - poolShare;

          if (poolBalance < poolShare) {
            insolvent = true;
            if (insolventMonth === null) {
              insolventMonth = month;
            }
            poolBalance = 0n;
          } else {
            poolBalance -= poolShare;
            monthClaimsPaid += poolShare;
          }

          m.outstandingDebt += memberShare;
          // Member repays their share over 4 months
          m.debtRepaymentPlan = memberShare / 4n;
          if (m.debtRepaymentPlan === 0n) m.debtRepaymentPlan = memberShare;
        }
      }

      const exposureBps = poolBalance > 0n
        ? Number((poolReserved * 10_000n) / poolBalance)
        : 10_000;

      snapshots.push({
        month,
        balance: poolBalance,
        reserved: poolReserved,
        exposureBps,
        activeMembers: activeMembers.length,
        emergenciesCount: monthEmergencies,
        claimsPaid: monthClaimsPaid,
        deniedByCapCount: monthDeniedByCap,
      });

      monthlyBalanceTotals[month - 1] += poolBalance;
      monthlyExposureTotals[month - 1] += exposureBps;
    }

    results.push({
      runIndex: r,
      scenario: config.name,
      insolvent,
      insolventMonth,
      totalRequests,
      deniedByCap,
      finalBalance: poolBalance,
      monthlySnapshots: snapshots,
    });
  }

  // Aggregate results across all runs
  const insolventRuns = results.filter((r) => r.insolvent).length;
  const totalRequestsAll = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const deniedByCapAll = results.reduce((sum, r) => sum + r.deniedByCap, 0);

  const sortedBalances = results.map((r) => Number(r.finalBalance) / 1_000_000).sort((a, b) => a - b);
  const meanFinalBalanceUsd =
    sortedBalances.reduce((sum, b) => sum + b, 0) / sortedBalances.length;
  const minFinalBalanceUsd = sortedBalances[0] ?? 0;
  const maxFinalBalanceUsd = sortedBalances[sortedBalances.length - 1] ?? 0;
  const p5Index = Math.floor(sortedBalances.length * 0.05);
  const p5FinalBalanceUsd = sortedBalances[p5Index] ?? 0;

  const averageMonthlyBalanceUsd = monthlyBalanceTotals.map(
    (tot) => Number(tot / BigInt(config.runs)) / 1_000_000,
  );
  const averageMonthlyExposureBps = monthlyExposureTotals.map(
    (tot) => tot / config.runs,
  );

  return {
    scenario: config.name,
    runs: config.runs,
    months: config.months,
    insolventRuns,
    probInsolvent: insolventRuns / config.runs,
    totalRequests: totalRequestsAll,
    deniedByCapRequests: deniedByCapAll,
    probDeniedByCap: totalRequestsAll > 0 ? deniedByCapAll / totalRequestsAll : 0,
    meanFinalBalanceUsd,
    minFinalBalanceUsd,
    p5FinalBalanceUsd,
    maxFinalBalanceUsd,
    averageMonthlyBalanceUsd,
    averageMonthlyExposureBps,
  };
};
