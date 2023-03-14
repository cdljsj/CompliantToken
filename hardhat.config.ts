import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'hardhat-deploy';
import { node_url, accounts } from './utils/network'

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 1
    },
    tokenIssuer: {
      default: 1
    },
    tokenHolder1: {
      default: 2
    },
    tokenHolder2: {
      default: 3
    }
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      gas: 5000000,
    },
    bsctest: {
      url: node_url('bsctest'),
      accounts: accounts()
    },
  }
};

export default config;
