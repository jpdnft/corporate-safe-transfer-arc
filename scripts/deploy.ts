import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const usdcTokenAddress = process.env.USDC_CONTRACT_ADDRESS;

  if (!usdcTokenAddress) {
    throw new Error("USDC_CONTRACT_ADDRESS is required");
  }

  const [deployer] = await ethers.getSigners();
  const CorporateSafeTransfer = await ethers.getContractFactory("CorporateSafeTransfer");
  const corporateSafeTransfer = await CorporateSafeTransfer.deploy(usdcTokenAddress);

  await corporateSafeTransfer.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("USDC token:", usdcTokenAddress);
  console.log("CorporateSafeTransfer:", await corporateSafeTransfer.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
