// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Test USDT token (testnet only)
 */
contract MockUSDT is ERC20, Ownable {
    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**6); // 1,000,000 USDT
    }
    
    /**
     * @dev Override decimals to 6 (USDT uses 6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    /**
     * @dev Mint tokens (test only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Faucet: send test USDT to user
     */
    function faucet(address to) external {
        _mint(to, 100 * 10**6); // 100 USDT per call for testing
    }
}
