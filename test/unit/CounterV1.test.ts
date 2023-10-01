import { expect, assert } from "chai";
import { ethers, network } from "hardhat";
import { CounterV1, CounterV1__factory } from "../../typechain-types";

// Function
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

// Data
import {
  ADDRESS_ZERO,
  REWARD_AMOUNT,
  developmentChains,
} from "../../helper-hardhat-config";

// Types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers/src.ts/ethers";
import { BigNumber } from "ethers";

// ------------

describe("CounterV1", function () {
  beforeEach(async () => {
    if (!developmentChains.includes(network.name)) {
      throw new Error(
        "You need to be on a development chain to run unit tests"
      );
    }
  });

  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  type DeployFixture = {
    deployer: SignerWithAddress;
    counterV1: CounterV1;
  };
  async function deployTokenFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const counterV1Factory: CounterV1__factory =
      await ethers.getContractFactory("CounterV1", deployer);
    const counterV1: CounterV1 = await counterV1Factory.deploy();
    await counterV1.deployed();

    return { deployer, counterV1 };
  }

  describe("#inc", function () {
    it("should increase the count value by one", async function () {
      const { deployer, counterV1 } = await loadFixture(deployTokenFixture);

      const countBeforeInc: BigNumber = await counterV1.count();
      await counterV1.inc();
      const countAfterInc: BigNumber = await counterV1.count();

      assert.equal(countBeforeInc.toString(), "0");
      assert.equal(countAfterInc.toString(), "1");
    });
  });
});
