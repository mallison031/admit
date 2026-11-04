// wallet-selector setup for members and council (A-9.6, A-9.7).
import { setupWalletSelector, type WalletSelector } from "@near-wallet-selector/core";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupModal, type WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

let selectorInstance: { selector: WalletSelector; modal: WalletSelectorModal } | null = null;

export const getWalletSelector = async (
  contractId = "pool.admit.testnet",
  network: "testnet" | "mainnet" = "testnet",
): Promise<{ selector: WalletSelector; modal: WalletSelectorModal }> => {
  if (typeof window === "undefined") {
    throw new Error("Wallet selector is only available in browser environments");
  }

  if (selectorInstance) {
    return selectorInstance;
  }

  const selector = await setupWalletSelector({
    network,
    modules: [
      setupMyNearWallet(),
      setupHotWallet(),
    ],
  });

  const modal = setupModal(selector, {
    contractId,
  });

  selectorInstance = { selector, modal };
  return selectorInstance;
};

export const setupWallet = async (): Promise<void> => {
  if (typeof window !== "undefined") {
    await getWalletSelector();
  }
};
