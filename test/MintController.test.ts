import { expect } from "chai";
import { ethers } from "hardhat";
import { SparkToken, MockUSDT, MintController } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MintController", function () {
  let sparkToken: SparkToken;
  let usdt: MockUSDT;
  let mintController: MintController;
  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const MINT_COST = ethers.parseUnits("10", 6); // 10 USDT
  const MINT_REWARD = ethers.parseEther("10000"); // 10000 SPARK

  beforeEach(async function () {
    [owner, treasury, user1, user2] = await ethers.getSigners();
    
    // 部署SparkToken
    const SparkToken = await ethers.getContractFactory("SparkToken");
    sparkToken = await SparkToken.deploy();
    await sparkToken.waitForDeployment();
    
    // 部署MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    
    // 部署MintController
    const MintController = await ethers.getContractFactory("MintController");
    mintController = await MintController.deploy(
      await sparkToken.getAddress(),
      await usdt.getAddress(),
      treasury.address
    );
    await mintController.waitForDeployment();
    
    // 授予MintController铸造权限
    await sparkToken.addMinter(await mintController.getAddress());
    
    // 给用户发放测试USDT
    await usdt.mint(user1.address, ethers.parseUnits("1000", 6));
    await usdt.mint(user2.address, ethers.parseUnits("1000", 6));
  });

  describe("部署", function () {
    it("应该正确设置合约参数", async function () {
      expect(await mintController.sparkToken()).to.equal(await sparkToken.getAddress());
      expect(await mintController.usdtToken()).to.equal(await usdt.getAddress());
      expect(await mintController.treasury()).to.equal(treasury.address);
      expect(await mintController.MINT_COST()).to.equal(MINT_COST);
      expect(await mintController.MINT_REWARD()).to.equal(MINT_REWARD);
      expect(await mintController.MAX_ELIGIBLE_USERS()).to.equal(2000);
    });
  });

  describe("资格管理", function () {
    it("Owner应该能批量授予mint资格", async function () {
      await expect(
        mintController.grantEligibility([user1.address, user2.address])
      )
        .to.emit(mintController, "EligibilityGranted")
        .withArgs(user1.address);
      
      expect(await mintController.isEligible(user1.address)).to.be.true;
      expect(await mintController.isEligible(user2.address)).to.be.true;
    });

    it("Owner应该能撤销mint资格", async function () {
      await mintController.grantEligibility([user1.address]);
      
      await expect(mintController.revokeEligibility(user1.address))
        .to.emit(mintController, "EligibilityRevoked")
        .withArgs(user1.address);
      
      expect(await mintController.isEligible(user1.address)).to.be.false;
    });

    it("非Owner不能管理资格", async function () {
      await expect(
        mintController.connect(user1).grantEligibility([user2.address])
      ).to.be.reverted;
    });
  });

  describe("Mint功能", function () {
    beforeEach(async function () {
      await mintController.grantEligibility([user1.address]);
    });

    it("有资格的用户应该能成功mint", async function () {
      // 授权USDT
      await usdt.connect(user1).approve(await mintController.getAddress(), MINT_COST);
      
      const initialTreasuryBalance = await usdt.balanceOf(treasury.address);
      
      await expect(mintController.connect(user1).mint())
        .to.emit(mintController, "UserMinted")
        .withArgs(user1.address, MINT_REWARD, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1));
      
      // 检查SPARK余额
      expect(await sparkToken.balanceOf(user1.address)).to.equal(MINT_REWARD);
      
      // 检查USDT转账
      expect(await usdt.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance + MINT_COST
      );
      
      // 检查mint状态
      expect(await mintController.hasMinted(user1.address)).to.be.true;
      expect(await mintController.totalMintedUsers()).to.equal(1);
    });

    it("没有资格的用户不能mint", async function () {
      await usdt.connect(user2).approve(await mintController.getAddress(), MINT_COST);
      
      await expect(
        mintController.connect(user2).mint()
      ).to.be.revertedWith("Not eligible for minting");
    });

    it("没有足够USDT的用户不能mint", async function () {
      // 转走user1的USDT
      await usdt.connect(user1).transfer(
        owner.address,
        await usdt.balanceOf(user1.address)
      );
      
      await usdt.connect(user1).approve(await mintController.getAddress(), MINT_COST);
      
      await expect(
        mintController.connect(user1).mint()
      ).to.be.revertedWith("Insufficient USDT balance");
    });

    it("没有授权USDT的用户不能mint", async function () {
      await expect(
        mintController.connect(user1).mint()
      ).to.be.revertedWith("Insufficient USDT allowance");
    });
  });

  describe("剩余名额", function () {
    it("应该正确显示剩余名额", async function () {
      expect(await mintController.remainingSlots()).to.equal(2000);
      
      await mintController.grantEligibility([user1.address]);
      await usdt.connect(user1).approve(await mintController.getAddress(), MINT_COST);
      await mintController.connect(user1).mint();
      
      expect(await mintController.remainingSlots()).to.equal(1999);
    });
  });

  describe("Treasury更新", function () {
    it("Owner应该能更新treasury地址", async function () {
      const newTreasury = user2.address;
      
      await expect(mintController.updateTreasury(newTreasury))
        .to.emit(mintController, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury);
      
      expect(await mintController.treasury()).to.equal(newTreasury);
    });

    it("不能设置无效的treasury地址", async function () {
      await expect(
        mintController.updateTreasury(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid treasury address");
    });
  });
});
