import { expect, assert } from "chai";
import { ethers, network } from "hardhat";
import {
  CounterV1,
  CounterV1__factory,
  CounterV2,
  CounterV2__factory,
  Proxy,
  Proxy__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
} from "../../typechain-types";

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

/*
  -
    - Testing interacting with the `CounterV1` through our proxy contract ✅
    - Checking that the values are changed in the proxy contract and not in the `CounterV1` 
      itself (this may be false review this) ✅ 

  - Attacking `CounterV2`
    - Data should be preserved ✅
    - new function should be added ✅
    - no functionality changes ✅

  - Changing the admin After changing implementation ✅
    - Test changing the admin after setting implementation to `CounterV1`
    - It should preserve data if the admin changes
    - The old admin can not change the implementation
    - The new admin can change the implementation to `CounterV2`

    -----------

    - Refactor the code and comment it
    - The script will be as it is
    - deploy to GitHub


*/

// ---

/* We will test proxy and proxyAdmin contracts togethar as they are related to each other */
describe("Proxy & ProxyAdmin", function () {
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
    counterV2: CounterV2;
    proxy: Proxy;
    proxyAdmin: ProxyAdmin;
  };
  async function deployProxyFixture(): Promise<DeployFixture> {
    const [deployer]: SignerWithAddress[] = await ethers.getSigners();

    const counterV1Factory: CounterV1__factory =
      await ethers.getContractFactory("CounterV1", deployer);
    const counterV1: CounterV1 = await counterV1Factory.deploy();
    await counterV1.deployed();

    const counterV2Factory: CounterV2__factory =
      await ethers.getContractFactory("CounterV2", deployer);
    const counterV2: CounterV2 = await counterV2Factory.deploy();
    await counterV2.deployed();

    const proxyAdminFactory: ProxyAdmin__factory =
      await ethers.getContractFactory("ProxyAdmin", deployer);
    const proxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
    await proxyAdmin.deployed();

    const proxyFactory: Proxy__factory = await ethers.getContractFactory(
      "Proxy",
      deployer
    );
    const proxy: Proxy = await proxyFactory.deploy(proxyAdmin.address);
    await proxy.deployed();

    return { deployer, counterV1, counterV2, proxy, proxyAdmin };
  }

  describe("#constructor", function () {
    it("should initialize the admin to `proxyAdmin` address", async function () {
      const { proxy, proxyAdmin } = await loadFixture(deployProxyFixture);

      const admin: string = await proxyAdmin.getProxyAdmin(proxy.address);

      assert.equal(admin, proxyAdmin.address);
    });

    it("should initialize the implementation to `ADDRESS_ZERO`", async function () {
      const { proxy, proxyAdmin } = await loadFixture(deployProxyFixture);

      const implementation: string = await proxyAdmin.getProxyImplementation(
        proxy.address
      );

      assert.equal(implementation, ADDRESS_ZERO);
    });
  });

  describe("Setting implementation", function () {
    it("should not change the implementation address if not the admin tries to change", async function () {
      const { deployer, counterV1, proxy, proxyAdmin } = await loadFixture(
        deployProxyFixture
      );

      const implementationBefore: string =
        await proxyAdmin.getProxyImplementation(proxy.address);

      /* This code will not reverts as the implementation is `ADDRESS_ZERO` */
      await proxy.connect(deployer).upgradeTo(counterV1.address);

      const implementationAfter: string =
        await proxyAdmin.getProxyImplementation(proxy.address);

      assert.equal(implementationBefore, implementationAfter);
    });

    it("changes implementation address if the called is the admin", async function () {
      const { deployer, counterV1, proxy, proxyAdmin } = await loadFixture(
        deployProxyFixture
      );

      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      const implementation: string = await proxyAdmin.getProxyImplementation(
        proxy.address
      );

      assert.equal(implementation, counterV1.address);
    });

    it("should allow firing `CounterV1` functions by our `Proxy` and change values", async function () {
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      await counterV1.attach(proxy.address).inc();

      const proxyCount: BigNumber = await counterV1
        .attach(proxy.address)
        .count();
      const counterV1Count: BigNumber = await counterV1.count();

      assert.equal(proxyCount.toString(), "1");
      assert.equal(counterV1Count.toString(), "0");
    });

    it("reverts if the implementation was set before and not admin tries to change it", async function () {
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      try {
        // This execution will me reverted as non-admin cannot change implementation
        await proxy.connect(deployer).upgradeTo(counterV2.address);
      } catch (err: any) {
        // console.log(err?.message!);
        // This error message can be changed, its a default message by the framework and not manually written in the smart contract
        expect(err.message).to.contain(
          "function selector was not recognized and there's no fallback function"
        );
        return;
      }
      throw new Error("Didn't reverted");
    });

    it("reverts if the implementation address is not a contract address", async function () {
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      const invalidImplementation: string = deployer.address;

      // Updating the implementation should be to a contract not a wallet address
      await expect(
        proxyAdmin.upgrade(proxy.address, invalidImplementation)
      ).to.be.revertedWithCustomError(proxy, "Proxy__NotAContract");
    });
  });

  describe("Updating implementation (upgrade the smart contract)", function () {
    it("should preserve data when changing the implementation address", async function () {
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      await counterV1.attach(proxy.address).inc();

      const countBeforeChangeImplementation: BigNumber = await counterV1
        .attach(proxy.address)
        .count();

      // Update implementation to `CounterV2`
      await proxyAdmin.upgrade(proxy.address, counterV2.address);

      const countAfterChangeImplementation: BigNumber = await counterV2
        .attach(proxy.address)
        .count();

      assert.equal(
        countBeforeChangeImplementation.toString(),
        countAfterChangeImplementation.toString()
      );
    });

    it("increase the functions of the new implementation to the implementation ", async function () {
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      await counterV1.attach(proxy.address).inc(); // count = 1

      // Update implementation to `CounterV2`
      await proxyAdmin.upgrade(proxy.address, counterV2.address);

      await counterV2.attach(proxy.address).inc(); // count = 2
      await counterV2.attach(proxy.address).dec(); // count = 1

      const count: BigNumber = await counterV2.attach(proxy.address).count();

      assert.equal(count.toString(), "1");
    });
  });

  describe("Changing proxyAdmin address", function () {
    it("should change proxyAdmin address successfully", async function () {
      const [, newProxyAdminOwner]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      const oldAdmin: string = await proxyAdmin
        .connect(deployer)
        .getProxyAdmin(proxy.address);

      // Deploying new ProxyAdmin Contract
      const proxyAdminFactory: ProxyAdmin__factory =
        await ethers.getContractFactory("ProxyAdmin", deployer);
      const newProxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
      await newProxyAdmin.deployed();

      // Changing the admin address
      await proxyAdmin
        .connect(deployer)
        .changeProxyAdmin(proxy.address, newProxyAdmin.address);

      // Getting the new
      const newAdmin = await newProxyAdmin
        .connect(newProxyAdminOwner)
        .getProxyAdmin(proxy.address);

      assert.equal(newAdmin, newProxyAdmin.address);
    });

    it("should preserve the data when changing admin", async function () {
      const [, newProxyAdminOwner]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      await counterV1.attach(proxy.address).inc();
      await counterV1.attach(proxy.address).inc();

      const countBeforeChangeAdmin: BigNumber = await counterV1
        .attach(proxy.address)
        .count();

      // Deploying new ProxyAdmin Contract
      const proxyAdminFactory: ProxyAdmin__factory =
        await ethers.getContractFactory("ProxyAdmin", deployer);
      const newProxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
      await newProxyAdmin.deployed();

      // Change the proxyAdmin
      await proxyAdmin.changeProxyAdmin(proxy.address, newProxyAdmin.address);

      const countAfterChangeAdmin: BigNumber = await counterV1
        .attach(proxy.address)
        .count();

      assert.equal(
        countBeforeChangeAdmin.toString(),
        countAfterChangeAdmin.toString()
      );
    });

    it("should allow the new admin to change implementation", async function () {
      const [, newProxyAdminOwner]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      // Deploying new ProxyAdmin Contract
      const proxyAdminFactory: ProxyAdmin__factory =
        await ethers.getContractFactory("ProxyAdmin", newProxyAdminOwner);
      const newProxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
      await newProxyAdmin.deployed();

      // Change the proxyAdmin
      await proxyAdmin.changeProxyAdmin(proxy.address, newProxyAdmin.address);

      await newProxyAdmin
        .connect(newProxyAdminOwner)
        .upgrade(proxy.address, counterV2.address);

      const implementation: string = await newProxyAdmin
        .connect(newProxyAdminOwner)
        .getProxyImplementation(proxy.address);

      assert.equal(implementation, counterV2.address);
    });

    it("reverts when the oldAdmin tries to call proxy admin only functions", async function () {
      const [, newProxyAdminOwner]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      // Deploying new ProxyAdmin Contract
      const proxyAdminFactory: ProxyAdmin__factory =
        await ethers.getContractFactory("ProxyAdmin", newProxyAdminOwner);
      const newProxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
      await newProxyAdmin.deployed();

      // Change the proxyAdmin
      await proxyAdmin.changeProxyAdmin(proxy.address, newProxyAdmin.address);

      // This call will fail as the proxyAdmin changes, so when `staticcall` a function in the `Proxy`
      // it will redirects to the implementation throught `ifAdmin` modifier. And since there is no function
      // named `admin` in the implementation, it will reverts.
      await expect(
        proxyAdmin.connect(deployer).getProxyAdmin(proxy.address)
      ).to.be.revertedWithCustomError(proxyAdmin, "ProxyAdmin__CallingFailed");
    });

    it("reverts when not the admin owner is trying to call `ProxyAdmin` functions", async function () {
      const [, newProxyAdminOwner, hacker]: SignerWithAddress[] =
        await ethers.getSigners();
      const { deployer, counterV1, counterV2, proxy, proxyAdmin } =
        await loadFixture(deployProxyFixture);

      // Update implementation to `CounterV1`
      await proxyAdmin.upgrade(proxy.address, counterV1.address);

      // Deploying new ProxyAdmin Contract
      const proxyAdminFactory: ProxyAdmin__factory =
        await ethers.getContractFactory("ProxyAdmin", newProxyAdminOwner);
      const newProxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
      await newProxyAdmin.deployed();

      // Change the proxyAdmin
      await proxyAdmin.changeProxyAdmin(proxy.address, newProxyAdmin.address);

      // This call will fail as the proxyAdmin changes, so when `staticcall` a function in the `Proxy`
      // it will redirects to the implementation throught `ifAdmin` modifier. And since there is no function
      // named `admin` in the implementation, it will reverts.
      await expect(
        newProxyAdmin
          .connect(hacker)
          .changeProxyAdmin(proxy.address, hacker.address)
      ).to.be.revertedWithCustomError(proxyAdmin, "ProxyAdmin__NotAuthorized");
    });
  });
});
