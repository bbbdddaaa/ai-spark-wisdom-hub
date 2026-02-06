import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Resuming deployment...");
  
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    throw new Error("No accounts available. Please check your PRIVATE_KEY in .env.local");
  }
  
  const deployer = signers[0];
  
  if (!deployer) {
    throw new Error("Deployer account is undefined. Please check your PRIVATE_KEY in .env.local");
  }
  
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  // 已部署的合约地址
  const usdtAddress = "0x0786B0ee44DDABE474efc6E72EB18521873BBE2A";
  const sparkTokenAddress = "0xEABD7e41D19c9b977419aE054815C4bF9B028d20";
  
  console.log("\nUsing existing contracts:");
  console.log("MockUSDT:", usdtAddress);
  console.log("SparkToken:", sparkTokenAddress);
  
  // 继续部署剩余合约
  console.log("\nDeploying RewardPool...");
  const RewardPool = await ethers.getContractFactory("RewardPool");
  const rewardPool = await RewardPool.deploy(sparkTokenAddress, usdtAddress);
  await rewardPool.waitForDeployment();
  const rewardPoolAddress = await rewardPool.getAddress();
  console.log("RewardPool deployed:", rewardPoolAddress);
  
  console.log("\nDeploying MintController...");
  const MintController = await ethers.getContractFactory("MintController");
  const mintController = await MintController.deploy(
    sparkTokenAddress,
    deployer.address
  );
  await mintController.waitForDeployment();
  const mintControllerAddress = await mintController.getAddress();
  console.log("MintController deployed:", mintControllerAddress);
  
  console.log("\nDeploying MembershipManager...");
  const MembershipManager = await ethers.getContractFactory("MembershipManager");
  const membershipManager = await MembershipManager.deploy(
    usdtAddress,
    rewardPoolAddress
  );
  await membershipManager.waitForDeployment();
  const membershipManagerAddress = await membershipManager.getAddress();
  console.log("MembershipManager deployed:", membershipManagerAddress);
  
  console.log("\nConfiguring permissions...");
  
  const sparkToken = await ethers.getContractAt("SparkToken", sparkTokenAddress);
  
  console.log("Granting MintController mint role...");
  await sparkToken.addMinter(mintControllerAddress);
  
  console.log("Granting RewardPool mint role...");
  await sparkToken.addMinter(rewardPoolAddress);
  
  console.log("Adding deployer as reward manager...");
  await rewardPool.addRewardManager(deployer.address);
  
  console.log("\n=== Deployment complete ===");
  console.log("\nContract addresses:");
  console.log("USDT:", usdtAddress);
  console.log("SparkToken:", sparkTokenAddress);
  console.log("RewardPool:", rewardPoolAddress);
  console.log("MintController:", mintControllerAddress);
  console.log("MembershipManager:", membershipManagerAddress);
  
  console.log("\nUpdate .env.local with:");
  console.log(`VITE_USDT_ADDRESS=${usdtAddress}`);
  console.log(`VITE_SPARK_TOKEN_ADDRESS=${sparkTokenAddress}`);
  console.log(`VITE_REWARD_POOL_ADDRESS=${rewardPoolAddress}`);
  console.log(`VITE_MINT_CONTROLLER_ADDRESS=${mintControllerAddress}`);
  console.log(`VITE_MEMBERSHIP_MANAGER_ADDRESS=${membershipManagerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
