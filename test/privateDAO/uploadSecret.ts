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
    key = Buffer.from([50, 72, 69, 76]);
    console.log("key", parseInt(key.toString("hex"), 16));
  });

  beforeEach(async () => {
    [owner, alice] = await hre.ethers.getSigners();

    console.log("owner", owner.address, "alice", alice.address);
    //const hardhatToken = await hre.ethers.deployContract("EncryptedERC20");
    privateDAO = await deployPrivateDAO(instance, await owner.getAddress());
    //console.log("hardhat Token", await hardhatToken.contractOwner());
    await waitForBlock(hre);
    // mint
    mintToOwner(instance, privateDAO, 2000);
    await waitForBlock(hre);
  });

  // Working
  it("Mint tokens to owner, transfer tokens to Alice", async () => {
    // transfer to Alice

    const resultUint32 = instance.encrypt32(1000);
    await privateDAO["transfer(address,bytes)"](alice.address, resultUint32);
    await waitForBlock(hre);
    //await transaction.wait(); // not working
    //await provider.waitForTransaction(transaction.hash);
    // transfer to Bob

    // transfer to Charlie

    //await waitForBlock(hre);

    // balance
    const balance = await fetchBalance(owner, privateDAO, instance);
    console.log("balanceOwner", balance);
    expect(balance).to.equal(1000);
  });

  it("Upload secret", async () => {
    // upload secret
    const keyArray = buildChunkedEncryptedKey(key, instance);
    console.log("uploading secret");
    await privateDAO.uploadSecret(keyArray);
    const secretId = 1;
    await waitForBlock(hre);

    // ToDo retrieve encrypted secret
    const privateDAOAddress = await privateDAO.getAddress();
    const generatedToken = instance.generateToken({
      verifyingContract: privateDAOAddress,
    });

    // Sign the public key
    console.log("building signature");
    const signature = await owner.signTypedData(
      generatedToken.token.domain,
      { Reencrypt: generatedToken.token.types.Reencrypt }, // Need to remove EIP712Domain from types
      generatedToken.token.message,
    );

    // Call the method with public key + signature
    console.log("fetching secret");
    const encryptedSecret = await privateDAO.getSecret(1, generatedToken.publicKey, signature);
    console.log("encryptedSecret", encryptedSecret);
    // Decrypt the balance
    console.log("decrypting secret");
    const decryptedSecret = instance.decrypt(privateDAOAddress, encryptedSecret);
    console.log("decrypted secret", decryptedSecret);
  });

  it.skip("create proposal", async () => {
    // ToDo - Implement me
  });

  it.skip("vote", async () => {
    // ToDo - Implement me
  });

  it.skip("getResult", async () => {
    // ToDo - Implement me
  });
});
