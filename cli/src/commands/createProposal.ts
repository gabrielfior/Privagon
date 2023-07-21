import { Args, Command, Flags } from "@oclif/core";

import { EncryptDecrypt, NFTStorageClient } from "./ipfs";

export type ProposalOutput = {
  cid: string;
  proposalId: string;
};

export default class CreateProposal extends Command {
  static description = "describe the command here";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    text: Flags.string({ char: "t", description: "proposal text", required: true }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(CreateProposal);

    // Generates a Proposal Encryption AES Key
    let encryptDecrypt = new EncryptDecrypt();
    let ipfs = new NFTStorageClient(process.env.NFT_STORAGE_TOKEN!);
    let [key, iv] = encryptDecrypt.generateKeyAndIv();

    // Encrypts the recieved Proposal Text
    let encrypted = encryptDecrypt.encryptProposal(flags.text, key, iv);

    // Pins the Proposal to the IPFS
    const cid = await ipfs.uploadBlob(encrypted);

    // ToDo
    // 1. Calls registerKey on DAO Smart Contract to store the secret AES256 Key inside the DAO.
    // -> This returns the secretStorageId.
    // 2. Calls createProposal on DAO Smart Contract with the publicipfsProposalHash and the secretStorageId.
    // -> Returns the Proposal ID
    const proposalId = "dummy"; // ToDo
    this.logJson({ cid: cid, proposalId: proposalId });
  }
}
