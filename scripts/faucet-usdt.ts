import hre from "hardhat";
const { ethers } = hre;

/**
 * Faucet: send test USDT to an address (MockUSDT only).
 * Usage:
 *   FAUCET_TO=0xYourWallet npx hardhat run scripts/faucet-usdt.ts --network localhost
 *   FAUCET_TO=0xYourWallet npx hardhat run scripts/faucet-usdt.ts --network sepolia
 * If FAUCET_TO is not set, sends to deployer (PRIVATE_KEY address).
 */
async function main() {
  const usdtAddress = process.env.VITE_USDT_ADDRESS;
  if (!usdtAddress) {
    console.error("Set VITE_USDT_ADDRESS (MockUSDT contract) in .env");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const to = process.env.FAUCET_TO || deployer.address;

  console.log("USDT contract:", usdtAddress);
  console.log("Recipient:", to);
  console.log("Executor (pays gas):", deployer.address);

  const mockUsdt = await ethers.getContractAt("MockUSDT", usdtAddress);
  const tx = await mockUsdt.faucet(to);
  await tx.wait();
  const balance = await mockUsdt.balanceOf(to);
  const decimals = await mockUsdt.decimals();
  console.log("Success! Balance:", ethers.formatUnits(balance, decimals), "USDT");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
