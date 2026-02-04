// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MembershipManager
 * @dev Manages membership system
 */
contract MembershipManager is Ownable, ReentrancyGuard {
    IERC20 public usdtToken;
    address public rewardPool;
    
    uint256 public constant MEMBERSHIP_COST = 10 * 10**6; // 10 USDT (6 decimals)
    uint256 public constant MEMBERSHIP_DURATION = 30 days;
    
    struct Membership {
        uint256 startTime;
        uint256 expireTime;
        bool isActive;
    }
    
    mapping(address => Membership) public memberships;
    mapping(address => uint256) public totalPurchases;
    
    uint256 public totalMembers;
    uint256 public totalRevenue;
    
    event MembershipPurchased(
        address indexed user,
        uint256 startTime,
        uint256 expireTime,
        uint256 cost
    );
    event MembershipRenewed(
        address indexed user,
        uint256 newExpireTime,
        uint256 cost
    );
    event RewardPoolUpdated(address indexed oldPool, address indexed newPool);
    
    constructor(address _usdtToken, address _rewardPool) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_rewardPool != address(0), "Invalid reward pool address");
        
        usdtToken = IERC20(_usdtToken);
        rewardPool = _rewardPool;
    }
    
    /**
     * @dev Buy membership
     */
    function buyMembership() external nonReentrant {
        require(
            usdtToken.balanceOf(msg.sender) >= MEMBERSHIP_COST,
            "Insufficient USDT balance"
        );
        require(
            usdtToken.allowance(msg.sender, address(this)) >= MEMBERSHIP_COST,
            "Insufficient USDT allowance"
        );
        
        require(
            usdtToken.transferFrom(msg.sender, rewardPool, MEMBERSHIP_COST),
            "USDT transfer failed"
        );
        
        Membership storage membership = memberships[msg.sender];
        uint256 startTime = block.timestamp;
        uint256 expireTime;
        
        if (membership.isActive && membership.expireTime > block.timestamp) {
            expireTime = membership.expireTime + MEMBERSHIP_DURATION;
            emit MembershipRenewed(msg.sender, expireTime, MEMBERSHIP_COST);
        } else {
            if (!membership.isActive) {
                totalMembers++;
            }
            expireTime = startTime + MEMBERSHIP_DURATION;
            emit MembershipPurchased(
                msg.sender,
                startTime,
                expireTime,
                MEMBERSHIP_COST
            );
        }
        
        membership.startTime = startTime;
        membership.expireTime = expireTime;
        membership.isActive = true;
        
        totalPurchases[msg.sender]++;
        totalRevenue += MEMBERSHIP_COST;
    }
    
    /**
     * @dev Check if membership is active
     */
    function isMemberActive(address user) external view returns (bool) {
        Membership memory membership = memberships[user];
        return membership.isActive && membership.expireTime > block.timestamp;
    }
    
    /**
     * @dev Get remaining membership time
     */
    function getRemainingTime(address user) external view returns (uint256) {
        Membership memory membership = memberships[user];
        if (!membership.isActive || membership.expireTime <= block.timestamp) {
            return 0;
        }
        return membership.expireTime - block.timestamp;
    }
    
    /**
     * @dev Update reward pool address
     */
    function updateRewardPool(address newPool) external onlyOwner {
        require(newPool != address(0), "Invalid reward pool address");
        address oldPool = rewardPool;
        rewardPool = newPool;
        emit RewardPoolUpdated(oldPool, newPool);
    }
    
    /**
     * @dev Batch check membership status
     */
    function batchCheckMembership(address[] calldata users)
        external
        view
        returns (bool[] memory)
    {
        bool[] memory results = new bool[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            Membership memory membership = memberships[users[i]];
            results[i] =
                membership.isActive &&
                membership.expireTime > block.timestamp;
        }
        return results;
    }
}
