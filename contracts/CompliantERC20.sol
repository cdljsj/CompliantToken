// SPDX-License-Identifier: MIT
pragma solidity =0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract CompliantERC20 is ERC20 {
    IERC721Metadata public complianceNFT;
    address public tokenIssuer;

    uint256 public currentComplianceId;
    uint256 public pendingComplianceId;
    uint256 public tokenHoldersCount;
    uint256 public pendingComplianceSignOffCount;
    mapping (address => uint256) public tokenHolderCompliance;
    mapping (address => uint256) public signOffRecord;

    event NewComplianceIssued(address tokenIssuer, uint256 complianceId);
    event NewComplianceSignedOff(address tokenHolder, uint256 complianceId, bool accepted);
    event ComplianceUpdated(uint256 oldComplianceId, uint256 newComplianceId);

    modifier onlyTokenIssuer {
        require(msg.sender == tokenIssuer, "Not token issuer");
        _;
    }

    constructor(string memory name_, string memory symbol_, IERC721Metadata complianceNFT_, address tokenIssuer_) ERC20 (name_, symbol_) {
        complianceNFT = complianceNFT_;
        tokenIssuer = tokenIssuer_;
    }

    function updateCompliance(uint256 newComplianceId) external onlyTokenIssuer {
        require(newComplianceId > 0, "Compliance id cannot be zero");
        require(pendingComplianceId == 0, "Pending compliance exists");
        require(complianceNFT.ownerOf(newComplianceId) == tokenIssuer, "Should be issued by token issuer");

        // Set it directly for the first time set
        if (currentComplianceId == 0) {
            currentComplianceId = newComplianceId;
            return;
        }

        pendingComplianceId = newComplianceId;

        // Token Issuer accept the compliance update by default
        if (balanceOf(tokenIssuer) > 0) {
            acceptComplianceUpdate();
        }

        emit NewComplianceIssued(tokenIssuer, newComplianceId);
    }

    function issueTokens(address to, uint256 amount) external onlyTokenIssuer {
        require(currentComplianceId != 0, "Compliance should be set at first");
        require(amount > 0, "Invalid issue amount");

        _mint(to, amount);
    }

    function acceptComplianceUpdate() public {
        tokenHolderCompliance[msg.sender] = pendingComplianceId;
        _updateComplianceStatus();

        emit NewComplianceSignedOff(msg.sender, pendingComplianceId, true);
    }

    function declineComplianceUpdate() external {
        _updateComplianceStatus();

        emit NewComplianceSignedOff(msg.sender, pendingComplianceId, false);
    }

    function complianceURI() external view returns (string memory currentComplianceURI, string memory pendingComplianceURI) {
        currentComplianceURI = complianceNFT.tokenURI(currentComplianceId);
        pendingComplianceURI = "";
        if (pendingComplianceId != 0) {
            pendingComplianceURI = complianceNFT.tokenURI(pendingComplianceId);
        }
    }

    function _updateComplianceStatus() private {
        require(pendingComplianceId != 0, "No pending compliance to signoff");
        require(balanceOf(msg.sender) > 0 || msg.sender == tokenIssuer, "Only valid token holders could accept");
        require(signOffRecord[msg.sender] != pendingComplianceId, "Already signed off");
        signOffRecord[msg.sender] = pendingComplianceId;
        pendingComplianceSignOffCount = pendingComplianceSignOffCount + 1;
        if (pendingComplianceSignOffCount == tokenHoldersCount) {
            emit ComplianceUpdated(currentComplianceId, pendingComplianceId);
            currentComplianceId = pendingComplianceId;
            pendingComplianceId = 0;
            pendingComplianceSignOffCount = 0;
        }
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override virtual {
        require(pendingComplianceId == 0, "Transfer not allowed when pending compliance exists");

        if (tokenHolderCompliance[from] != currentComplianceId && from != address(0)) {
            require(to == tokenIssuer, "Token holder who declines the change in terms and conditions only can transfer tokens to token issuer");
        }
        // New token holders accept the latest compliance by default
        if (tokenHolderCompliance[to] == 0 && amount > 0 && to != address(0)) {
            tokenHolderCompliance[to] = currentComplianceId;
            tokenHoldersCount = tokenHoldersCount + 1;
        } else {
            require(tokenHolderCompliance[to] == currentComplianceId, "Tokens can only be transfered to token holders accept the latest compliance");
        }
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override virtual {
        to;
        amount;
        if (balanceOf(from) == 0 && from != address(0)) {
            tokenHoldersCount = tokenHoldersCount - 1;
            tokenHolderCompliance[from] = 0;
        }
    }
}