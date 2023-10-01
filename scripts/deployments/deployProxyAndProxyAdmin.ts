// Packages
import * as fs from "fs";
import * as path from "path";
import { ethers, network } from "hardhat";

// Functions
import { log, verify } from "../../helper-functions";

// Data
import {
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../../helper-hardhat-config";

// Types
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  Proxy,
  Proxy__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
} from "../../typechain-types";
import { BigNumber } from "ethers";

// ---

/**
 * Type of the deployed contract that will be stored in deployed-contracts.json file
 *
 * example:
 *  {
 *    "hardhat": {
 *      "contractName": "contractAddress"
 *    }
 *  }
 */
type DeployedContracts = {
  [key: string]: {
    [key: string]: string;
  };
};

/**
 * Deploy Staking Rewards Contract
 *
 * @param chainId the Id of the network we will deploy on it
 * @param tokenStaking the address of the staking ERC20 token
 * @param tokenReward the address of the reward ERC20 token
 * @returns the deployed contract
 */
async function deployProxy(chainId: number) {
  const [deployer]: SignerWithAddress[] = await ethers.getSigners();

  if (developmentChains.includes(network.name)) {
    // Deploy MOCKS if existed
    // You will use chainId to get info of the chain from hardhat-helper-config file
  } else {
    // Do additional thing in case its not a testnet
  }

  // Deploying The Contract
  log(`Deploying contract with the account: ${deployer.address}`);
  const proxyAdminFactory: ProxyAdmin__factory =
    await ethers.getContractFactory("ProxyAdmin", deployer);
  log("Deploying Contract...");
  const proxyAdmin: ProxyAdmin = await proxyAdminFactory.deploy();
  await proxyAdmin.deployed();

  log(`ProxyAdmin deployed to: ${proxyAdmin.address}`);
  log("", "separator");

  // Deploying The Contract
  log(`Deploying contract with the account: ${deployer.address}`);
  const proxyFactory: Proxy__factory = await ethers.getContractFactory(
    "Proxy",
    deployer
  );
  log("Deploying Contract...");
  const proxy: Proxy = await proxyFactory.deploy(proxyAdmin.address);
  await proxy.deployed();

  log(`Proxy deployed to: ${proxy.address}`);
  log("", "separator");

  if (!developmentChains.includes(network.name)) {
    // Verify Contract if it isnt in a development chain
    log("Verifying Contract", "title");
    await proxy.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS);
    await verify(proxy.address, []);
    await proxyAdmin.deployTransaction.wait(VERIFICATION_BLOCK_CONFIRMATIONS);
    await verify(proxyAdmin.address, []);
    log("verified successfully");
  }

  // Storing contract address to connect to it later
  log("Storing contract address", "title");
  const parentDir: string = path.resolve(__dirname, "../../");
  const deployedContractsPath: string = path.join(
    parentDir,
    "deployed-contracts.json"
  );
  const oldContracts: DeployedContracts = JSON.parse(
    fs.readFileSync(deployedContractsPath, "utf8")
  );

  // Add the contract to the network we are deploying on it
  if (!oldContracts[network.name]) {
    oldContracts[network.name] = {};
  }
  oldContracts[network.name].Proxy = proxy.address;
  oldContracts[network.name].ProxyAdmin = proxyAdmin.address;
  // Save data in our deployed-contracts file
  fs.writeFileSync(
    deployedContractsPath,
    JSON.stringify(oldContracts, null, 2)
  );
  log("Stored Succesfully");
  log("", "separator");
  return { proxy, proxyAdmin };
}

export default deployProxy;
