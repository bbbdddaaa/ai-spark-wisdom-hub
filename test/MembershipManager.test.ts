import { expect } from "chai";
import { ethers } from "hardhat";
import { MembershipManager, MockUSDT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("MembershipManager", function () {
  let membershipManager: MembershipManager;
  let usdt: MockUSDT;
  let owner: HardhatEthersSigner;
  let rewardPool: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const MEMBERSHIP_COST = ethers.parseUnits("10", 6); // 10 USDT
  const MEMBERSHIP_DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [owner, rewardPool, user1, user2] = await ethers.getSigners();
    
    // 部署MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    
    // 部署MembershipManager
    const MembershipManager = await ethers.getContractFactory("MembershipManager");
    membershipManager = await MembershipManager.deploy(
      await usdt.getAddress(),
      rewardPool.address
    );
    await membershipManager.waitForDeployment();
    
    // 给用户发放测试USDT
    await usdt.mint(user1.address, ethers.parseUnits("1000", 6));
    await usdt.mint(user2.address, ethers.parseUnits("1000", 6));
  });

  describe("部署", function () {
    it("应该正确设置合约参数", async function () {
      expect(await membershipManager.usdtToken()).to.equal(await usdt.getAddress());
      expect(await membershipManager.rewardPool()).to.equal(rewardPool.address);
      expect(await membershipManager.MEMBERSHIP_COST()).to.equal(MEMBERSHIP_COST);
      expect(await membershipManager.MEMBERSHIP_DURATION()).to.equal(MEMBERSHIP_DURATION);
    });
  });

  describe("购买会员", function () {
    it("用户应该能成功购买会员", async function () {
      await usdt.connect(user1).approve(
        await membershipManager.getAddress(),
        MEMBERSHIP_COST
      );
      
      const startTime = await time.latest() + 1;
      const expireTime = startTime + MEMBERSHIP_DURATION;
      
      await expect(membershipManager.connect(user1).buyMembership())
        .to.emit(membershipManager, "MembershipPurchased");
      
      // 检查会员状态
      expect(await membershipManager.isMemberActive(user1.address)).to.be.true;
      
      // 检查USDT转账到rewardPool
      expect(await usdt.balanceOf(rewardPool.address)).to.equal(MEMBERSHIP_COST);
      
      // 检查统计数据
      expect(await membershipManager.totalMembers()).to.equal(1);
      expect(await membershipManager.totalRevenue()).to.equal(MEMBERSHIP_COST);
    });

    it("用户应该能续费会员", async function () {
      // 第一次购买
      await usdt.connect(user1).approve(
        await membershipManager.getAddress(),
        MEMBERSHIP_COST * 2n
      );
      await membershipManager.connect(user1).buyMembership();
      
      // 续费
      await expect(membershipManager.connect(user1).buyMembership())
        .to.emit(membershipManager, "MembershipRenewed");
      
      // 检查统计数据
      expect(await membershipManager.totalPurchases(user1.address)).to.equal(2);
      expect(await membershipManager.totalRevenue()).to.equal(MEMBERSHIP_COST * 2n);
    });

    it("没有足够USDT的用户不能购买会员", async function () {
      // 转走user1的USDT
      await usdt.connect(user1).transfer(
        owner.address,
        await usdt.balanceOf(user1.address)
      );
      
      await usdt.connect(user1).approve(
        await membershipManager.getAddress(),
        MEMBERSHIP_COST
      );
      
      await expect(
        membershipManager.connect(user1).buyMembership()
      ).to.be.revertedWith("Insufficient USDT balance");
    });

    it("没有授权USDT的用户不能购买会员", async function () {
      await expect(
        membershipManager.connect(user1).buyMembership()
      ).to.be.revertedWith("Insufficient USDT allowance");
    });
  });

  describe("会员状态检查", function () {
    beforeEach(async function () {
      await usdt.connect(user1).approve(
        await membershipManager.getAddress(),
        MEMBERSHIP_COST
      );
      await membershipManager.connect(user1).buyMembership();
    });

    it("应该正确检查会员状态", async function () {
      expect(await membershipManager.isMemberActive(user1.address)).to.be.true;
      expect(await membershipManager.isMemberActive(user2.address)).to.be.false;
    });

    it("会员过期后状态应该为false", async function () {
      // 快进31天
      await time.increase(31 * 24 * 60 * 60);
      
      expect(await membershipManager.isMemberActive(user1.address)).to.be.false;
    });

    it("应该正确返回剩余时间", async function () {
      const remaining = await membershipManager.getRemainingTime(user1.address);
      expect(remaining).to.be.gt(0);
      expect(remaining).to.be.lte(MEMBERSHIP_DURATION);
    });

    it("批量检查会员状态应该正确", async function () {
      const results = await membershipManager.batchCheckMembership([
        user1.address,
        user2.address
      ]);
      
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.false;
    });
  });

  describe("管理功能", function () {
    it("Owner应该能更新rewardPool地址", async function () {
      const newPool = user2.address;
      
      await expect(membershipManager.updateRewardPool(newPool))
        .to.emit(membershipManager, "RewardPoolUpdated")
        .withArgs(rewardPool.address, newPool);
      
      expect(await membershipManager.rewardPool()).to.equal(newPool);
    });

    it("不能设置无效的rewardPool地址", async function () {
      await expect(
        membershipManager.updateRewardPool(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid reward pool address");
    });
  });
});
