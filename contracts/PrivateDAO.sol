// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity >=0.8.13 <0.9.0;

import "fhevm/lib/TFHE.sol";

import "./EncryptedERC20.sol";
import "./SecretStorage.sol";

contract PrivateDAO is EncryptedERC20, SecretStorage {
    euint32 private minMemberTokenBalance;

    // We represent each voting process as a struct
    // To create a new proposal, we call the `createProposal` function
    struct Proposal {
        uint256 keyStorageID;
        uint64 endBlockNum;
        uint256 ipfsHash;
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
        return TFHE.ge(minMemberTokenBalance, balances[_mayBeMember]);
    }

    function isMember(
        bytes32 publicKey,
        bytes calldata signature
    ) private view onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        ebool _mayBeMember = _isMember(msg.sender);
        return TFHE.reencrypt(_mayBeMember, publicKey);
    }

    function uploadSecret(bytes[] calldata _secret) public returns (uint256) {
        euint32[] memory encSecret = new euint32[](_secret.length);
        for (uint256 i = 0; i < _secret.length; i++) {
            encSecret[i] = TFHE.asEuint32(_secret[i]);
        }
        //TODO: Add Event - To access outside the EVM

        return _uploadSecret(encSecret);
    }

    function getSecret(
        uint256 secretId,
        bytes32 publicKey,
        bytes calldata signature
    ) private view onlySignedPublicKey(publicKey, signature) returns (bytes[] memory) {
        euint32[] memory mayBeSecret = _getSecret(secretId);
        bytes[] memory encSecret = new bytes[](mayBeSecret.length);
        for (uint256 i = 0; i < mayBeSecret.length; i++) {
            euint32 s = TFHE.cmux(_isMember(msg.sender), mayBeSecret[i], TFHE.asEuint32(1));
            encSecret[i] = TFHE.reencrypt(s, publicKey);
        }
        return encSecret;
    }

    function createProposal(uint256 _keyStorageID, uint256 _ipfsHash, uint64 _endBlockNum) public returns (uint256) {
        lastProposalID++;

        Proposal storage proposal = proposals[lastProposalID];
        proposal.keyStorageID = _keyStorageID;
        proposal.ipfsHash = _ipfsHash;
        proposal.endBlockNum = _endBlockNum;
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
        euint32 weight = balances[msg.sender];

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
        onlySignedPublicKey(publicKey, signature)
        returns (euint32, euint32, euint32)
    {
        Proposal storage proposal = proposals[_proposalID];
        require(proposal.endBlockNum <= block.number, "Proposal hasn't ended");

        ebool _mayBeMember = _isMember(msg.sender);

        return (
            TFHE.cmux(_mayBeMember, proposal.yesVotes, TFHE.asEuint32(0)),
            TFHE.cmux(_mayBeMember, proposal.noVotes, TFHE.asEuint32(0)),
            TFHE.cmux(_mayBeMember, proposal.abstainVotes, TFHE.asEuint32(0))
        );
    }
}
