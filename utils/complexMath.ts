import { BigNumber } from "ethers";

export function min(x: BigNumber, y: BigNumber): BigNumber {
  return x.lte(y) ? x : y;
}
