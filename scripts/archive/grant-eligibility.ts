import hre from "hardhat";
const { ethers } = hre;

async function main() {
  console.log("授予 Mint 资格...\n");
  
  const mintControllerAddress = "0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839";
  // 用户地址（注意保持 checksum 格式）
  const userAddress = "0x6654b5aFDa97b0740C6268902Fa6543f8e5ceB2A";
  
  console.log(`目标地址: ${userAddress}\n`);
  
  const MintController = await ethers.getContractAt("MintController", mintControllerAddress);
  
  console.log("📝 检查当前资格...");
  const isEligibleBefore = await MintController.isEligible(userAddress);
  console.log(`   当前资格: ${isEligibleBefore ? "有资格" : "无资格"}\n`);
  
  if (isEligibleBefore) {
    console.log("✅ 用户已经有资格，无需重复授予");
    return;
  }
  
  console.log("📝 授予资格...");
  const tx = await MintController.grantEligibility([userAddress]);
  console.log(`   交易哈希: ${tx.hash}`);
  
  console.log("⏳ 等待交易确认...");
  await tx.wait();
  
  console.log("\n📝 验证资格...");
  const isEligibleAfter = await MintController.isEligible(userAddress);
  console.log(`   更新后资格: ${isEligibleAfter ? "有资格" : "无资格"}`);
  
  if (isEligibleAfter) {
    console.log("\n✅ 资格授予成功！");
    console.log(`🔗 查看交易: https://basescan.org/tx/${tx.hash}`);
  } else {
    console.log("\n❌ 资格授予失败");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
