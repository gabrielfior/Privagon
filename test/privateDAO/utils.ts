import * as crypto from "crypto";
import { Contract, ContractInterface, Signer, Wallet } from "ethers";
import * as fhevm from "fhevmjs";
import * as hre from "hardhat";

import func from "../../deploy/deploy";
import { PrivateDAO } from "../../types";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForBlock(hre: HardhatRuntimeEnvironment, current?: number) {
  const targetBlock = current || (await hre.ethers.provider.getBlockNumber());
  while ((await hre.ethers.provider.getBlockNumber()) <= targetBlock) {
    await delay(50);
  }
}

export async function fetchBalance(
  user: Wallet,
  tokenContract: PrivateDAO,
  instance: fhevm.FhevmInstance,
): Promise<number> {
  const tokenAddress = await tokenContract.getAddress();
  console.log("tokenAddress", tokenAddress);
  const generatedToken = instance.generateToken({
    verifyingContract: tokenAddress,
  });

  // Sign the public key
  console.log("signing public key");
  const signature = await user.signTypedData(
    generatedToken.token.domain,
    { Reencrypt: generatedToken.token.types.Reencrypt }, // Need to remove EIP712Domain from types
    generatedToken.token.message,
  );

  // Save signed token
  //console.log("save signed token");
  //instance.setTokenSignature(tokenAddress, signature);

  // Call the method with public key + signature
  console.log("fetching encrypted balance");
  const encryptedBalance = await tokenContract.balanceOf(generatedToken.publicKey, signature);

  // Decrypt the balance
  console.log("decrypting balance");
  const balance = instance.decrypt(tokenAddress, encryptedBalance);
  console.log("balance", balance);
  return balance;
}

export async function deployPrivateDAO(instance: fhevm.FhevmInstance, ownerAddress: string): Promise<PrivateDAO> {
  const minMemberTokenBalance = instance.encrypt32(Number(100));
  const { deploy } = hre.deployments;

  const privateDAODeploy = await deploy("PrivateDAO", {
    from: ownerAddress,
    args: [minMemberTokenBalance],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  const privateDAO = await hre.ethers.getContractAt("PrivateDAO", privateDAODeploy.address);
  return privateDAO;
}

export function buildChunkedEncryptedKey(key: Buffer, instance: fhevm.FhevmInstance) {
  console.log("key", key);
  let keyArray = [];
  for (let i = 0; i <= key.length / 4; i++) {
    const partialKey = key.slice(i * 4, (i + 1) * 4);
    const intPartialKey = parseInt(partialKey.toString("hex"), 16);
    const encryptedPartialKey = instance.encrypt32(intPartialKey);
    keyArray.push(encryptedPartialKey);
  }
  return keyArray;
}

export async function mintToOwner(instance: fhevm.FhevmInstance, privateDAO: PrivateDAO, mintAmount: number) {
  const resultUint32 = instance.encrypt32(mintAmount);
  await privateDAO.mint(resultUint32);
}
