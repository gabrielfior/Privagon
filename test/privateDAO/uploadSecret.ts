import { expect } from "chai";
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
    console.log(instance);
  });

  it("Mint 100 tokens to owner", async () => {
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
    const balanceAlice = await fetchBalance(alice, hardhatToken, instance);
    console.log("balanceAlice", balanceAlice);
    expect(balance).to.equal(mintAmount);
    expect(balanceAlice).to.equal(mintAmount);
  });
});
