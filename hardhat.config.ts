import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const privateKey = process.env.PRIVATE_KEY;
const arcRpcUrl = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    arc: {
      url: arcRpcUrl,
      accounts: privateKey ? [privateKey] : [],
      chainId: Number(process.env.ARC_CHAIN_ID || 5042002)
    }
  },
  etherscan: {
    apiKey: {
      arc: process.env.ARCSCAN_API_KEY || "arcscan"
    },
    customChains: [
      {
        network: "arc",
        chainId: 5042002,
        urls: {
          apiURL: process.env.ARCSCAN_API_URL || "https://testnet.arcscan.app/api",
          browserURL: process.env.ARCSCAN_BROWSER_URL || "https://testnet.arcscan.app"
        }
      }
    ]
  }
};

export default config;
