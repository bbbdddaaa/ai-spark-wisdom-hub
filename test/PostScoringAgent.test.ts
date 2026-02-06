import { expect } from "chai";
import { ethers } from "hardhat";
import { PostScoringAgent } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PostScoringAgent", function () {
  let agent: PostScoringAgent;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const AGENT_URI = "https://example.com/agent-metadata.json";
  const MIN_PASSING_SCORE = 60;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const AgentFactory = await ethers.getContractFactory("PostScoringAgent");
    agent = await AgentFactory.deploy();
    await agent.waitForDeployment();
  });

  describe("Agent Registration", function () {
    it("应该成功注册Agent", async function () {
      const tx = await agent.registerAgent(AGENT_URI);
      const receipt = await tx.wait();

      const tokenId = 1n;
      expect(await agent.ownerOf(tokenId)).to.equal(owner.address);

      const agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.agentURI).to.equal(AGENT_URI);
      expect(agentInfo.isActive).to.be.true;
      expect(agentInfo.totalPosts).to.equal(0);
      expect(agentInfo.reputation).to.equal(5000);
    });

    it("应该拒绝空URI的Agent注册", async function () {
      await expect(
        agent.registerAgent("")
      ).to.be.revertedWith("Agent URI cannot be empty");
    });

    it("应该只允许owner注册Agent", async function () {
      await expect(
        agent.connect(user1).registerAgent(AGENT_URI)
      ).to.be.revertedWithCustomError(agent, "OwnableUnauthorizedAccount");
    });
  });

  describe("Post Scoring", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await agent.registerAgent(AGENT_URI);
      await tx.wait();
      tokenId = 1n;
    });

    it("应该成功记录及格的评分", async function () {
      const postHash = ethers.id("test-post-1");
      const relevance = 30;
      const quality = 28;
      const value = 22;
      const expectedTotal = relevance + quality + value; // 80

      const tx = await agent.recordScore(
        postHash,
        relevance,
        quality,
        value
      );

      await expect(tx)
        .to.emit(agent, "PostScored")
        .withArgs(postHash, tokenId, expectedTotal, true);

      const record = await agent.getScoringRecord(postHash);
      expect(record.relevanceScore).to.equal(relevance);
      expect(record.qualityScore).to.equal(quality);
      expect(record.valueScore).to.equal(value);
      expect(record.totalScore).to.equal(expectedTotal);
      expect(record.agent).to.equal(owner.address);

      expect(await agent.isPostScored(postHash)).to.be.true;
    });

    it("应该记录不及格的评分", async function () {
      const postHash = ethers.id("test-post-2");
      const relevance = 20;
      const quality = 15;
      const value = 10;
      const expectedTotal = relevance + quality + value; // 45

      const tx = await agent.recordScore(
        postHash,
        relevance,
        quality,
        value
      );

      await expect(tx)
        .to.emit(agent, "PostScored")
        .withArgs(postHash, tokenId, expectedTotal, false);
    });

    it("应该拒绝重复评分同一帖子", async function () {
      const postHash = ethers.id("test-post-3");

      await agent.recordScore(postHash, 30, 30, 25);

      await expect(
        agent.recordScore(postHash, 25, 25, 20)
      ).to.be.revertedWith("Post already scored");
    });

    it("应该拒绝超出范围的分数", async function () {
      const postHash = ethers.id("test-post-4");

      await expect(
        agent.recordScore(postHash, 40, 30, 25) // relevance超过35
      ).to.be.revertedWith("Relevance score out of range");

      await expect(
        agent.recordScore(postHash, 30, 40, 25) // quality超过35
      ).to.be.revertedWith("Quality score out of range");

      await expect(
        agent.recordScore(postHash, 30, 30, 35) // value超过30
      ).to.be.revertedWith("Value score out of range");
    });

    it("应该更新Agent统计信息", async function () {
      const postHash1 = ethers.id("test-post-5");
      const postHash2 = ethers.id("test-post-6");

      await agent.recordScore(postHash1, 30, 30, 20); // 80
      await agent.recordScore(postHash2, 25, 25, 20); // 70

      const agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.totalPosts).to.equal(2);
      expect(agentInfo.totalScores).to.equal(150); // 80 + 70
      expect(agentInfo.averageScore).to.equal(7500); // (150 * 100) / 2
    });

    it("应该根据评分质量更新信誉", async function () {
      const postHash1 = ethers.id("test-post-7");
      const postHash2 = ethers.id("test-post-8");

      // 初始信誉: 5000
      await agent.recordScore(postHash1, 32, 32, 26); // 90 (优秀，+10)
      let agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.reputation).to.equal(5010);

      await agent.recordScore(postHash2, 28, 28, 20); // 76 (良好，+5)
      agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.reputation).to.equal(5015);
    });
  });

  describe("Agent Management", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await agent.registerAgent(AGENT_URI);
      await tx.wait();
      tokenId = 1n;
    });

    it("应该能够更新Agent URI", async function () {
      const newURI = "https://example.com/new-metadata.json";
      await agent.updateAgentURI(tokenId, newURI);

      const agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.agentURI).to.equal(newURI);
    });

    it("应该只允许owner更新Agent URI", async function () {
      const newURI = "https://example.com/new-metadata.json";
      
      await expect(
        agent.connect(user1).updateAgentURI(tokenId, newURI)
      ).to.be.revertedWith("Not agent owner");
    });

    it("应该能够停用和激活Agent", async function () {
      await agent.deactivateAgent(tokenId);
      let agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.isActive).to.be.false;

      // 停用后不能评分
      const postHash = ethers.id("test-post-9");
      await expect(
        agent.recordScore(postHash, 30, 30, 25)
      ).to.be.revertedWith("Agent is not active");

      await agent.activateAgent(tokenId);
      agentInfo = await agent.getAgentInfo(tokenId);
      expect(agentInfo.isActive).to.be.true;
    });
  });

  describe("Agent NFT Properties", function () {
    it("应该返回正确的token URI", async function () {
      await agent.registerAgent(AGENT_URI);
      const tokenId = 1n;

      expect(await agent.tokenURI(tokenId)).to.equal(AGENT_URI);
    });

    it("Agent NFT应该不可转移", async function () {
      await agent.registerAgent(AGENT_URI);
      const tokenId = 1n;

      await expect(
        agent.transferFrom(owner.address, user1.address, tokenId)
      ).to.be.revertedWith("Agent NFT is non-transferable");
    });
  });
});
