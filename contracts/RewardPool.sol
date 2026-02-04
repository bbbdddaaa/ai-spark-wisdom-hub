// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SparkToken.sol";

/**
 * @title RewardPool
 * @dev Manages reward pool, buyback and distribution
 */
contract RewardPool is Ownable, ReentrancyGuard {
    SparkToken public sparkToken;
    IERC20 public usdtToken;
    
    uint256 public totalUsdtCollected;
    uint256 public totalSparkBought;
    uint256 public totalSparkDistributed;
    uint256 public lastBuybackTime;
    
    struct WeeklyReward {
        uint256 weekId;
        address user;
        uint256 rank;
        uint256 amount;
        bool claimed;
    }
    
    mapping(uint256 => mapping(address => WeeklyReward)) public weeklyRewards;
    mapping(uint256 => address[]) public weeklyWinners;
    
    uint256 public currentWeekId;
    
    mapping(address => bool) public rewardManagers;
    
    event UsdtReceived(address indexed from, uint256 amount);
    event BuybackExecuted(uint256 usdtAmount, uint256 sparkAmount, uint256 timestamp);
    event WeeklyRewardSet(
        uint256 indexed weekId,
        address indexed user,
        uint256 rank,
        uint256 amount
    );
    event RewardClaimed(
        uint256 indexed weekId,
        address indexed user,
        uint256 amount
    );
    event RewardManagerAdded(address indexed manager);
    event RewardManagerRemoved(address indexed manager);
    
    constructor(address _sparkToken, address _usdtToken) Ownable(msg.sender) {
        require(_sparkToken != address(0), "Invalid spark token address");
        require(_usdtToken != address(0), "Invalid USDT address");
        
        sparkToken = SparkToken(_sparkToken);
        usdtToken = IERC20(_usdtToken);
        currentWeekId = block.timestamp / 1 weeks;
    }
    
    /**
     * @dev Add reward manager
     */
    function addRewardManager(address manager) external onlyOwner {
        require(manager != address(0), "Invalid manager address");
        rewardManagers[manager] = true;
        emit RewardManagerAdded(manager);
    }
    
    /**
     * @dev Remove reward manager
     */
    function removeRewardManager(address manager) external onlyOwner {
        rewardManagers[manager] = false;
        emit RewardManagerRemoved(manager);
    }
    
    /**
     * @dev Set weekly ranking rewards
     * @param weekId Week ID
     * @param users User addresses
     * @param amounts Reward amounts
     */
    function setWeeklyRewards(
        uint256 weekId,
        address[] calldata users,
        uint256[] calldata amounts
    ) external {
        require(rewardManagers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(users.length == amounts.length, "Length mismatch");
        require(users.length <= 10, "Maximum 10 winners per week");
        
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user address");
            require(amounts[i] > 0, "Amount must be greater than 0");
            
            weeklyRewards[weekId][users[i]] = WeeklyReward({
                weekId: weekId,
                user: users[i],
                rank: i + 1,
                amount: amounts[i],
                claimed: false
            });
            
            emit WeeklyRewardSet(weekId, users[i], i + 1, amounts[i]);
        }
        
        weeklyWinners[weekId] = users;
    }
    
    /**
     * @dev Claim weekly reward
     */
    function claimWeeklyReward(uint256 weekId) external nonReentrant {
        WeeklyReward storage reward = weeklyRewards[weekId][msg.sender];
        require(reward.amount > 0, "No reward for this week");
        require(!reward.claimed, "Reward already claimed");
        require(
            sparkToken.balanceOf(address(this)) >= reward.amount,
            "Insufficient SPARK in pool"
        );
        
        reward.claimed = true;
        totalSparkDistributed += reward.amount;
        
        require(
            sparkToken.transfer(msg.sender, reward.amount),
            "SPARK transfer failed"
        );
        
        emit RewardClaimed(weekId, msg.sender, reward.amount);
    }
    
    /**
     * @dev Manual buyback SPARK (owner or rewardManager). Simplified; production would use DEX swap.
     */
    function buybackSpark(uint256 usdtAmount, uint256 sparkAmount) external {
        require(rewardManagers[msg.sender] || msg.sender == owner(), "Not authorized");
        require(usdtToken.balanceOf(address(this)) >= usdtAmount, "Insufficient USDT");
        
        totalSparkBought += sparkAmount;
        lastBuybackTime = block.timestamp;
        
        emit BuybackExecuted(usdtAmount, sparkAmount, block.timestamp);
    }
    
    /**
     * @dev Receive SPARK tokens
     */
    function depositSpark(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(
            sparkToken.transferFrom(msg.sender, address(this), amount),
            "SPARK transfer failed"
        );
        totalSparkBought += amount;
    }
    
    /**
     * @dev Get user weekly reward info
     */
    function getWeeklyReward(uint256 weekId, address user)
        external
        view
        returns (
            uint256 rank,
            uint256 amount,
            bool claimed
        )
    {
        WeeklyReward memory reward = weeklyRewards[weekId][user];
        return (reward.rank, reward.amount, reward.claimed);
    }
    
    /**
     * @dev Get weekly winners list
     */
    function getWeeklyWinners(uint256 weekId)
        external
        view
        returns (address[] memory)
    {
        return weeklyWinners[weekId];
    }
    
    /**
     * @dev Get current week ID
     */
    function getCurrentWeekId() external view returns (uint256) {
        return block.timestamp / 1 weeks;
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @dev Receive USDT (from MembershipManager)
     */
    receive() external payable {
        revert("Use buyMembership instead");
    }
}
