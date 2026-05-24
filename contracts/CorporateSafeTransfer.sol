// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CorporateSafeTransfer is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_TEXT_LENGTH = 200;

    address public payer;
    address public recipient;
    IERC20 public immutable usdcToken;

    uint256 private transferCounter;
    uint256 public totalPendingAmount;
    mapping(uint256 => Transfer) private transfers;

    struct Transfer {
        uint256 id;
        uint256 amount;
        string memo;
        string internalReference;
        address fundedBy;
        bool withdrawn;
        uint256 createdAt;
        uint256 withdrawnAt;
    }

    event PayerUpdated(address indexed oldPayer, address indexed newPayer);
    event RecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event TransferCreated(
        uint256 indexed transferId,
        address indexed payer,
        uint256 amount,
        string memo,
        string internalReference
    );
    event TransferWithdrawn(uint256 indexed transferId, address indexed recipient, uint256 amount);
    event UntrackedUSDCRecovered(address indexed to, uint256 amount);

    error ZeroAddress();
    error NotAuthorizedPayer();
    error NotAuthorizedRecipient();
    error InvalidAmount();
    error TextTooLong();
    error TransferDoesNotExist();
    error TransferAlreadyWithdrawn();
    error AmountExceedsUntrackedBalance();

    constructor(address usdcTokenAddress) Ownable(msg.sender) {
        if (usdcTokenAddress == address(0)) {
            revert ZeroAddress();
        }

        usdcToken = IERC20(usdcTokenAddress);
    }

    function setPayer(address newPayer) external onlyOwner {
        if (newPayer == address(0)) {
            revert ZeroAddress();
        }

        address oldPayer = payer;
        payer = newPayer;
        emit PayerUpdated(oldPayer, newPayer);
    }

    function setRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) {
            revert ZeroAddress();
        }

        address oldRecipient = recipient;
        recipient = newRecipient;
        emit RecipientUpdated(oldRecipient, newRecipient);
    }

    function getConfig()
        external
        view
        returns (address contractOwner, address currentPayer, address currentRecipient, address usdcTokenAddress)
    {
        return (owner(), payer, recipient, address(usdcToken));
    }

    function deposit(uint256 amount, string calldata memo, string calldata internalReference) external returns (uint256 transferId) {
        if (msg.sender != payer) {
            revert NotAuthorizedPayer();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (bytes(memo).length > MAX_TEXT_LENGTH || bytes(internalReference).length > MAX_TEXT_LENGTH) {
            revert TextTooLong();
        }

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        transferCounter += 1;
        transferId = transferCounter;

        transfers[transferId] = Transfer({
            id: transferId,
            amount: amount,
            memo: memo,
            internalReference: internalReference,
            fundedBy: msg.sender,
            withdrawn: false,
            createdAt: block.timestamp,
            withdrawnAt: 0
        });

        totalPendingAmount += amount;

        emit TransferCreated(transferId, msg.sender, amount, memo, internalReference);
    }

    function withdraw(uint256 transferId) external {
        if (msg.sender != recipient) {
            revert NotAuthorizedRecipient();
        }

        Transfer storage transferRecord = transfers[transferId];
        if (transferRecord.id == 0) {
            revert TransferDoesNotExist();
        }
        if (transferRecord.withdrawn) {
            revert TransferAlreadyWithdrawn();
        }

        transferRecord.withdrawn = true;
        transferRecord.withdrawnAt = block.timestamp;
        totalPendingAmount -= transferRecord.amount;

        usdcToken.safeTransfer(msg.sender, transferRecord.amount);

        emit TransferWithdrawn(transferId, msg.sender, transferRecord.amount);
    }

    function recoverUntrackedUSDC(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }

        uint256 untrackedBalance = usdcToken.balanceOf(address(this)) - totalPendingAmount;
        if (amount > untrackedBalance) {
            revert AmountExceedsUntrackedBalance();
        }

        usdcToken.safeTransfer(to, amount);
        emit UntrackedUSDCRecovered(to, amount);
    }

    function getTransfer(uint256 transferId) external view returns (Transfer memory) {
        if (transfers[transferId].id == 0) {
            revert TransferDoesNotExist();
        }

        return transfers[transferId];
    }

    function getTransferCount() external view returns (uint256) {
        return transferCounter;
    }

    function getAvailableTransfers() external view returns (uint256[] memory transferIds) {
        return _filterTransfers(false);
    }

    function getCompletedTransfers() external view returns (uint256[] memory transferIds) {
        return _filterTransfers(true);
    }

    function _filterTransfers(bool withdrawn) private view returns (uint256[] memory transferIds) {
        uint256 count;

        for (uint256 id = 1; id <= transferCounter; id += 1) {
            if (transfers[id].withdrawn == withdrawn) {
                count += 1;
            }
        }

        transferIds = new uint256[](count);
        uint256 cursor;

        for (uint256 id = 1; id <= transferCounter; id += 1) {
            if (transfers[id].withdrawn == withdrawn) {
                transferIds[cursor] = id;
                cursor += 1;
            }
        }
    }
}
