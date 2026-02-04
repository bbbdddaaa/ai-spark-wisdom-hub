import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("Deploying contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  let usdtAddress: string;
  const network = await ethers.provider.getNetwork();
  
  if (network.chainId === 1n) {
    usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    console.log("Using mainnet USDT:", usdtAddress);
  } else {
    console.log("Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUsdt = await MockUSDT.deploy();
    await mockUsdt.waitForDeployment();
    usdtAddress = await mockUsdt.getAddress();
    console.log("MockUSDT deployed:", usdtAddress);
  }
  
  console.log("\nDeploying SparkToken...");
  const SparkToken = await ethers.getContractFactory("SparkToken");
  const sparkToken = await SparkToken.deploy();
  await sparkToken.waitForDeployment();
  const sparkTokenAddress = await sparkToken.getAddress();
  console.log("SparkToken deployed:", sparkTokenAddress);
  
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
    usdtAddress,
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
  
  console.log("\nUpdate .env with:");
  console.log(`VITE_USDT_ADDRESS=${usdtAddress}`);
  console.log(`VITE_SPARK_TOKEN_ADDRESS=${sparkTokenAddress}`);
  console.log(`VITE_REWARD_POOL_ADDRESS=${rewardPoolAddress}`);
  console.log(`VITE_MINT_CONTROLLER_ADDRESS=${mintControllerAddress}`);
  console.log(`VITE_MEMBERSHIP_MANAGER_ADDRESS=${membershipManagerAddress}`);
  
  if (network.chainId === 1n || network.chainId === 11155111n) {
    console.log("\nVerify contracts manually after confirmation:");
    console.log(`npx hardhat verify --network ${network.name} ${sparkTokenAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${rewardPoolAddress} ${sparkTokenAddress} ${usdtAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${mintControllerAddress} ${sparkTokenAddress} ${usdtAddress} ${deployer.address}`);
    console.log(`npx hardhat verify --network ${network.name} ${membershipManagerAddress} ${usdtAddress} ${rewardPoolAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
