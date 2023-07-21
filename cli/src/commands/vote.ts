import { Args, Command, Flags } from "@oclif/core";

export default class Vote extends Command {
  static description = "describe the command here";

  static examples = ["<%= config.bin %> <%= command.id %>"];

  static flags = {
    proposalId: Flags.string({ char: "p", description: "proposal ID" }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Vote);
    const proposalId = flags.proposalId;

    // ToDo
    //Calls the vote function to submit the vote for a provided proposalId.
    //Inputs: Proposal Id, Vote Choice
  }
}
