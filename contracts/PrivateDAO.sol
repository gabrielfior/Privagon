// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity >=0.8.13 <0.9.0;

import "fhevm/lib/TFHE.sol";

import "./EncryptedERC20.sol";
import "./SecretStorage.sol";

contract PrivateDAO is EncryptedERC20, SecretStorage {

    uint256 MAX_INT = 2**256 - 1;
    euint32 private minMemberTokenBalance;

    // We represent each voting process as a struct
    // To create a new proposal, we call the `createProposal` function
    struct Proposal {
        address creator; 
        bytes[8] topicKey;

        uint256 endBlockNum; 
        string ipfsHash; 
        // TODO: Accumulate perhaps?
        euint32 yesVotes;
        euint32 noVotes;
        euint32 abstainVotes;
    }
    uint256 public lastProposalID; 
    mapping(uint256 => Proposal) public proposals;

    // Modifier to check if a process exists
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

    function isMember(bytes32 publicKey, bytes calldata signature) private view 
        onlySignedPublicKey(publicKey, signature) returns (bytes memory) {
        ebool _mayBeMember = _isMember(msg.sender);
        return TFHE.reencrypt(_mayBeMember, publicKey);
    }

    function uploadSecret(bytes[] calldata _secret) public returns  (uint256) {
        euint32[] memory encSecret = new euint32[](_secret.length);
        for (uint256 i = 0; i < _secret.length; i++) {
            encSecret[i] = TFHE.asEuint32(_secret[i]);
        }
        //TODO: Add Event - To access outside the EVM

        return _uploadSecret(encSecret);
    }

    function getSecret(uint256 secretId, bytes32 publicKey, bytes calldata signature) private view 
        onlySignedPublicKey(publicKey, signature) returns (bytes[] memory) {
        euint32[] memory mayBeSecret = _getSecret(secretId);
        bytes[] memory encSecret = new bytes[](mayBeSecret.length);
        for (uint256 i = 0; i < mayBeSecret.length; i++) {
            euint32 s = TFHE.cmux(_isMember(msg.sender), mayBeSecret[i], TFHE.asEuint32(1));
            encSecret[i] = TFHE.reencrypt(s, publicKey);
        }
        return encSecret;
    }

    // function createProposal (string calldata _ipfsHash, bytes[8] calldata _topicKey, uint256 _endBlockNum) 
    //     public returns (uint256) {
        
    //     lastProposalID++; 

    //     Proposal storage proposal = proposals[lastProposalID];
    //     proposal.creator = msg.sender;
    //     proposal.topicKey = _topicKey;
    //     proposal.ipfsHash = _ipfsHash;
    //     proposal.endBlockNum = _endBlockNum;
    //     return lastProposalID;   
    // }

    // function vote(uint256 _proposalID, bytes calldata _voteOption) proposalExists(_proposalID) public {
    //     Proposal storage proposal = proposals[_proposalID];
    //     euint32 voteOption = TFHE.asEuint32(_voteOption);
    //     euint32 weight = balances[msg.sender];

    //     // We consider the vote to be a 
    //     // 1. "yes" if voteOption is 1, 
    //     // 2. "no"  if voteOption is -1 (MAX_INT) 
    //     // 3. "abstain" if voteOption is 0
    //     if (TFHE.eq(voteOption, TFHE.asEuint32(1))) {
    //         proposal.yesVotes = TFHE.add(proposal.yesVotes, weight);
    //     } else if (TFHE.eq(_voteOption, TFHE.asEuint32(MAX_INT))) {
    //         proposal.noVotes = TFHE.add(proposal.noVotes, weight);
    //     } else {
    //         proposal.abstainVotes = TFHE.add(proposal.abstainVotes, weight);
    //     }
    // }

    // function viewProposalTopic(uint256 proposalID) public {

    // }

    // viewProcessTopic (processId) view authenticated -> enc topicKey

}