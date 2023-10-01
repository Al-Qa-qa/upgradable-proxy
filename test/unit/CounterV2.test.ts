import { expect, assert } from "chai";
import { ethers, network } from "hardhat";
import { CounterV2, CounterV2__factory } from "../../typechain-types";

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
    counterV2: CounterV2;
  };
  async function deployTokenFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const counterV2Factory: CounterV2__factory =
      await ethers.getContractFactory("CounterV2", deployer);
    const counterV2: CounterV2 = await counterV2Factory.deploy();
    await counterV2.deployed();

    return { deployer, counterV2 };
  }

  describe("#inc & #dec", function () {
    it("should increase the count value by one and decrease it by one", async function () {
      const { deployer, counterV2 } = await loadFixture(deployTokenFixture);

      const countBeforeInc: BigNumber = await counterV2.count();
      await counterV2.inc();
      const countAfterInc: BigNumber = await counterV2.count();
      await counterV2.dec();
      const countAfterDec: BigNumber = await counterV2.count();

      assert.equal(countBeforeInc.toString(), "0");
      assert.equal(countAfterInc.toString(), "1");
      assert.equal(countAfterDec.toString(), "0");
    });
  });
});
