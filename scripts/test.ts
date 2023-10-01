import { ethers, network } from "hardhat";
import jsonContracts from "../deployed-contracts.json";
import { Proxy, CounterV1, CounterV2, ProxyAdmin } from "../typechain-types";
import { REWARD_AMOUNT, STAKING_DURATION } from "../helper-hardhat-config";
import { BigNumber } from "ethers";
// ---

/*
  Make new staking 
*/

async function listStake() {
  const [deployer, user] = await ethers.getSigners();
  const networkName: string = network.name;
  const contracts = Object(jsonContracts);
  if (
    !contracts[networkName].CounterV1 ||
    !contracts[networkName].CounterV2 ||
    !contracts[networkName].Proxy
  ) {
    throw new Error("Contracts are not deployed yet");
  }
  if (networkName === "hardhat") {
    throw new Error("Can't run scripts to hardhat network deployed contract");
  }
  const counterV1: CounterV1 = await ethers.getContractAt(
    "CounterV1",
    contracts[networkName].CounterV1,
    deployer
  );

  const counterV2: CounterV2 = await ethers.getContractAt(
    "CounterV2",
    contracts[networkName].CounterV2,
    deployer
  );

  const proxy: Proxy = await ethers.getContractAt(
    "Proxy",
    contracts[networkName].Proxy,
    deployer
  );
  const proxyAdmin: ProxyAdmin = await ethers.getContractAt(
    "ProxyAdmin",
    contracts[networkName].ProxyAdmin,
    deployer
  );

  try {
    // Set the `ProxyAdmin` to be the admin of the `Proxy`
    await proxy.changeAdmin(proxyAdmin.address);

    let implementation = await proxyAdmin.getProxyImplementation(proxy.address);
    let admin = await proxyAdmin.getProxyAdmin(proxy.address);

    console.log(`Implementation: ${implementation}`);
    console.log(`Admin: ${admin}`);

    // Change implementation to the `CounterV1` contract
    await proxyAdmin.upgrade(proxy.address, counterV1.address);

    implementation = await proxyAdmin.getProxyImplementation(proxy.address);
    admin = await proxyAdmin.getProxyAdmin(proxy.address);

    console.log("\n--------------------------\n");
    console.log("Updating implementation to `CounterV1`");
    console.log(`Implementation: ${implementation}`);

    // Call increment count using the `Proxy` contract
    console.log("Increase");
    await counterV1.attach(proxy.address).inc();
    let count = await counterV1.attach(proxy.address).count();
    console.log(count);

    console.log("\n--------------------------\n");

    // Set implementation to the `CounterV2` contract
    console.log("Updating implementation to `CounterV2`");
    await proxyAdmin.upgrade(proxy.address, counterV2.address);
    implementation = await proxyAdmin.getProxyImplementation(proxy.address);
    console.log(`Implementation: ${implementation}`);

    // Call increment count using the `Proxy` contract
    console.log("Increase");
    await counterV2.attach(proxy.address).inc();
    count = await counterV2.attach(proxy.address).count();
    console.log(count);

    // Call decrease count using the `Proxy` contract
    console.log("Decrease");
    await counterV2.attach(proxy.address).dec();
    count = await counterV2.attach(proxy.address).count();
    console.log(count);
  } catch (err) {
    console.log(err);
    console.log("----------------------");
    throw new Error(`Failed to test`);
  }

  return proxy;
}

listStake()
  .then((proxy) => {
    console.log("----------------------");
    console.log(`Tested successfully`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
