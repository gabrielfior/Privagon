import { Args, Command, Flags } from "@oclif/core";

import { EncryptDecrypt, NFTStorageClient } from "./ipfs";

export default class RetrieveProposal extends Command {
  static description = "describe the command here";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    cid: Flags.string({ char: "c", description: "Proposal ID" }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(RetrieveProposal);
    const cid = flags.cid!;
    //     Fetches Encrypted Proposal Text from IPFS
    let ipfs = new NFTStorageClient(process.env.NFT_STORAGE_TOKEN!);
    const response = await ipfs.fetchContent(cid);

    // ToDo
    // Retrieves the AES key by calling getProposalAccessKey on DAO smart contract with proposalId set as well as authentication signature.

    // Decrypts the Proposal Content with the AES Key.
    let ed = new EncryptDecrypt();
    // ToDo - Fetch from contract
    const [key, iv] = [Buffer.from("a"), Buffer.from("b")];
    const decryptedText = ed.decryptProposal(response.data, key, iv);
    // Inputs: Proposal Id,
    // Outputs: Proposal Text
    this.logJson({ decryptedText: decryptedText });
  }
}
