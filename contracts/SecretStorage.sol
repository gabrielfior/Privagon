// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity >=0.8.13 <0.9.0;

import "fhevm/lib/TFHE.sol";
import "hardhat/console.sol";

abstract contract SecretStorage {
    uint256 private lastId;
    mapping(uint256 => euint32[]) private secrets;

    function _uploadSecret(euint32[] memory _secret) internal returns (uint256) {
        lastId++;
        secrets[lastId] = _secret;
        return lastId;
    }

    function _getSecret(uint256 _id) internal view returns (euint32[] memory) {
        console.log("secretId %d", _id);
        return secrets[_id];
    }
}
