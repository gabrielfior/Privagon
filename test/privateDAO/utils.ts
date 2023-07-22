import { Contract, Wallet } from "ethers";
import * as fhevm from "fhevmjs";

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
  tokenContract: Contract,
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
  console.log("save signed token");
  instance.setTokenSignature(tokenAddress, signature);

  // Call the method with public key + signature
  console.log("fetching encrypted balance");
  const encryptedBalance = await tokenContract.balanceOf(generatedToken.publicKey, signature);

  // Decrypt the balance
  console.log("decrypting balance");
  const balance = instance.decrypt(tokenAddress, encryptedBalance);
  console.log("balance", balance);
  return balance;
}
