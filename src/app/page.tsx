"use client";

import { BrowserProvider, Contract, formatUnits, isAddress, parseUnits } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { corporateSafeTransferAbi } from "@/contracts/CorporateSafeTransferAbi";
import { erc20Abi } from "@/contracts/Erc20Abi";
import { appConfig } from "@/lib/config";

type Config = {
  owner: string;
  payer: string;
  recipient: string;
  usdcToken: string;
};

type TransferRecord = {
  id: bigint;
  amount: bigint;
  memo: string;
  internalReference: string;
  fundedBy: string;
  withdrawn: boolean;
  createdAt: bigint;
  withdrawnAt: bigint;
};

type TabKey = "admin" | "pay" | "receive";

const emptyConfig: Config = {
  owner: "",
  payer: "",
  recipient: "",
  usdcToken: ""
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("admin");
  const [account, setAccount] = useState("");
  const [config, setConfig] = useState<Config>(emptyConfig);
  const [availableTransfers, setAvailableTransfers] = useState<TransferRecord[]>([]);
  const [completedTransfers, setCompletedTransfers] = useState<TransferRecord[]>([]);
  const [payerInput, setPayerInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState("");
  const [reference, setReference] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [contractBalance, setContractBalance] = useState<bigint | null>(null);
  const [pendingAmount, setPendingAmount] = useState<bigint | null>(null);
  const [decimals, setDecimals] = useState(6);
  const [status, setStatus] = useState("Connect a wallet to start.");
  const [currentChainId, setCurrentChainId] = useState("");
  const [busy, setBusy] = useState(false);

  const hasContract = isAddress(appConfig.contractAddress);
  const normalizedAccount = account.toLowerCase();
  const isOwner = Boolean(account && config.owner && normalizedAccount === config.owner.toLowerCase());
  const isPayer = Boolean(account && config.payer && normalizedAccount === config.payer.toLowerCase());
  const isRecipient = Boolean(account && config.recipient && normalizedAccount === config.recipient.toLowerCase());

  const contractUrlLabel = useMemo(() => {
    if (!hasContract) return "Contract not configured";
    return `Contract address: ${shorten(appConfig.contractAddress)}`;
  }, [hasContract]);

  const expectedChainHex = useMemo(() => {
    if (!appConfig.arcChainId) return "";
    return `0x${Number(appConfig.arcChainId).toString(16)}`;
  }, []);

  const isWrongNetwork = Boolean(expectedChainHex && currentChainId && currentChainId !== expectedChainHex);

  const getProvider = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("No injected wallet found.");
    }

    return new BrowserProvider(window.ethereum);
  }, []);

  const getContracts = useCallback(async (withSigner = false) => {
    if (!hasContract) {
      throw new Error("Set NEXT_PUBLIC_CONTRACT_ADDRESS first.");
    }

    const provider = await getProvider();
    const runner = withSigner ? await provider.getSigner() : provider;
    const safeTransfer = new Contract(appConfig.contractAddress, corporateSafeTransferAbi, runner);
    const usdcAddress = config.usdcToken || appConfig.usdcAddress;
    const usdc = isAddress(usdcAddress) ? new Contract(usdcAddress, erc20Abi, runner) : null;

    return { provider, safeTransfer, usdc };
  }, [config.usdcToken, getProvider, hasContract]);

  const connectWallet = async () => {
    try {
      const provider = await getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const chainId = await provider.send("eth_chainId", []);
      setAccount(accounts[0] || "");
      setCurrentChainId(chainId);
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(readError(error));
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum || !expectedChainHex) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedChainHex }]
      });
      setCurrentChainId(expectedChainHex);
      setStatus("Network switched.");
      await refresh();
    } catch (error) {
      setStatus(readError(error));
    }
  };

  const refresh = useCallback(async () => {
    if (!hasContract || !window.ethereum) return;

    try {
      const provider = await getProvider();
      const chainId = await provider.send("eth_chainId", []);
      setCurrentChainId(chainId);

      if (expectedChainHex && chainId !== expectedChainHex) {
        setStatus(`Switch wallet network to chain ${Number(appConfig.arcChainId)}.`);
        return;
      }

      const { safeTransfer, usdc } = await getContracts();
      const [owner, payer, recipient, usdcToken] = await safeTransfer.getConfig();
      const nextConfig = { owner, payer, recipient, usdcToken };
      setConfig(nextConfig);
      setPayerInput((current) => current || payer);
      setRecipientInput((current) => current || recipient);

      const [availableIds, completedIds] = await Promise.all([
        safeTransfer.getAvailableTransfers(),
        safeTransfer.getCompletedTransfers()
      ]);

      setAvailableTransfers(await loadTransfers(safeTransfer, availableIds));
      setCompletedTransfers(await loadTransfers(safeTransfer, completedIds));

      if (usdc && account) {
        const [tokenDecimals, tokenBalance, tokenAllowance, tokenContractBalance, tokenPendingAmount] = await Promise.all([
          usdc.decimals(),
          usdc.balanceOf(account),
          usdc.allowance(account, appConfig.contractAddress),
          usdc.balanceOf(appConfig.contractAddress),
          safeTransfer.totalPendingAmount()
        ]);
        setDecimals(Number(tokenDecimals));
        setBalance(tokenBalance);
        setAllowance(tokenAllowance);
        setContractBalance(tokenContractBalance);
        setPendingAmount(tokenPendingAmount);
      }
    } catch (error) {
      setStatus(readError(error));
    }
  }, [account, expectedChainHex, getContracts, getProvider, hasContract]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? accounts : [];
      setAccount(typeof nextAccounts[0] === "string" ? nextAccounts[0] : "");
    };

    const handleChainChanged = (chainId: unknown) => {
      setCurrentChainId(typeof chainId === "string" ? chainId : "");
      void refresh();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refresh]);

  const runTransaction = async (label: string, action: () => Promise<{ wait: () => Promise<unknown> }>) => {
    setBusy(true);
    setStatus(`${label} submitted...`);
    try {
      const tx = await action();
      await tx.wait();
      setStatus(`${label} confirmed.`);
      await refresh();
    } catch (error) {
      setStatus(readError(error));
    } finally {
      setBusy(false);
    }
  };

  const setPayer = async () => {
    if (!isAddress(payerInput)) {
      setStatus("Enter a valid payer address.");
      return;
    }
    const { safeTransfer } = await getContracts(true);
    await runTransaction("Payer update", () => safeTransfer.setPayer(payerInput));
  };

  const setRecipient = async () => {
    if (!isAddress(recipientInput)) {
      setStatus("Enter a valid recipient address.");
      return;
    }
    const { safeTransfer } = await getContracts(true);
    await runTransaction("Recipient update", () => safeTransfer.setRecipient(recipientInput));
  };

  const approveSpend = async () => {
    const parsedAmount = parseAmount(amountInput, decimals);
    const { usdc } = await getContracts(true);
    if (!usdc) throw new Error("USDC token is not configured.");
    await runTransaction("USDC approval", () => usdc.approve(appConfig.contractAddress, parsedAmount));
  };

  const deposit = async () => {
    const parsedAmount = parseAmount(amountInput, decimals);
    const { safeTransfer } = await getContracts(true);
    await runTransaction("Deposit", () => safeTransfer.deposit(parsedAmount, memo, reference));
    setAmountInput("");
    setMemo("");
    setReference("");
  };

  const withdraw = async (transferId: bigint) => {
    const { safeTransfer } = await getContracts(true);
    await runTransaction(`Withdrawal ${transferId.toString()}`, () => safeTransfer.withdraw(transferId));
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Arc reference implementation</p>
          <h1>Corporate Safe Transfer</h1>
          <p className="summary">
            Use a smart contract to make a recurring corporate USDC transfer safer, more auditable, and less prone to address-entry mistakes.
          </p>
        </div>
        <div className="walletBox">
          <span>{account ? shorten(account) : "No wallet connected"}</span>
          <button onClick={connectWallet}>{account ? "Reconnect" : "Connect Wallet"}</button>
        </div>
      </header>

      <section className="statusBand">
        <span>{contractUrlLabel}</span>
        <div className="statusActions">
          <strong>{status}</strong>
          {isWrongNetwork && <button onClick={switchNetwork}>Switch Network</button>}
        </div>
      </section>

      <nav className="tabs" aria-label="Workflow panels">
        {([
          ["admin", "CFO Admin"],
          ["pay", "Deposit USDC"],
          ["receive", "Withdraw USDC"]
        ] as const).map(([key, label]) => (
          <button key={key} className={activeTab === key ? "active" : ""} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "admin" && (
        <section className="panel">
          <PanelHeader role="Mary" title="Admin Panel" description="CFO, owner, and deployer configures the trusted payer and recipient wallets." />
          <h3 className="sectionLabel">Contract Info</h3>
          <dl className="dataGrid">
            <Data label="Connected wallet" value={account || "Not connected"} />
            <Data label="Contract owner" value={config.owner || "Not loaded"} />
            <Data label="Current payer" value={config.payer || "Not set"} />
            <Data label="Current recipient" value={config.recipient || "Not set"} />
            <Data label="USDC token" value={config.usdcToken || appConfig.usdcAddress || "Not configured"} />
            <Data label="Contract USDC balance" value={formatToken(contractBalance, decimals)} />
            <Data label="Pending transfer total" value={formatToken(pendingAmount, decimals)} />
          </dl>
          <h3 className="sectionLabel">Contract Actions</h3>
          <div className="formGrid two">
            <label>
              Set payer wallet
              <input value={payerInput} onChange={(event) => setPayerInput(event.target.value)} placeholder="0x..." />
            </label>
            <label>
              Set recipient wallet
              <input value={recipientInput} onChange={(event) => setRecipientInput(event.target.value)} placeholder="0x..." />
            </label>
            <button disabled={!isOwner || busy} onClick={setPayer}>Set Payer</button>
            <button disabled={!isOwner || busy} onClick={setRecipient}>Set Recipient</button>
          </div>
        </section>
      )}

      {activeTab === "pay" && (
        <section className="panel">
          <PanelHeader role="Ralph" title="Pay Panel" description="U.S.-based accountant funds the contract without entering Rita's wallet address." />
          <h3 className="sectionLabel">Contract Information</h3>
          <dl className="dataGrid">
            <Data label="Connected wallet" value={account || "Not connected"} />
            <Data label="Authorized payer" value={isPayer ? "Yes" : "No"} />
            <Data label="Recipient wallet" value={config.recipient || "Not set"} />
            <Data label="USDC balance" value={formatToken(balance, decimals)} />
            <Data label="USDC approved for deposits" value={formatToken(allowance, decimals)} />
            <Data label="Contract USDC balance" value={formatToken(contractBalance, decimals)} />
            <Data label="Pending transfer total" value={formatToken(pendingAmount, decimals)} />
          </dl>
          <h3 className="sectionLabel">Contract Actions</h3>
          <p className="actionNote">NOTE: You must approve a spendable amount before making any deposits.</p>
          <div className="formGrid">
            <label>
              Amount USDC
              <input value={amountInput} onChange={(event) => setAmountInput(event.target.value)} placeholder="1000.00" inputMode="decimal" />
            </label>
            <label>
              Memo
              <textarea value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={200} placeholder="Sydney subsidiary operating funds" />
            </label>
            <label>
              Internal reference
              <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200} placeholder="AP-2026-05-001" />
            </label>
            <div className="buttonRow">
              <button disabled={!isPayer || busy || !amountInput} onClick={approveSpend}>Approve USDC Spend</button>
              <button disabled={!isPayer || busy || !amountInput || !memo || !reference} onClick={deposit}>Deposit USDC</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "receive" && (
        <section className="panel">
          <PanelHeader role="Rita" title="Receive Panel" description="Sydney-based accountant reviews and withdraws available transfers." />
          <dl className="dataGrid compact">
            <Data label="Connected wallet" value={account || "Not connected"} />
            <Data label="Authorized recipient" value={isRecipient ? "Yes" : "No"} />
          </dl>
          <TransferList title="Available transfers" transfers={availableTransfers} decimals={decimals} canWithdraw={isRecipient && !busy} onWithdraw={withdraw} />
          <TransferList title="Completed transfers" transfers={completedTransfers} decimals={decimals} canWithdraw={false} onWithdraw={withdraw} />
        </section>
      )}
    </main>
  );
}

function PanelHeader({ role, title, description }: { role: string; title: string; description: string }) {
  return (
    <div className="panelHeader">
      <span>{role}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TransferList({
  title,
  transfers,
  decimals,
  canWithdraw,
  onWithdraw
}: {
  title: string;
  transfers: TransferRecord[];
  decimals: number;
  canWithdraw: boolean;
  onWithdraw: (transferId: bigint) => Promise<void>;
}) {
  return (
    <section className="transferSection">
      <h3>{title}</h3>
      {transfers.length === 0 ? (
        <p className="emptyState">No transfers found.</p>
      ) : (
        <div className="transferTable">
          {transfers.map((transfer) => (
            <article className="transferRow" key={transfer.id.toString()}>
              <div>
                <span>Transfer #{transfer.id.toString()}</span>
                <strong>{formatUnits(transfer.amount, decimals)} USDC</strong>
              </div>
              <div>
                <span>Memo</span>
                <strong>{transfer.memo}</strong>
              </div>
              <div>
                <span>Reference</span>
                <strong>{transfer.internalReference}</strong>
              </div>
              <div>
                <span>Funded by</span>
                <strong>{shorten(transfer.fundedBy)}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{formatTimestamp(transfer.createdAt)}</strong>
              </div>
              <button disabled={!canWithdraw || transfer.withdrawn} onClick={() => onWithdraw(transfer.id)}>
                Withdraw
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

async function loadTransfers(safeTransfer: Contract, transferIds: bigint[]) {
  const transfers = await Promise.all(transferIds.map((id) => safeTransfer.getTransfer(id)));
  return transfers.map((transfer) => ({
    id: transfer.id,
    amount: transfer.amount,
    memo: transfer.memo,
    internalReference: transfer.internalReference,
    fundedBy: transfer.fundedBy,
    withdrawn: transfer.withdrawn,
    createdAt: transfer.createdAt,
    withdrawnAt: transfer.withdrawnAt
  }));
}

function parseAmount(value: string, decimals: number) {
  if (!value || Number(value) <= 0) {
    throw new Error("Enter an amount greater than zero.");
  }

  return parseUnits(value, decimals);
}

function formatToken(value: bigint | null, decimals: number) {
  if (value === null) return "Not loaded";
  return `${formatUnits(value, decimals)} USDC`;
}

function shorten(value: string) {
  if (!value) return "";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTimestamp(value: bigint) {
  if (value === 0n) return "Not set";
  return new Date(Number(value) * 1000).toLocaleString();
}

function readError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}
