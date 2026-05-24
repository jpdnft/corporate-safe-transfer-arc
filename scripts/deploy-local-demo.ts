import { ethers } from "hardhat";

async function main() {
  const [mary, ralph, rita] = await ethers.getSigners();

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();

  const CorporateSafeTransfer = await ethers.getContractFactory("CorporateSafeTransfer");
  const safeTransfer = await CorporateSafeTransfer.deploy(await mockUSDC.getAddress());
  await safeTransfer.waitForDeployment();

  await safeTransfer.setPayer(ralph.address);
  await safeTransfer.setRecipient(rita.address);

  const ralphFunding = ethers.parseUnits("10000", 6);
  await mockUSDC.mint(ralph.address, ralphFunding);

  console.log("Local demo deployed");
  console.log("");
  console.log("Mary / CFO owner:", mary.address);
  console.log("Ralph / payer:", ralph.address);
  console.log("Rita / recipient:", rita.address);
  console.log("");
  console.log("Mock USDC:", await mockUSDC.getAddress());
  console.log("CorporateSafeTransfer:", await safeTransfer.getAddress());
  console.log("");
  console.log("Add these to .env.local, then restart the Next dev server:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${await safeTransfer.getAddress()}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${await mockUSDC.getAddress()}`);
  console.log("NEXT_PUBLIC_ARC_CHAIN_ID=31337");
  console.log("");
  console.log("Ralph mock USDC minted:", ethers.formatUnits(ralphFunding, 6));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
