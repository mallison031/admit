# Admit — Vercel Web App Deployment Guide (Testnet)

> **Document Status:** Complete & Ready for Execution  
> **Associated Task:** `A-13.6` (`Deploy web to Vercel (testnet config)`)  
> **Done-When Criterion:** Public URL works on a phone. Ask before triggering live deployments.

---

## 1. Overview & Architecture

The Admit web application is a **Next.js 16 (v16.4.4 App Router)** application styled with **Tailwind CSS v4** residing in `apps/web`. It interfaces directly with NEAR Protocol testnet contracts and the `@admit/core` workspace package.

### Monorepo Integration
- `apps/web` depends on `@admit/core: workspace:*`.
- `next.config.ts` configures `transpilePackages: ["@admit/core"]` so Next.js transpiles the TypeScript library directly from source during production builds without separate compilation artifacts.
- Zero secrets or private keys reside in `apps/web`. All environment variables use the `NEXT_PUBLIC_` prefix and are safe for client-side bundle exposure.

---

## 2. Vercel Project Configuration

When importing `github.com/mallison031/admit` into Vercel:

| Setting | Value | Rationale |
|---|---|---|
| **Framework Preset** | Next.js | Automatically detected by Vercel. |
| **Root Directory** | `apps/web` | **Essential:** Tells Vercel where the web application lives. Vercel detects root `pnpm-workspace.yaml` and `pnpm-lock.yaml` and resolves monorepo packages. |
| **Build Command** | `next build` (or `pnpm --filter @admit/web build`) | Compiles optimized Next.js 16 production build. |
| **Output Directory** | `.next` | Default Next.js build output. |
| **Install Command** | `pnpm install` | Uses pnpm to install and link workspace dependencies. |
| **Node.js Version** | `22.x` | Required per root `.nvmrc` and `package.json` engines. Set in **Project Settings ➔ General ➔ Node.js Version**. |

---

## 3. Environment Variables Matrix

Configure these environment variables in the Vercel Project Settings (**Environment Variables** ➔ Production & Preview):

| Variable Name | Required? | Recommended Testnet Value | Description |
|---|---|---|---|
| `NEXT_PUBLIC_NEAR_NETWORK` | Yes | `testnet` | Target NEAR network (`testnet` / `mainnet`). |
| `NEXT_PUBLIC_NEAR_RPC_URL` | Yes | `https://rpc.testnet.fastnear.com` | High-throughput FastNEAR RPC endpoint. *(Falls back to `https://near-testnet.drpc.org` if omitted).* |
| `NEXT_PUBLIC_ADMIT_CONTRACT` | Yes | `pool.admit-hack-6711fd.testnet` | Deployed Admit pool smart contract on NEAR testnet. |
| `NEXT_PUBLIC_CONTRACT_ID` | Yes | `pool.admit-hack-6711fd.testnet` | Contract ID mirror for view client and explorer links. |
| `NEXT_PUBLIC_API_URL` | Optional | `https://api.admit.example.com` | Relayer URL for gasless member onboarding and submissions. *(Defaults to `http://localhost:8787`).* |
| `NEXT_PUBLIC_TIME_SCALE` | Yes | `1` | Real-time mode (1 = 1x real time; >1 triggers demo acceleration banner). |

---

## 4. Mobile Verification Checklist ("Works on a phone")

Task `A-13.6` specifically requires verifying that the deployment **works on a phone**. Run through this checklist on iOS Safari and Android Chrome once deployed:

- [ ] **Responsive Viewport & Scaling:**
  - Viewport metadata properly constrained; zero horizontal scroll at 360px viewport (e.g., iPhone SE, Galaxy A-series).
- [ ] **Interactive 2:04 AM Emergency Simulator:**
  - Landing page interactive emergency simulator (`/`) runs through step progression (Request $\rightarrow$ Triage $\rightarrow$ Settle $\rightarrow$ Repay) with touch controls.
- [ ] **Guarantee QR Display (`/g/[id]`):**
  - High-contrast QR code renders clearly on mobile screen at adequate size for bedside/triage optical scanning.
  - 6-character human-readable verification code displays in bold monospace font.
- [ ] **Triage Verification & Intake (`/hospital`):**
  - Clinic staff can enter 6-character admission code; touch buttons for "Verify" and "Accept" have $\ge 44\text{px}$ touch targets.
- [ ] **Member Portal (`/member`):**
  - Credit limit bar, active guarantee status, and repayment inputs format cleanly without overflow.
- [ ] **Council Governance (`/council`):**
  - Claim disputes and settlement review actions readable on small screens.

---

## 5. Step-by-Step Deployment Instructions

### Method A: Via Vercel Web Dashboard (Recommended)

1. Navigate to [vercel.com/new](https://vercel.com/new).
2. Connect your GitHub account and import the repository: **`mallison031/admit`**.
3. In **Project Settings**:
   - Set **Root Directory** to `apps/web` (click Edit, select `apps/web`).
   - Confirm **Framework Preset** is **Next.js**.
4. In **Environment Variables**, add the 5 variables from Section 3:
   - `NEXT_PUBLIC_NEAR_NETWORK` = `testnet`
   - `NEXT_PUBLIC_NEAR_RPC_URL` = `https://rpc.testnet.fastnear.com`
   - `NEXT_PUBLIC_ADMIT_CONTRACT` = `pool.admit-hack-6711fd.testnet`
   - `NEXT_PUBLIC_CONTRACT_ID` = `pool.admit-hack-6711fd.testnet`
   - `NEXT_PUBLIC_TIME_SCALE` = `1`
5. Click **Deploy**. The build takes ~45 seconds.

### Method B: Via Vercel CLI (Maintainer)

```bash
# Navigate to web application directory
cd apps/web

# Link to Vercel project
npx vercel link

# Add production environment variables
npx vercel env add NEXT_PUBLIC_NEAR_NETWORK production
npx vercel env add NEXT_PUBLIC_NEAR_RPC_URL production
npx vercel env add NEXT_PUBLIC_ADMIT_CONTRACT production
npx vercel env add NEXT_PUBLIC_CONTRACT_ID production
npx vercel env add NEXT_PUBLIC_TIME_SCALE production

# Trigger production deployment
npx vercel --prod
```

---

## 6. Post-Deployment Smoke Verification

Once the deployment finishes and generates your production URL (e.g. `https://admit-web.vercel.app`):

1. **Verify HTTP 200 & Header Inspection:**
   ```bash
   curl -I https://<your-vercel-domain>.vercel.app
   ```
2. **Page Navigation:**
   - `/` (Landing page & Interactive Emergency Demo)
   - `/request` (Emergency guarantee intake request)
   - `/hospital` (Hospital admission verification)
   - `/member` (Member revolving credit & repayments)
   - `/council` (Council DAO governance & dispute settlement)
3. **Record Live URL:**
   - Update `README.md` and `docs/hackathon-submission.md` with the live production URL.
   - Update `ROADMAP.md` task `A-13.6` from ⬜ to ✅ with the verified live URL.
