// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PostScoringAgent
 * @dev AI Agent registration and reputation system based on ERC-8004 protocol
 * ERC-8004 compliant Agent NFT contract for post scoring and reputation management
 */
contract PostScoringAgent is ERC721, Ownable, ReentrancyGuard {
    
    // Agent metadata structure
    struct AgentMetadata {
        string agentURI;           // URI of Agent configuration JSON
        uint256 totalScores;       // Total number of scores
        uint256 totalPosts;        // Total number of posts scored
        uint256 averageScore;      // Average score (2 decimal places, multiplied by 100)
        uint256 reputation;        // Reputation score (0-10000)
        bool isActive;             // Whether activated
        uint256 registeredAt;      // Registration timestamp
    }
    
    // Agent scoring record
    struct ScoringRecord {
        bytes32 postHash;          // Post hash
        address agent;             // Agent address
        uint8 relevanceScore;      // AI relevance score (0-35)
        uint8 qualityScore;        // Content quality score (0-35)
        uint8 valueScore;          // Educational value score (0-30)
        uint8 totalScore;          // Total score (0-100)
        uint256 timestamp;         // Scoring timestamp
    }
    
    // State variables
    uint256 private _nextTokenId;
    mapping(uint256 => AgentMetadata) public agents;
    mapping(bytes32 => bool) public processedPosts;
    mapping(bytes32 => ScoringRecord) public scoringRecords;
    mapping(address => uint256) public agentTokenIds;
    
    // Scoring threshold configuration
    uint8 public constant MIN_PASSING_SCORE = 60;
    uint8 public constant MAX_SCORE = 100;
    
    // Events
    event AgentRegistered(uint256 indexed tokenId, address indexed owner, string agentURI);
    event AgentURIUpdated(uint256 indexed tokenId, string newAgentURI);
    event AgentActivated(uint256 indexed tokenId);
    event AgentDeactivated(uint256 indexed tokenId);
    event PostScored(
        bytes32 indexed postHash,
        uint256 indexed agentTokenId,
        uint8 totalScore,
        bool passed
    );
    event ReputationUpdated(uint256 indexed tokenId, uint256 newReputation);
    
    constructor() ERC721("AI Spark Scoring Agent", "AGENT") Ownable(msg.sender) {
        _nextTokenId = 1;
    }
    
    /**
     * @dev Register a new Agent
     * @param agentURI URI of Agent metadata
     */
    function registerAgent(string memory agentURI) external onlyOwner returns (uint256) {
        require(bytes(agentURI).length > 0, "Agent URI cannot be empty");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        agents[tokenId] = AgentMetadata({
            agentURI: agentURI,
            totalScores: 0,
            totalPosts: 0,
            averageScore: 0,
            reputation: 5000, // Initial reputation 5000/10000
            isActive: true,
            registeredAt: block.timestamp
        });
        
        agentTokenIds[msg.sender] = tokenId;
        
        emit AgentRegistered(tokenId, msg.sender, agentURI);
        return tokenId;
    }
    
    /**
     * @dev Update Agent URI
     * @param tokenId Agent token ID
     * @param newAgentURI New Agent URI
     */
    function updateAgentURI(uint256 tokenId, string memory newAgentURI) external {
        require(ownerOf(tokenId) == msg.sender, "Not agent owner");
        require(bytes(newAgentURI).length > 0, "Agent URI cannot be empty");
        
        agents[tokenId].agentURI = newAgentURI;
        emit AgentURIUpdated(tokenId, newAgentURI);
    }
    
    /**
     * @dev Record post scoring
     * @param postHash Hash value of the post
     * @param relevanceScore AI relevance score (0-35)
     * @param qualityScore Content quality score (0-35)
     * @param valueScore Educational value score (0-30)
     */
    function recordScore(
        bytes32 postHash,
        uint8 relevanceScore,
        uint8 qualityScore,
        uint8 valueScore
    ) external nonReentrant returns (uint8 totalScore, bool passed) {
        uint256 tokenId = agentTokenIds[msg.sender];
        require(tokenId > 0, "Sender is not a registered agent");
        require(agents[tokenId].isActive, "Agent is not active");
        require(!processedPosts[postHash], "Post already scored");
        require(relevanceScore <= 35, "Relevance score out of range");
        require(qualityScore <= 35, "Quality score out of range");
        require(valueScore <= 30, "Value score out of range");
        
        totalScore = relevanceScore + qualityScore + valueScore;
        require(totalScore <= MAX_SCORE, "Total score exceeds maximum");
        
        passed = totalScore >= MIN_PASSING_SCORE;
        
        // Record scoring
        scoringRecords[postHash] = ScoringRecord({
            postHash: postHash,
            agent: msg.sender,
            relevanceScore: relevanceScore,
            qualityScore: qualityScore,
            valueScore: valueScore,
            totalScore: totalScore,
            timestamp: block.timestamp
        });
        
        processedPosts[postHash] = true;
        
        // Update Agent statistics
        AgentMetadata storage agent = agents[tokenId];
        agent.totalScores += totalScore;
        agent.totalPosts += 1;
        agent.averageScore = (agent.totalScores * 100) / agent.totalPosts;
        
        // Update reputation (based on scoring quality)
        _updateReputation(tokenId, totalScore);
        
        emit PostScored(postHash, tokenId, totalScore, passed);
        return (totalScore, passed);
    }
    
    /**
     * @dev Update Agent reputation
     * @param tokenId Agent token ID
     * @param score Latest score
     */
    function _updateReputation(uint256 tokenId, uint8 score) internal {
        AgentMetadata storage agent = agents[tokenId];
        
        // Adjust reputation based on scoring quality
        // High scores increase reputation, low scores decrease reputation
        if (score >= 85) {
            // Excellent score: reputation +10
            agent.reputation = agent.reputation + 10 > 10000 ? 10000 : agent.reputation + 10;
        } else if (score >= 70) {
            // Good score: reputation +5
            agent.reputation = agent.reputation + 5 > 10000 ? 10000 : agent.reputation + 5;
        } else if (score >= 60) {
            // Pass score: reputation +2
            agent.reputation = agent.reputation + 2 > 10000 ? 10000 : agent.reputation + 2;
        } else if (score < 40) {
            // Poor score: reputation -5
            agent.reputation = agent.reputation > 5 ? agent.reputation - 5 : 0;
        }
        
        emit ReputationUpdated(tokenId, agent.reputation);
    }
    
    /**
     * @dev Activate Agent
     * @param tokenId Agent token ID
     */
    function activateAgent(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        agents[tokenId].isActive = true;
        emit AgentActivated(tokenId);
    }
    
    /**
     * @dev Deactivate Agent
     * @param tokenId Agent token ID
     */
    function deactivateAgent(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        agents[tokenId].isActive = false;
        emit AgentDeactivated(tokenId);
    }
    
    /**
     * @dev Get Agent information
     * @param tokenId Agent token ID
     */
    function getAgentInfo(uint256 tokenId) external view returns (AgentMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId];
    }
    
    /**
     * @dev Get post scoring record
     * @param postHash Post hash
     */
    function getScoringRecord(bytes32 postHash) external view returns (ScoringRecord memory) {
        require(processedPosts[postHash], "Post not scored");
        return scoringRecords[postHash];
    }
    
    /**
     * @dev Check if post has been scored
     * @param postHash Post hash
     */
    function isPostScored(bytes32 postHash) external view returns (bool) {
        return processedPosts[postHash];
    }
    
    /**
     * @dev Get Agent average score (2 decimal places)
     * @param tokenId Agent token ID
     */
    function getAgentAverageScore(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId].averageScore;
    }
    
    /**
     * @dev Override tokenURI, return Agent metadata URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId].agentURI;
    }
    
    /**
     * @dev Prevent transfer of Agent NFT (bound to registrant)
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override 
        returns (address) 
    {
        address from = _ownerOf(tokenId);
        
        // Only allow mint, not transfer
        if (from != address(0)) {
            require(to == address(0), "Agent NFT is non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
}
