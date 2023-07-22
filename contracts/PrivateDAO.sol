// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity >=0.8.13 <0.9.0;

import "hardhat/console.sol";
import "fhevm/lib/TFHE.sol";

import "./EncryptedMiniMe.sol";
import "./SecretStorage.sol";

contract PrivateDAO is EncryptedMiniMe, SecretStorage {
    euint32 private minMemberTokenBalance;

    // We represent each voting process as a struct
    // To create a new proposal, we call the `createProposal` function
    struct Proposal {
        uint256 keyStorageID;
        uint256 startBlockNum;
        uint256 endBlockNum;
        string ipfsHash;
        euint32 yesVotes;
        euint32 noVotes;
        euint32 abstainVotes;
    }
    uint256 public lastProposalID;
    mapping(uint256 => Proposal) public proposals;

    modifier proposalExists(uint256 _proposalID) {
        require(lastProposalID >= _proposalID && _proposalID != 0, "Process does not exist");
        _;
    }

    constructor(bytes memory _minMemberTokenBalance) {
        minMemberTokenBalance = TFHE.asEuint32(_minMemberTokenBalance);
    }

    function _isMember(address _mayBeMember) private view returns (ebool) {
        return TFHE.asEbool(true);
        //return TFHE.ge(minMemberTokenBalance, balances[_mayBeMember]);
    }

    function isMember(
        bytes32 publicKey,
        bytes calldata signature
    ) private view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        ebool _mayBeMember = _isMember(msg.sender);
        return TFHE.reencrypt(_mayBeMember, publicKey);
    }

    function uploadSecret(bytes[] calldata _secret) public returns (uint256) {
        console.log("entered upload secret");
        euint32[] memory encSecret = new euint32[](_secret.length);
        for (uint256 i = 0; i < _secret.length; i++) {
            encSecret[i] = TFHE.asEuint32(_secret[i]);
        }
        //TODO: Add Event - To access outside the EVM

        return _uploadSecret(encSecret);
    }

    function dummy() public view returns (uint256) {
        console.log("entered dummy");
        return 1;
    }

    function getSecret(
        uint256 secretId,
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        console.log("entered get secret");
        euint32[] memory mayBeSecret = _getSecret(secretId);
        bytes memory encSecret;
        ebool member = _isMember(msg.sender);

        euint32 s = TFHE.cmux(member, mayBeSecret[0], TFHE.asEuint32(1));
        encSecret = TFHE.reencrypt(s, publicKey);

        return encSecret;
    }

    function createProposal(
        uint256 _keyStorageID,
        string calldata _ipfsHash,
        uint256 _endBlockNum
    ) public returns (uint256) {
        lastProposalID++;

        Proposal storage proposal = proposals[lastProposalID];
        proposal.keyStorageID = _keyStorageID;
        proposal.ipfsHash = _ipfsHash;
        proposal.endBlockNum = _endBlockNum;
        proposal.startBlockNum = block.number;
        return lastProposalID;
    }

    function getProposalKeySecretID(uint256 _proposalID) public view proposalExists(_proposalID) returns (uint256) {
        Proposal storage proposal = proposals[_proposalID];
        return proposal.keyStorageID;
    }

    function vote(uint256 _proposalID, bytes calldata _voteOption) public proposalExists(_proposalID) {
        Proposal storage proposal = proposals[_proposalID];
        require(proposal.endBlockNum > block.number, "Proposal has ended");
        euint32 voteOption = TFHE.asEuint32(_voteOption);
        euint32 weight = _balanceOfAt(msg.sender, proposal.startBlockNum);

        // We consider the vote to be a
        // 1. "yes" if voteOption is 1,
        // 2. "no"  if voteOption is 2
        // 3. "abstain" if voteOption is 0
        euint32 dummy = TFHE.asEuint32(0);
        ebool votedYes = TFHE.eq(voteOption, TFHE.asEuint32(1));
        ebool votedNo = TFHE.eq(voteOption, TFHE.asEuint32(2));
        ebool abstained = TFHE.eq(voteOption, TFHE.asEuint32(0));

        proposal.yesVotes = TFHE.cmux(
            votedYes,
            TFHE.add(proposal.yesVotes, weight),
            TFHE.add(proposal.yesVotes, dummy)
        );
        proposal.noVotes = TFHE.cmux(votedNo, TFHE.add(proposal.noVotes, weight), TFHE.add(proposal.noVotes, dummy));
        proposal.abstainVotes = TFHE.cmux(
            abstained,
            TFHE.add(proposal.abstainVotes, weight),
            TFHE.add(proposal.abstainVotes, dummy)
        );
    }

    function getResult(
        uint256 _proposalID,
        bytes32 publicKey,
        bytes calldata signature
    )
        public
        view
        proposalExists(_proposalID)
        returns (
            bytes memory,
            bytes memory // bytes memory // TODO - add abstain
        )
    {
        onlySignedPublicKeyFn(publicKey, signature);
        Proposal storage proposal = proposals[_proposalID];
        require(proposal.endBlockNum <= block.number, "Proposal hasn't ended");

        ebool _mayBeMember = _isMember(msg.sender);

        // Save the results. If not a member you will get (0,0,0)
        // TODO - make it random

        (euint32 maybeForVotes, euint32 maybeAgainstVotes, euint32 maybeAbstainVotes) = getVotes(
            _mayBeMember,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.abstainVotes
        );

        bytes memory reencForVotes = _getReencValue(maybeForVotes, publicKey);
        bytes memory reencAgainstVotes = _getReencValue(maybeAgainstVotes, publicKey);
        // bytes memory reencAbstainVotest = _getReencValue(maybeAbstainVotes, publicKey); // TODO - add abstain

        return (
            reencForVotes,
            reencAgainstVotes
            // reencAbstainVotest // TODO - add abstain
        );
    }

    function getVotes(
        ebool _mayBeMember,
        euint32 yesVotes,
        euint32 againstVotes,
        euint32 abstainVotes
    ) internal view returns (euint32 maybeForVotes, euint32 maybeAgainstVotes, euint32 maybeAbstainVotes) {
        euint32 zero = TFHE.asEuint32(0);

        maybeForVotes = TFHE.cmux(_mayBeMember, yesVotes, zero);
        maybeAgainstVotes = TFHE.cmux(_mayBeMember, againstVotes, zero);
        maybeAbstainVotes = TFHE.cmux(_mayBeMember, abstainVotes, zero);
    }

    function _getReencValue(euint32 value, bytes32 publicKey) internal view returns (bytes memory) {
        return TFHE.reencrypt(value, publicKey);
    }

    function onlySignedPublicKeyFn(
        bytes32 publicKey,
        bytes calldata signature
    ) internal view onlySignedPublicKey(publicKey, signature) {}
}
