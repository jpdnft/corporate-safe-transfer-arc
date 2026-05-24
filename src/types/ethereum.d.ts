import type { Eip1193Provider } from "ethers";

type WalletEventHandler = (...args: unknown[]) => void;

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?: (event: string, handler: WalletEventHandler) => void;
      removeListener?: (event: string, handler: WalletEventHandler) => void;
    };
  }
}
