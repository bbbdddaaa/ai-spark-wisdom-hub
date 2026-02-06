import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("检查 MintController 合约配置...\n");
  
  const mintControllerAddress = "0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839";
  
  const MintController = await ethers.getContractAt("MintController", mintControllerAddress);
  
  // 获取当前使用的 signer
  const [signer] = await ethers.getSigners();
  console.log("当前使用的账户:", signer.address);
  
  // 获取合约 Owner
  const owner = await MintController.owner();
  console.log("合约 Owner:", owner);
  console.log();
  
  // 检查是否匹配
  if (signer.address.toLowerCase() === owner.toLowerCase()) {
    console.log("✅ 当前账户是合约 Owner");
  } else {
    console.log("❌ 当前账户不是合约 Owner！");
    console.log("   无法授予 Mint 资格");
  }
  console.log();
  
  // 检查其他合约状态
  const totalMintedUsers = await MintController.totalMintedUsers();
  console.log("已 Mint 用户数:", totalMintedUsers.toString());
  console.log("最大用户数: 2000");
  console.log();
  
  // 检查测试地址的状态
  const testAddress = "0x38783e1fa0e5d082a221ad81d35e129fd55d19f0";
  const isEligible = await MintController.isEligible(testAddress);
  const hasMinted = await MintController.hasMinted(testAddress);
  const mintCount = await MintController.mintCount(testAddress);
  
  console.log("测试地址状态:", testAddress);
  console.log("  - 是否有资格:", isEligible);
  console.log("  - 是否已 Mint:", hasMinted);
  console.log("  - Mint 次数:", mintCount.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
