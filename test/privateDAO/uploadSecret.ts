import { expect } from "chai";
import * as crypto from "crypto";
import * as fhevm from "fhevmjs";
import * as hre from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { fetchBalance, waitForBlock } from "./utils";

describe("Token contract", () => {
  let instance: fhevm.FhevmInstance;
  let provider: hre.ethers.JSONRPCProvider;

  before(async () => {
    provider = hre.ethers.provider;
    // 1. Get chain id
    const blockNumber = await provider.getBlockNumber();
    console.log("Current block number: " + blockNumber);

    const network = await provider.getNetwork();
    const chainId = +network.chainId.toString(); // Need to be a number

    //   // Get blockchain public key
    const publicKey = await provider.call({ to: "0x0000000000000000000000000000000000000044" });
    instance = await fhevm.createInstance({ chainId, publicKey });
    //console.log(instance);
  });

  // Working
  it.skip("Mint tokens to owner, transfer tokens to Alice", async () => {
    const [owner, alice] = await hre.ethers.getSigners();

    console.log("owner", owner.address, "alice", alice.address);
    const hardhatToken = await hre.ethers.deployContract("EncryptedERC20");
    //console.log("hardhat Token", await hardhatToken.contractOwner());
    await waitForBlock(hre);
    // mint
    const mintAmount = 1000;
    const resultUint32 = instance.encrypt32(mintAmount);
    await hardhatToken.mint(resultUint32);
    await hardhatToken.mint(resultUint32);
    await waitForBlock(hre);
    // transfer to Alice
    console.log("Sending transaction");
    const transaction = await hardhatToken["transfer(address,bytes)"](alice.address, resultUint32);
    console.log("Waiting for transaction validation...");
    //await transaction.wait(); // not working
    //await provider.waitForTransaction(transaction.hash);
    // transfer to Bob

    // transfer to Charlie

    await waitForBlock(hre);

    // balance
    const balance = await fetchBalance(owner, hardhatToken, instance);
    console.log("balanceOwner", balance);
    expect(balance).to.equal(mintAmount);
    // ToDo - Not working for 2nd user, balance seems OK though
    // const balanceAlice = await fetchBalance(alice, hardhatToken, instance);
    // console.log("balanceAlice", balanceAlice);
    //expect(balanceAlice).to.equal(mintAmount);
  });

  it("Upload secret", async () => {
    const [owner, alice] = await hre.ethers.getSigners();

    console.log("owner", owner.address, "alice", alice.address);
    //const hardhatToken = await hre.ethers.deployContract("EncryptedERC20");

    const minMemberTokenBalance = instance.encrypt32(Number(100));
    const { deploy } = hre.deployments;

    const privateDAODeploy = await deploy("PrivateDAO", {
      from: owner.address,
      args: [minMemberTokenBalance],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    const privateDAO = await hre.ethers.getContractAt("PrivateDAO", privateDAODeploy.address);

    //console.log("hardhat Token", await hardhatToken.contractOwner());
    await waitForBlock(hre);
    // mint
    const mintAmount = 1000;
    const resultUint32 = instance.encrypt32(mintAmount);
    await privateDAO.mint(resultUint32);
    await waitForBlock(hre);

    // upload secret
    let key = crypto.randomBytes(32);
    let keyArray = [];
    for (let i = 0; i <= key.length / 4; i++) {
      const partialKey = key.slice(i * 4, (i + 1) * 4);
      const intPartialKey = parseInt(partialKey.toString("hex"), 16);
      const encryptedPartialKey = instance.encrypt32(intPartialKey);
      keyArray.push(encryptedPartialKey);
    }
    console.log("keyArray", keyArray);
    await privateDAO.uploadSecret(keyArray);
    const secretId = 1;

    // ToDo retrieve encrypted secret
    const secret = await privateDAO.getSecret();
  });

  it.skip("encrypt key", async () => {
    const key = crypto.randomBytes(32);
    let partialKey = key.slice(0, 4);
    const intPartialKey = parseInt(partialKey.toString("hex"), 16);
    console.log("int", intPartialKey);
    const encryptedPartialKey = instance.encrypt32(intPartialKey);
    console.log("encryptPartKey", encryptedPartialKey);
    // decrypt
    const decrypted = instance.decrypt(null, encryptedPartialKey);
    console.log("decrypted", decrypted);
  });

  it.skip("create proposal", async () => {});

  it.skip("vote", async () => {});

  it.skip("getResult", async () => {});
});
