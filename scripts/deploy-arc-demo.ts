import { ethers } from "hardhat";
import "dotenv/config";

const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

function requireAddress(name: string) {
  const value = process.env[name];

  if (!value || !ethers.isAddress(value)) {
    throw new Error(`${name} must be set to a valid address`);
  }

  return value;
}

async function main() {
  const [mary] = await ethers.getSigners();
  const payer = requireAddress("PAYER_ADDRESS");
  const recipient = requireAddress("RECIPIENT_ADDRESS");
  const usdcTokenAddress = process.env.USDC_CONTRACT_ADDRESS || ARC_TESTNET_USDC_ADDRESS;

  if (!ethers.isAddress(usdcTokenAddress)) {
    throw new Error("USDC_CONTRACT_ADDRESS must be a valid address");
  }

  const CorporateSafeTransfer = await ethers.getContractFactory("CorporateSafeTransfer");
  const safeTransfer = await CorporateSafeTransfer.deploy(usdcTokenAddress);
  await safeTransfer.waitForDeployment();

  await (await safeTransfer.setPayer(payer)).wait();
  await (await safeTransfer.setRecipient(recipient)).wait();

  const contractAddress = await safeTransfer.getAddress();

  console.log("Arc Testnet demo deployed");
  console.log("");
  console.log("Mary / CFO owner:", mary.address);
  console.log("Ralph / payer:", payer);
  console.log("Rita / recipient:", recipient);
  console.log("");
  console.log("USDC ERC-20 interface:", usdcTokenAddress);
  console.log("CorporateSafeTransfer:", contractAddress);
  console.log("");
  console.log("Add these to .env.local, then restart the Next dev server:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcTokenAddress}`);
  console.log("NEXT_PUBLIC_ARC_CHAIN_ID=5042002");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
