import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Testing ETH-based mint functionality...\n");

  const [deployer, user1] = await ethers.getSigners();
  
  // 获取合约地址
  const mintControllerAddress = process.env.VITE_MINT_CONTROLLER_ADDRESS || "";
  const sparkTokenAddress = process.env.VITE_SPARK_TOKEN_ADDRESS || "";
  
  if (!mintControllerAddress || !sparkTokenAddress) {
    throw new Error("Contract addresses not found in .env.local");
  }
  
  // 连接合约
  const mintController = await ethers.getContractAt("MintController", mintControllerAddress);
  const sparkToken = await ethers.getContractAt("SparkToken", sparkTokenAddress);
  
  console.log("📋 Contract Info:");
  console.log("MintController:", mintControllerAddress);
  console.log("SparkToken:", sparkTokenAddress);
  console.log("User:", user1.address);
  console.log();
  
  // 检查 mint 成本
  const mintCost = await mintController.MINT_COST();
  console.log("💰 Mint Cost:", ethers.formatEther(mintCost), "ETH");
  console.log();
  
  // 授予 user1 mint 资格
  console.log("1️⃣  Granting eligibility to user1...");
  const grantTx = await mintController.grantEligibility([user1.address]);
  await grantTx.wait();
  console.log("✅ Eligibility granted\n");
  
  // 检查资格
  const isEligible = await mintController.isEligible(user1.address);
  console.log("🔍 Is eligible:", isEligible);
  
  // 检查余额
  const balanceBefore = await ethers.provider.getBalance(user1.address);
  const sparkBalanceBefore = await sparkToken.balanceOf(user1.address);
  console.log("💵 ETH balance before:", ethers.formatEther(balanceBefore), "ETH");
  console.log("⚡ SPARK balance before:", ethers.formatEther(sparkBalanceBefore), "SPARK");
  console.log();
  
  // 执行 mint（发送 ETH）
  console.log("2️⃣  Minting SPARK tokens with ETH...");
  const mintTx = await mintController.connect(user1).mint({ value: mintCost });
  const receipt = await mintTx.wait();
  console.log("✅ Mint successful! Gas used:", receipt?.gasUsed.toString());
  console.log();
  
  // 检查 mint 后余额
  const balanceAfter = await ethers.provider.getBalance(user1.address);
  const sparkBalanceAfter = await sparkToken.balanceOf(user1.address);
  console.log("💵 ETH balance after:", ethers.formatEther(balanceAfter), "ETH");
  console.log("⚡ SPARK balance after:", ethers.formatEther(sparkBalanceAfter), "SPARK");
  console.log();
  
  // 计算花费
  const ethSpent = balanceBefore - balanceAfter;
  const sparkReceived = sparkBalanceAfter - sparkBalanceBefore;
  console.log("📊 Summary:");
  console.log("   ETH spent:", ethers.formatEther(ethSpent), "ETH");
  console.log("   SPARK received:", ethers.formatEther(sparkReceived), "SPARK");
  console.log();
  
  // 验证状态
  const hasMinted = await mintController.hasMinted(user1.address);
  const totalMinted = await mintController.totalMintedUsers();
  const remainingSlots = await mintController.remainingSlots();
  
  console.log("📈 Mint Status:");
  console.log("   Has minted:", hasMinted);
  console.log("   Total minted users:", totalMinted.toString());
  console.log("   Remaining slots:", remainingSlots.toString());
  
  console.log("\n🎉 ETH mint test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
