// PRD §8 story end to end = acceptance test (P11). Exits non-zero on any unexpected state.
// Step 1 (A-11.1): seed state check
// Step 2 (A-11.2): delegate with zero NEAR requests 300 → issued + code
// Step 3 (A-11.3): hospital code check + accept (expiry disabled)
// Step 4 (A-11.4): claim 280, member dispute, council trims 30, hospital paid 250
// Step 5 (A-11.5): debt 250, repay 50, limit +50
// Step 6 (A-11.6): abuse attempts denied (tenure, 3rd concurrent, over tier, relayer allow-list)
// Step 7 (A-11.7): simulate summary
throw new Error("not implemented: P11");
