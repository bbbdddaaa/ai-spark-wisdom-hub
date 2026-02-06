import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Final deployment step...");
  
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    throw new Error("No accounts available.");
  }
  
  const deployer = signers[0];
  
  if (!deployer) {
    throw new Error("Deployer account is undefined.");
  }
  
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  // 已部署的合约地址
  const usdtAddress = "0x0786B0ee44DDABE474efc6E72EB18521873BBE2A";
  const sparkTokenAddress = "0xEABD7e41D19c9b977419aE054815C4bF9B028d20";
  const rewardPoolAddress = "0x873B9298B689bD4D1703ABef0AeB9738d826214B";
  
  console.log("\nUsing existing contracts:");
  console.log("MockUSDT:", usdtAddress);
  console.log("SparkToken:", sparkTokenAddress);
  console.log("RewardPool:", rewardPoolAddress);
  
  // 部署 MintController
  console.log("\nDeploying MintController...");
  const MintController = await ethers.getContractFactory("MintController");
  const mintController = await MintController.deploy(
    sparkTokenAddress,
    deployer.address,
    { 
      gasLimit: 3000000 // 设置 gas limit
    }
  );
  await mintController.waitForDeployment();
  const mintControllerAddress = await mintController.getAddress();
  console.log("✅ MintController deployed:", mintControllerAddress);
  
  // 等待确认
  console.log("Waiting for confirmations...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 部署 MembershipManager
  console.log("\nDeploying MembershipManager...");
  const MembershipManager = await ethers.getContractFactory("MembershipManager");
  const membershipManager = await MembershipManager.deploy(
    usdtAddress,
    rewardPoolAddress,
    { 
      gasLimit: 3000000 // 设置 gas limit
    }
  );
  await membershipManager.waitForDeployment();
  const membershipManagerAddress = await membershipManager.getAddress();
  console.log("✅ MembershipManager deployed:", membershipManagerAddress);
  
  // 等待确认
  console.log("Waiting for confirmations...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log("\n=== Configuring permissions ===");
  
  const sparkToken = await ethers.getContractAt("SparkToken", sparkTokenAddress);
  const rewardPool = await ethers.getContractAt("RewardPool", rewardPoolAddress);
  
  console.log("Granting MintController mint role...");
  const tx1 = await sparkToken.addMinter(mintControllerAddress);
  await tx1.wait();
  console.log("✅ MintController mint role granted");
  
  console.log("Granting RewardPool mint role...");
  const tx2 = await sparkToken.addMinter(rewardPoolAddress);
  await tx2.wait();
  console.log("✅ RewardPool mint role granted");
  
  console.log("Adding deployer as reward manager...");
  const tx3 = await rewardPool.addRewardManager(deployer.address);
  await tx3.wait();
  console.log("✅ Deployer added as reward manager");
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
  console.log("=".repeat(60));
  
  console.log("\n📋 Contract addresses:");
  console.log("VITE_USDT_ADDRESS=" + usdtAddress);
  console.log("VITE_SPARK_TOKEN_ADDRESS=" + sparkTokenAddress);
  console.log("VITE_REWARD_POOL_ADDRESS=" + rewardPoolAddress);
  console.log("VITE_MINT_CONTROLLER_ADDRESS=" + mintControllerAddress);
  console.log("VITE_MEMBERSHIP_MANAGER_ADDRESS=" + membershipManagerAddress);
  
  console.log("\n📝 Copy these to your .env.local file!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
