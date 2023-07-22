import { expect } from "chai";
import * as crypto from "crypto";
import * as fhevm from "fhevmjs";
import * as hre from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { PrivateDAO } from "../../types";
import { buildChunkedEncryptedKey, deployPrivateDAO, fetchBalance, mintToOwner, waitForBlock } from "./utils";

describe("Token contract", () => {
  let instance: fhevm.FhevmInstance;
  let provider: hre.ethers.JSONRPCProvider;
  let blockNumber: number;
  let privateDAO: PrivateDAO;
  let owner: hre.ethers.Signer;
  let alice: hre.ethers.Signer;
  let key: Buffer;

  before(async () => {
    provider = hre.ethers.provider;
    // 1. Get chain id
    blockNumber = await provider.getBlockNumber();
    console.log("Current block number: " + blockNumber);

    const network = await provider.getNetwork();
    const chainId = +network.chainId.toString(); // Need to be a number

    //   // Get blockchain public key
    const publicKey = await provider.call({ to: "0x0000000000000000000000000000000000000044" });
    instance = await fhevm.createInstance({ chainId, publicKey });
    key = crypto.randomBytes(32);
  });

  beforeEach(async () => {
    [owner, alice] = await hre.ethers.getSigners();

    console.log("owner", owner.address, "alice", alice.address);
    //const hardhatToken = await hre.ethers.deployContract("EncryptedERC20");
    privateDAO = await deployPrivateDAO(instance, await owner.getAddress());
    //console.log("hardhat Token", await hardhatToken.contractOwner());
    await waitForBlock(hre);
    // mint
    mintToOwner(instance, privateDAO, 1000);
    mintToOwner(instance, privateDAO, 1000);
    await waitForBlock(hre);
  });

  // Working
  it.skip("Mint tokens to owner, transfer tokens to Alice", async () => {
    // transfer to Alice
    const resultUint32 = instance.encrypt32(1000);
    await privateDAO["transfer(address,bytes)"](alice.address, resultUint32);
    console.log("Waiting for transaction validation...");
    //await transaction.wait(); // not working
    //await provider.waitForTransaction(transaction.hash);
    // transfer to Bob

    // transfer to Charlie

    await waitForBlock(hre);

    // balance
    const balance = await fetchBalance(owner, privateDAO, instance);
    console.log("balanceOwner", balance);
    expect(balance).to.equal(1000);
    // ToDo - Not working for 2nd user, balance seems OK though
    // const balanceAlice = await fetchBalance(alice, hardhatToken, instance);
    // console.log("balanceAlice", balanceAlice);
    //expect(balanceAlice).to.equal(mintAmount);
  });

  it("Upload secret", async () => {
    // upload secret
    const keyArray = buildChunkedEncryptedKey(key, instance);
    console.log("keyArray", keyArray);
    await privateDAO.uploadSecret(keyArray);
    const secretId = 1;

    // ToDo retrieve encrypted secret
    const privateDAOAddress = await privateDAO.getAddress();
    const generatedToken = instance.generateToken({
      verifyingContract: privateDAOAddress,
    });

    // Sign the public key
    const signature = await owner.signTypedData(
      generatedToken.token.domain,
      { Reencrypt: generatedToken.token.types.Reencrypt }, // Need to remove EIP712Domain from types
      generatedToken.token.message,
    );

    // Call the method with public key + signature
    const encryptedSecret = await privateDAO.getSecret(1, generatedToken.publicKey, signature);

    // Decrypt the balance
    console.log("decrypting secret");
    const decryptedSecret = instance.decrypt(privateDAOAddress, encryptedSecret);
    console.log("decrypted secret", decryptedSecret);
  });

  //   it.skip("encrypt key", async () => {
  //     const key = crypto.randomBytes(32);
  //     let partialKey = key.slice(0, 4);
  //     const intPartialKey = parseInt(partialKey.toString("hex"), 16);
  //     console.log("int", intPartialKey);
  //     const encryptedPartialKey = instance.encrypt32(intPartialKey);
  //     console.log("encryptPartKey", encryptedPartialKey);
  //     // decrypt
  //     const decrypted = instance.decrypt(null, encryptedPartialKey);
  //     console.log("decrypted", decrypted);
  //   });

  it.skip("create proposal", async () => {
    // upload secret

    const keyArray = buildChunkedEncryptedKey(key, instance);
    console.log("keyArray", keyArray);
    await privateDAO.uploadSecret(keyArray);
    const secretId = 1; // first secret

    // IPFS proposal created previously - create dynamically afterwards
    let ipfsHash = "bafkreihpyqt4c6uyayvvaof7kmfp7sqtuna63oadfegkgmgnbvm7ylvvta";
    const currBlockNumber = provider.getBlockNumber();

    // upload proposal to contract

    await privateDAO.createProposal(secretId, ipfsHash, blockNumber + 100);

    // ToDo - Fetch proposal
    // ToDo - Print proposal
  });

  it.skip("vote", async () => {});

  it.skip("getResult", async () => {});
});
