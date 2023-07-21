import { config } from "dotenv";
import fs from "fs";
import { task } from "hardhat/config";
import { Blob, NFTStorage } from "nft.storage";
import * as p from "path";

import { EncryptDecrypt } from "./utilts";

config();

task("deployIpfs", "Prints the list of accounts", async (_taskArgs, hre) => {
  // generate key
  let token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDQ3Y0MxZjJFMjg0NDY0Njg5NjA2RDEyMTZmM0VhN2RjMEEwOGFCOWIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY4OTk0MzQ2MDI0NSwibmFtZSI6InphbWEifQ.ja3rb9j9ec18zv95uxndXp5bIdzUKZePRmd9oHVn4uc";
  // generate content
  let pathToProposal = p.resolve("./tasks/proposal.md");

  // encrypt content
  let key = "0000000000000000my-very-nice-key"; // key must be 32 bytes for aes256
  let iv = "1234567890123456"; // 16 bytes
  let ed = new EncryptDecrypt(key, iv);
  const encryptedProposal = ed.encryptProposal(pathToProposal);
  console.log("encrypted proposal", encryptedProposal);

  // upload to IPFS
  const storage = new NFTStorage({ token: process.env.NFT_STORAGE_TOKEN! });
  let pathToFile = p.resolve("./tasks/proposal.md");
  const cid = await storage.storeBlob(new Blob([encryptedProposal]));
  console.log({ cid });
  const status = await storage.status(cid);
  console.log(status);
});
