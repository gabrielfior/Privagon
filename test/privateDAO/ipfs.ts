import axios from "axios";
import * as crypto from "crypto";
import * as fs from "fs";
import { Blob, NFTStorage } from "nft.storage";

export class NFTStorageClient {
  nftStorageClient: NFTStorage;
  constructor(private token: string) {
    this.nftStorageClient = new NFTStorage({ token: this.token });
  }

  async uploadBlob(encryptedData: string): Promise<string> {
    const cid = await this.nftStorageClient.storeBlob(new Blob([encryptedData]));
    await this.nftStorageClient.status(cid);
    return cid;
  }

  fetchContent(cid: string) {
    return axios.get<string>(`https://${cid}.ipfs.nftstorage.link/`);
  }
}

export class EncryptDecrypt {
  constructor(private algorithm = "aes-256-cbc") {
    //  this.keyBuffer = Buffer.from(this.key, "latin1"); // key must be 32 bytes for aes256
  }

  generateKeyAndIv(): [Buffer, Buffer] {
    let key = crypto.randomBytes(32);
    let iv = crypto.randomBytes(16);
    return [key, iv];
  }

  encryptProposal(data: string, key: Buffer, iv: Buffer): string {
    let cipher = crypto.createCipheriv(this.algorithm, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  decryptProposal(encodedProposal: string, key: Buffer, iv: Buffer) {
    let decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    let decrypted = decipher.update(encodedProposal, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
