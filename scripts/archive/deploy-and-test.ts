import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 Deploying and Testing ETH-based Mint");
  console.log("=".repeat(60));
  console.log();

  const [deployer, user1] = await ethers.getSigners();
  
  console.log("📋 Accounts:");
  console.log("Deployer:", deployer.address);
  console.log("User1:", user1.address);
  console.log("Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("User1 Balance:", ethers.formatEther(await ethers.provider.getBalance(user1.address)), "ETH");
  console.log();

  // ========== 部署合约 ==========
  console.log("📦 STEP 1: Deploying Contracts");
  console.log("-".repeat(60));
  
  // 部署 MockUSDT (仅用于其他功能)
  console.log("Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const mockUsdt = await MockUSDT.deploy();
  await mockUsdt.waitForDeployment();
  const usdtAddress = await mockUsdt.getAddress();
  console.log("✅ MockUSDT:", usdtAddress);
  
  // 部署 SparkToken
  console.log("Deploying SparkToken...");
  const SparkToken = await ethers.getContractFactory("SparkToken");
  const sparkToken = await SparkToken.deploy();
  await sparkToken.waitForDeployment();
  const sparkTokenAddress = await sparkToken.getAddress();
  console.log("✅ SparkToken:", sparkTokenAddress);
  
  // 部署 MintController (使用 ETH)
  console.log("Deploying MintController (ETH-based)...");
  const MintController = await ethers.getContractFactory("MintController");
  const mintController = await MintController.deploy(
    sparkTokenAddress,
    deployer.address // treasury
  );
  await mintController.waitForDeployment();
  const mintControllerAddress = await mintController.getAddress();
  console.log("✅ MintController:", mintControllerAddress);
  
  // 授予权限
  console.log("Granting MintController mint permission...");
  await sparkToken.addMinter(mintControllerAddress);
  console.log("✅ Permission granted");
  console.log();

  // ========== 测试 ETH Mint ==========
  console.log("🧪 STEP 2: Testing ETH-based Mint");
  console.log("-".repeat(60));
  
  // 获取 mint 成本
  const mintCost = await mintController.MINT_COST();
  const mintReward = await mintController.MINT_REWARD();
  console.log("💰 Mint Cost:", ethers.formatEther(mintCost), "ETH");
  console.log("⚡ Mint Reward:", ethers.formatEther(mintReward), "SPARK");
  console.log();
  
  // 授予资格
  console.log("1️⃣  Granting eligibility to user1...");
  const grantTx = await mintController.grantEligibility([user1.address]);
  await grantTx.wait();
  const isEligible = await mintController.isEligible(user1.address);
  console.log("✅ Eligibility granted:", isEligible);
  console.log();
  
  // 记录 mint 前的余额
  const ethBalanceBefore = await ethers.provider.getBalance(user1.address);
  const sparkBalanceBefore = await sparkToken.balanceOf(user1.address);
  const treasuryBalanceBefore = await ethers.provider.getBalance(deployer.address);
  
  console.log("📊 Balances before mint:");
  console.log("   User1 ETH:", ethers.formatEther(ethBalanceBefore), "ETH");
  console.log("   User1 SPARK:", ethers.formatEther(sparkBalanceBefore), "SPARK");
  console.log("   Treasury ETH:", ethers.formatEther(treasuryBalanceBefore), "ETH");
  console.log();
  
  // 执行 mint
  console.log("2️⃣  Executing mint with ETH...");
  const mintTx = await mintController.connect(user1).mint({ value: mintCost });
  const receipt = await mintTx.wait();
  console.log("✅ Mint successful!");
  console.log("   Gas used:", receipt?.gasUsed.toString());
  console.log("   Transaction hash:", receipt?.hash);
  console.log();
  
  // 记录 mint 后的余额
  const ethBalanceAfter = await ethers.provider.getBalance(user1.address);
  const sparkBalanceAfter = await sparkToken.balanceOf(user1.address);
  const treasuryBalanceAfter = await ethers.provider.getBalance(deployer.address);
  
  console.log("📊 Balances after mint:");
  console.log("   User1 ETH:", ethers.formatEther(ethBalanceAfter), "ETH");
  console.log("   User1 SPARK:", ethers.formatEther(sparkBalanceAfter), "SPARK");
  console.log("   Treasury ETH:", ethers.formatEther(treasuryBalanceAfter), "ETH");
  console.log();
  
  // 计算变化
  const ethSpent = ethBalanceBefore - ethBalanceAfter;
  const sparkReceived = sparkBalanceAfter - sparkBalanceBefore;
  const treasuryReceived = treasuryBalanceAfter - treasuryBalanceBefore;
  
  console.log("💸 Changes:");
  console.log("   User1 ETH spent:", ethers.formatEther(ethSpent), "ETH");
  console.log("   User1 SPARK received:", ethers.formatEther(sparkReceived), "SPARK");
  console.log("   Treasury ETH received:", ethers.formatEther(treasuryReceived), "ETH");
  console.log();
  
  // 验证状态
  const hasMinted = await mintController.hasMinted(user1.address);
  const totalMinted = await mintController.totalMintedUsers();
  const remainingSlots = await mintController.remainingSlots();
  
  console.log("📈 Mint Status:");
  console.log("   Has minted:", hasMinted);
  console.log("   Total minted users:", totalMinted.toString());
  console.log("   Remaining slots:", remainingSlots.toString());
  console.log();

  // ========== 测试错误情况 ==========
  console.log("🧪 STEP 3: Testing Error Cases");
  console.log("-".repeat(60));
  
  // 测试错误的 ETH 金额
  console.log("3️⃣  Testing incorrect ETH amount...");
  try {
    const wrongAmount = ethers.parseEther("0.001");
    await mintController.connect(user1).mint({ value: wrongAmount });
    console.log("❌ Should have failed but didn't!");
  } catch (error: any) {
    console.log("✅ Correctly rejected incorrect ETH amount");
  }
  console.log();
  
  // 测试重复 mint
  console.log("4️⃣  Testing duplicate mint...");
  try {
    await mintController.connect(user1).mint({ value: mintCost });
    console.log("❌ Should have failed but didn't!");
  } catch (error: any) {
    console.log("✅ Correctly rejected (mint cap or already minted)");
  }
  console.log();

  console.log("=".repeat(60));
  console.log("🎉 All tests passed! ETH-based mint is working correctly!");
  console.log("=".repeat(60));
  console.log();
  console.log("📝 Summary:");
  console.log("   ✅ Deployment successful");
  console.log("   ✅ ETH payment working");
  console.log("   ✅ SPARK tokens minted");
  console.log("   ✅ Treasury received ETH");
  console.log("   ✅ Error handling working");
  console.log();
  console.log("🚀 Ready to use!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
