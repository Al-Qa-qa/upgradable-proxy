import { network } from "hardhat";

export const increaseTime = async (amount: number) => {
  await network.provider.send("evm_increaseTime", [amount]);
  await network.provider.send("evm_mine", []);
};
