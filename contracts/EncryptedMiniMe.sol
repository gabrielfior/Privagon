pragma solidity >=0.8.13 <0.9.0;

import "./EncryptedERC20.sol";
import "fhevm/abstracts/EIP712WithModifier.sol";

import "fhevm/lib/TFHE.sol";

contract EncryptedMiniMe is EncryptedERC20 {

    /// @dev `Checkpoint` is the structure that attaches a block number to a
    ///  given value, the block number attached is the one that last changed the
    ///  value
    struct  Checkpoint {

        // `fromBlock` is the block number that the value was generated from
        uint128 fromBlock;

        // `value` is the amount of tokens at a specific block number
        euint32 value;
    }

    // `balances` is the map that tracks the balance of each address, in this
    //  contract when the balance changes the block number that the change
    //  occurred is also included in the map
    mapping (address => Checkpoint[]) hoistoricBalances;

    // Function to execute on Transfer
    function _afterTransfer(address from, address to, euint32 amount) override internal {

        // Get original balances of the the actors
        euint32 previousBalanceFrom = _balanceOfAt(from, block.number);
        euint32 previousBalanceTo = _balanceOfAt(to, block.number);

        // Update the balances
        updateValueAtNow(hoistoricBalances[from], TFHE.sub(previousBalanceFrom, amount));
        updateValueAtNow(hoistoricBalances[to], TFHE.add(previousBalanceTo, amount));
    }

    /// @dev `updateValueAtNow` used to update the `balances` map and the
    ///  `totalSupplyHistory`
    /// @param checkpoints The history of data being updated
    /// @param _value The new number of tokens
    function updateValueAtNow(Checkpoint[] storage checkpoints, euint32 _value
    ) internal  {
        if ((checkpoints.length == 0)
        || (checkpoints[checkpoints.length -1].fromBlock < block.number)) {
               Checkpoint memory newCheckPoint;
               newCheckPoint.fromBlock =  uint128(block.number);
               newCheckPoint.value = _value;
               checkpoints.push(newCheckPoint);
           } else {
               Checkpoint storage oldCheckPoint = checkpoints[checkpoints.length-1];
               oldCheckPoint.value = _value;
           }
    }


    /// @dev Queries the balance of `msg.sender` at a specific `_blockNumber`
    /// @param _blockNumber The block number when the balance is queried
    /// @return The balance at `_blockNumber` of the msg.sender, encrypted to msg.sender key.
    function balanceOfAt(uint _blockNumber,
        bytes32 publicKey, bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature)
        returns (bytes memory) {

        euint32 balance = _balanceOfAt(msg.sender, _blockNumber);

        return TFHE.reencrypt(balance, publicKey);
    }

    /// @dev Queries the balance of `_owner` at a specific `_blockNumber`
    /// @param _owner The address from which the balance will be retrieved
    /// @param _blockNumber The block number when the balance is queried
    /// @return The balance at `_blockNumber`
    function _balanceOfAt(address _owner, uint _blockNumber) internal view
        returns (euint32) {

        // These next few lines are used when the balance of the token is
        //  requested before a check point was ever created for this token, it
        //  requires that the `parentToken.balanceOfAt` be queried at the
        //  genesis block for that token as this contains initial balance of
        //  this token
        // Note that as the knowledge that account has no transfers is public,
        // we do not need a secure branching here
        if ((hoistoricBalances[_owner].length == 0)
            || (hoistoricBalances[_owner][0].fromBlock > _blockNumber)) {
            TFHE.asEuint32(0);

        // This will return the expected balance during normal situations
        } else {
            return _getBalanceAt(hoistoricBalances[_owner], _blockNumber);
        }
    }


    /// @dev `getValueAt` retrieves the number of tokens at a given block number
    /// @param checkpoints The history of values being queried
    /// @param _block The block number to retrieve the value at
    /// @return The number of tokens being queried
    function _getBalanceAt(Checkpoint[] storage checkpoints, uint _block
    ) internal view returns (euint32) {
        if (checkpoints.length == 0) return TFHE.asEuint32(0);

        // Shortcut for the actual value
        // This does not leak any information as data on who transfers what is public
        if (_block >= checkpoints[checkpoints.length-1].fromBlock)
            return checkpoints[checkpoints.length-1].value;
        if (_block < checkpoints[0].fromBlock) return TFHE.asEuint32(0);

        // Binary search of the value in the array
        uint min = 0;
        uint max = checkpoints.length-1;
        while (max > min) {
            uint mid = (max + min + 1)/ 2;
            if (checkpoints[mid].fromBlock<=_block) {
                min = mid;
            } else {
                max = mid-1;
            }
        }
        return checkpoints[min].value;
    }



}
