import * as crypto from "crypto";
import * as fs from "fs";
import { NFTStorage } from "nft.storage";

export class NFTStorageClient {
  nftStorageClient: NFTStorage;
  constructor(private token: string) {
    this.nftStorageClient = new NFTStorage({ token: this.token });
  }

  async uploadBlob(encryptedData: string): Promise<string> {
    const cid = await this.nftStorageClient.storeBlob(new Blob([encryptedData]));
    const status = await this.nftStorageClient.status(cid);
    console.log("cid", cid);
    return cid;
  }
}

export class EncryptDecrypt {
  keyBuffer: Buffer;
  constructor(private key: string, private iv: string, private algorithm = "aes-256-cbc") {
    this.keyBuffer = Buffer.from(this.key, "latin1"); // key must be 32 bytes for aes256
  }

  encryptProposal(pathToFile: string): string {
    // read file
    const data = fs.readFileSync(pathToFile);
    let dataAsString = data.toString("utf8");
    let cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, this.iv);
    let encrypted = cipher.update(dataAsString, "utf8", "hex");
    encrypted += cipher.final("hex");
    console.log(encrypted);
    return encrypted;
  }

  decryptProposal(encodedProposal: string) {
    let decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, this.iv);
    let decrypted = decipher.update(encodedProposal, "hex", "utf8");
    decrypted += decipher.final("utf8");
    console.log(decrypted);
    return decrypted;
  }
}
