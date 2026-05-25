# Corporate Safe Transfer on Arc

A public reference implementation and proof of concept for a corporate-safe USDC transfer workflow on Arc.

The demo shows how a company can use an EVM-compatible smart contract to make a recurring corporate stablecoin transfer safer, more auditable, and less prone to payment-address mistakes.

## Business Use Case

XYZ Corp has a U.S.-based finance team and an overseas subsidiary. The company periodically sends USDC to the subsidiary. Instead of asking accounting staff to paste a recipient wallet address for every payment, an authorized owner configures the approved payer and recipient once.

After that:

- Ralph, the U.S.-based accountant, can fund the contract only from the approved payer wallet.
- Ralph never enters Rita's recipient address during payment.
- Rita, the Sydney-based accountant, can withdraw only from the approved recipient wallet.
- Each transfer is tracked separately with amount, memo, reference, timestamps, and withdrawal status.

This reduces a common operational failure mode: a legitimate finance user sending funds to the wrong address because of clipboard mistakes, stale instructions, phishing, or manual routing errors.

## Why Arc

Arc is an EVM-compatible Layer 1 blockchain. Standard Solidity, Hardhat, OpenZeppelin, Ethers.js, and wallet tooling can be used for this proof of concept.

The Arc-specific business framing is especially useful for enterprise workflows because USDC is the native gas token on Arc. Users do not need to hold a separate volatile asset such as ETH just to pay transaction fees.

Why USDC-as-gas matters:

- Simpler onboarding for finance and accounting users.
- Fewer treasury assets to acquire, custody, and reconcile.
- More intuitive cost accounting because the operating asset and gas asset are both USDC.
- Less exposure to volatile gas-token balances for routine operational payments.

## Roles

Mary - CFO / Owner / Deployer

- Deploys the contract.
- Owns the contract.
- Sets or updates the authorized payer wallet.
- Sets or updates the authorized recipient wallet.

Ralph - U.S.-based Accountant / Payer

- Connects his wallet.
- Approves USDC spend.
- Deposits USDC into the contract only if his wallet matches the authorized payer address.
- Creates a payment record with amount, memo, and internal reference.
- Never manually enters the recipient wallet address.

Rita - Sydney-based Accountant / Recipient

- Connects her wallet.
- Views available and completed transfers.
- Withdraws available USDC transfers only if her wallet matches the authorized recipient address.

## Repository Layout

```text
contracts/CorporateSafeTransfer.sol   Solidity reference contract
contracts/test/MockUSDC.sol           Local mock token with 6 decimals
scripts/deploy.ts                     Hardhat deployment script
test/CorporateSafeTransfer.ts         Smart contract tests
src/app/                              Next.js dApp
src/contracts/                        Frontend ABI definitions
src/lib/config.ts                     Frontend environment config
```

## Contract Summary

`CorporateSafeTransfer` stores:

- owner
- payer
- recipient
- USDC token address
- transfer counter
- mapping of transfer IDs to transfer records

Each transfer includes:

```solidity
struct Transfer {
    uint256 id;
    uint256 amount;
    string memo;
    string internalReference;
    address fundedBy;
    bool withdrawn;
    uint256 createdAt;
    uint256 withdrawnAt;
}
```

The product language uses "reference" throughout the UI and documentation. In Solidity, the struct field is named `internalReference` because `reference` is reserved by the compiler.

Owner functions:

- `setPayer(address newPayer)`
- `setRecipient(address newRecipient)`
- `getConfig()`
- `recoverUntrackedUSDC(address to, uint256 amount)`

The rescue function can only recover USDC that is not reserved for pending transfer records. This covers accidental direct ERC-20 transfers to the contract address without allowing the owner to withdraw funds assigned to Rita's available transfers.

Payer function:

- `deposit(uint256 amount, string calldata memo, string calldata internalReference)`

Recipient function:

- `withdraw(uint256 transferId)`

Read functions:

- `getTransfer(uint256 transferId)`
- `getTransferCount()`
- `getAvailableTransfers()`
- `getCompletedTransfers()`

For frontend practicality, available and completed transfer reads return transfer ID arrays. The dApp then fetches each transfer record by ID.

## dApp Panels

Admin Panel - Mary

- Shows connected wallet, contract owner, current payer, current recipient, and USDC token address.
- Lets the owner set payer and recipient addresses.
- Disables owner actions when the connected wallet is not the owner.

Pay Panel - Ralph

- Shows connected wallet, payer authorization status, recipient address, USDC balance, and USDC allowance.
- Lets the payer approve USDC spend.
- Lets the payer deposit USDC with amount, memo, and internal reference.
- Does not include any recipient address input.

Receive Panel - Rita

- Shows connected wallet and recipient authorization status.
- Lists available transfers and completed transfers.
- Lets the recipient withdraw available transfers.

## Local Setup

Install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Environment Variables

Hardhat deployment:

```env
PRIVATE_KEY=
ARC_RPC_URL=
ARC_CHAIN_ID=
USDC_CONTRACT_ADDRESS=
PAYER_ADDRESS=
RECIPIENT_ADDRESS=
ARCSCAN_API_KEY=
ARCSCAN_API_URL=
ARCSCAN_BROWSER_URL=
```

Frontend:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_ARC_CHAIN_ID=
```

Notes:

- `USDC_CONTRACT_ADDRESS` is used by the deployment script.
- `PAYER_ADDRESS` and `RECIPIENT_ADDRESS` are used by the Arc demo deployment script.
- `ARCSCAN_API_KEY`, `ARCSCAN_API_URL`, and `ARCSCAN_BROWSER_URL` are optional verification settings. Defaults target Arc Testnet Arcscan.
- `NEXT_PUBLIC_CONTRACT_ADDRESS` is the deployed `CorporateSafeTransfer` contract.
- `NEXT_PUBLIC_USDC_ADDRESS` should match the USDC token used by the deployed contract.
- `ARC_CHAIN_ID` and `NEXT_PUBLIC_ARC_CHAIN_ID` are left configurable because public Arc testnet details may change.

## Compile

```bash
npm run compile
```

## Run Tests

```bash
npm test
```

The smart contract tests cover:

- deployer becomes owner
- owner can set payer
- owner can set recipient
- non-owner cannot set payer or recipient
- only payer can deposit
- deposit fails without approval
- deposit creates transfer record
- only recipient can withdraw
- transfer cannot be withdrawn twice
- owner can update payer and recipient while funds remain in contract
- previous payer cannot deposit after being replaced
- previous recipient cannot withdraw after being replaced

## Local Deployment

Start a local Hardhat node:

```bash
npx hardhat node
```

In another terminal, deploy a mock USDC token or set `USDC_CONTRACT_ADDRESS` to an existing local token address, then run:

```bash
npm run deploy:local
```

For a richer local demo, deploy `MockUSDC`, mint tokens to Ralph, and use the deployed mock token address as `USDC_CONTRACT_ADDRESS`.

## Arc Testnet Deployment

Set:

```env
PRIVATE_KEY=
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
USDC_CONTRACT_ADDRESS=0x3600000000000000000000000000000000000000
PAYER_ADDRESS=
RECIPIENT_ADDRESS=
```

`PRIVATE_KEY` should be Mary's deployer wallet. `PAYER_ADDRESS` should be Ralph's wallet, and `RECIPIENT_ADDRESS` should be Rita's wallet.

Mary needs Arc Testnet USDC for deployment gas and role-configuration transactions. Ralph needs Arc Testnet USDC for deposits and gas. Rita needs Arc Testnet USDC for withdrawal gas.

Deploy and configure roles in one step:

```bash
npm run deploy:arc:demo
```

The script prints the deployed contract address and the frontend environment variables.

Verify the contract source on Arcscan:

```bash
npx hardhat verify --network arc <DEPLOYED_CONTRACT_ADDRESS> 0x3600000000000000000000000000000000000000
```

Arcscan is Blockscout-based. If automated Hardhat verification is unavailable or temporarily unstable, use the Arcscan contract verification UI and the same constructor argument.

## Frontend Usage

Set:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_USDC_ADDRESS=
NEXT_PUBLIC_ARC_CHAIN_ID=
```

Start the app:

```bash
npm run dev
```

Open the local Next.js URL shown in the terminal, usually:

```text
http://localhost:3000
```

Walkthrough:

1. Mary connects the owner wallet and sets Ralph as payer and Rita as recipient.
2. Ralph connects the payer wallet, approves USDC spend, and deposits USDC with a memo and internal reference.
3. Rita connects the recipient wallet, reviews available transfers, and withdraws funds.

## Security Limitations

This repository is a proof of concept and is not production-ready financial software.

Important limitations:

- Single-owner administration.
- No multisig requirement.
- No compliance or sanctions screening.
- No transaction limits.
- No cancellation or refund flow.
- No emergency pause.
- No upgrade strategy.
- No indexed accounting export pipeline.
- No frontend domain or wallet-risk protections.
- No contract audit.
- Rescue functionality is intentionally narrow and still depends on trusted ownership.

## Production Considerations

A production version should consider:

- multisig ownership instead of a single owner wallet
- stronger access control and role management
- contract audit
- compliance screening
- sanctions screening
- transaction limits
- cancellation and refund logic
- emergency pause
- richer accounting exports
- better event indexing
- formal verification if appropriate
- secure key management
- frontend phishing protection
- monitoring and alerting

## Disclaimer

This software is provided for educational and demonstration purposes only. It is not financial, legal, tax, accounting, compliance, or security advice.

Use at your own risk. Do not use this proof of concept to custody or transfer production funds without independent engineering review, legal review, compliance review, and a professional smart contract audit.
