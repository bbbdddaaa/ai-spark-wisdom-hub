import { expect } from "chai";
import { ethers } from "hardhat";
import { SparkToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SparkToken", function () {
  let sparkToken: SparkToken;
  let owner: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, minter, user] = await ethers.getSigners();
    
    const SparkToken = await ethers.getContractFactory("SparkToken");
    sparkToken = await SparkToken.deploy();
    await sparkToken.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确设置代币名称和符号", async function () {
      expect(await sparkToken.name()).to.equal("Spark Token");
      expect(await sparkToken.symbol()).to.equal("SPARK");
    });

    it("应该正确设置最大供应量", async function () {
      const maxSupply = ethers.parseEther("25000000");
      expect(await sparkToken.MAX_SUPPLY()).to.equal(maxSupply);
    });

    it("初始供应量应该为0", async function () {
      expect(await sparkToken.totalSupply()).to.equal(0);
    });
  });

  describe("铸造权限", function () {
    it("Owner应该能添加铸造者", async function () {
      await expect(sparkToken.addMinter(minter.address))
        .to.emit(sparkToken, "MinterAdded")
        .withArgs(minter.address);
      
      expect(await sparkToken.minters(minter.address)).to.be.true;
    });

    it("非Owner不能添加铸造者", async function () {
      await expect(
        sparkToken.connect(user).addMinter(minter.address)
      ).to.be.reverted;
    });

    it("Owner应该能移除铸造者", async function () {
      await sparkToken.addMinter(minter.address);
      
      await expect(sparkToken.removeMinter(minter.address))
        .to.emit(sparkToken, "MinterRemoved")
        .withArgs(minter.address);
      
      expect(await sparkToken.minters(minter.address)).to.be.false;
    });
  });

  describe("铸造功能", function () {
    beforeEach(async function () {
      await sparkToken.addMinter(minter.address);
    });

    it("授权的铸造者应该能铸造代币", async function () {
      const amount = ethers.parseEther("1000");
      await sparkToken.connect(minter).mint(user.address, amount);
      
      expect(await sparkToken.balanceOf(user.address)).to.equal(amount);
    });

    it("未授权的地址不能铸造代币", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        sparkToken.connect(user).mint(user.address, amount)
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("不能超过最大供应量", async function () {
      const maxSupply = await sparkToken.MAX_SUPPLY();
      await expect(
        sparkToken.connect(minter).mint(user.address, maxSupply + 1n)
      ).to.be.revertedWith("Exceeds max supply");
    });
  });

  describe("暂停功能", function () {
    beforeEach(async function () {
      await sparkToken.addMinter(minter.address);
      const amount = ethers.parseEther("1000");
      await sparkToken.connect(minter).mint(owner.address, amount);
    });

    it("Owner应该能暂停合约", async function () {
      await sparkToken.pause();
      expect(await sparkToken.paused()).to.be.true;
    });

    it("暂停后不能转账", async function () {
      await sparkToken.pause();
      const amount = ethers.parseEther("100");
      
      await expect(
        sparkToken.transfer(user.address, amount)
      ).to.be.reverted;
    });

    it("Owner应该能恢复合约", async function () {
      await sparkToken.pause();
      await sparkToken.unpause();
      expect(await sparkToken.paused()).to.be.false;
    });
  });

  describe("销毁功能", function () {
    beforeEach(async function () {
      await sparkToken.addMinter(minter.address);
      const amount = ethers.parseEther("1000");
      await sparkToken.connect(minter).mint(user.address, amount);
    });

    it("用户应该能销毁自己的代币", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialBalance = await sparkToken.balanceOf(user.address);
      
      await sparkToken.connect(user).burn(burnAmount);
      
      expect(await sparkToken.balanceOf(user.address)).to.equal(
        initialBalance - burnAmount
      );
    });
  });
});
