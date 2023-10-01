import { network, ethers } from "hardhat";
import { StakingRewards } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

async function logContractData(
  stakingRewards: StakingRewards,
  staker: SignerWithAddress
) {
  const rewardRate = await stakingRewards.getRewardRate();
  const rewardPerToken = await stakingRewards.getRewardPerToken();
  const userRewardPerTokenPaid = await stakingRewards.userRewardPerTokenPaid(
    staker.address
  );
  const userReward = await stakingRewards.rewards(staker.address);
  const userBalance = await stakingRewards.balanceOf(staker.address);
  const userEarnings = await stakingRewards.getUserEarnings(staker.address);

  console.log(`-------------------`);
  console.log(`rewardRate: ${ethers.utils.formatUnits(rewardRate)}`);
  console.log(`rewardPerToken: ${ethers.utils.formatUnits(rewardPerToken)}`);
  console.log(
    `userRewardPerTokenPaid: ${ethers.utils.formatUnits(
      userRewardPerTokenPaid
    )}`
  );
  console.log(`userReward: ${ethers.utils.formatUnits(userReward)}`);
  console.log(`userBalance: ${ethers.utils.formatUnits(userBalance)}`);
  console.log(`userEarnings: ${ethers.utils.formatUnits(userEarnings)}`);
  console.log(`-------------------`);
}

export default logContractData;
