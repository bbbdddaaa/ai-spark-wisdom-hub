// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SparkToken.sol";

/**
 * @title MintController
 * @dev Controls mint for top 2000 eligible users
 */
contract MintController is Ownable, ReentrancyGuard {
    SparkToken public sparkToken;
    
    uint256 public constant MINT_COST = 0.003 ether; // 0.003 ETH (approximately $10 if ETH = $3333)
    uint256 public constant MINT_REWARD = 10000 * 10**18; // 10000 SPARK (18 decimals)
    uint256 public constant MAX_ELIGIBLE_USERS = 2000;
    
    uint256 public totalMintedUsers;
    
    mapping(address => bool) public hasMinted;
    mapping(address => uint256) public mintCount;
    
    mapping(address => bool) public isEligible;
    
    address public treasury;
    
    event UserMinted(address indexed user, uint256 amount, uint256 timestamp);
    event EligibilityGranted(address indexed user);
    event EligibilityRevoked(address indexed user);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    constructor(
        address _sparkToken,
        address _treasury
    ) Ownable(msg.sender) {
        require(_sparkToken != address(0), "Invalid spark token address");
        require(_treasury != address(0), "Invalid treasury address");
        
        sparkToken = SparkToken(_sparkToken);
        treasury = _treasury;
    }
    
    /**
     * @dev Grant mint eligibility to users
     */
    function grantEligibility(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            if (!isEligible[users[i]] && totalMintedUsers < MAX_ELIGIBLE_USERS) {
                isEligible[users[i]] = true;
                emit EligibilityGranted(users[i]);
            }
        }
    }
    
    /**
     * @dev Revoke mint eligibility
     */
    function revokeEligibility(address user) external onlyOwner {
        isEligible[user] = false;
        emit EligibilityRevoked(user);
    }
    
    /**
     * @dev Execute mint
     */
    function mint() external payable nonReentrant {
        require(isEligible[msg.sender], "Not eligible for minting");
        require(totalMintedUsers < MAX_ELIGIBLE_USERS, "Mint cap reached");
        require(msg.value == MINT_COST, "Incorrect ETH amount");
        
        // Transfer ETH to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer failed");
        
        // Mint SPARK tokens to user
        sparkToken.mint(msg.sender, MINT_REWARD);
        
        if (!hasMinted[msg.sender]) {
            hasMinted[msg.sender] = true;
            totalMintedUsers++;
        }
        mintCount[msg.sender]++;
        
        emit UserMinted(msg.sender, MINT_REWARD, block.timestamp);
    }
    
    /**
     * @dev Update treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Get remaining mint slots
     */
    function remainingSlots() external view returns (uint256) {
        return MAX_ELIGIBLE_USERS - totalMintedUsers;
    }
    
    /**
     * @dev Check if user can mint
     */
    function canMint(address user) external view returns (bool) {
        return isEligible[user] && totalMintedUsers < MAX_ELIGIBLE_USERS;
    }
}
