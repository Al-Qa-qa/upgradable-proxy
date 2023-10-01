import { ethers, BigNumber } from "ethers";

type NetworkConfigItem = {
  name: string;
};

type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};

export const networkConfig: NetworkConfigMap = {
  default: {
    name: "hardhat",
  },
  31337: {
    name: "localhost",
  },
  1: {
    name: "mainnet",
  },
  11155111: {
    name: "sepolia",
  },
  137: {
    name: "polygon",
  },
};

export const ADDRESS_ZERO: string = ethers.constants.AddressZero;
export const ONE_MONTH: number = 30 * 24 * 60 * 60;
export const ONE_DAY: number = 24 * 60 * 60;
// 1 token per second
export const REWARD_AMOUNT: BigNumber = ethers.utils.parseUnits(
  ONE_MONTH.toString()
);
export const ONE_TOKEN = ethers.utils.parseUnits("1");
export const STAKING_DURATION: number = ONE_MONTH; // 30 days
export const STAKING_AMOUNT: BigNumber = ethers.utils.parseUnits("100"); // 10 tokens

export const developmentChains: string[] = ["hardhat", "localhost"];
export const VERIFICATION_BLOCK_CONFIRMATIONS = 6;
