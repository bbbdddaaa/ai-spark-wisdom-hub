const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

async function testMint() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const contractAddress = '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839';
  const userAddress = '0xA0aaC49FcF8066D370544C14F3d99959e0541503';
  
  const abi = [{
    type: 'function',
    name: 'isEligible',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
  }, {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  }];
  
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  
  console.log('🔍 检查合约状态...\n');
  
  // 检查资格
  try {
    const isEligible = await contract.isEligible(userAddress);
    console.log('✅ 用户资格:', isEligible ? '有资格' : '无资格');
  } catch (error) {
    console.log('❌ 检查资格失败:', error.message);
  }
  
  // 估算 Gas
  try {
    console.log('\n🔍 估算 Gas...');
    const gasEstimate = await contract.mint.estimateGas({ value: ethers.parseEther('0.003') });
    console.log('✅ Gas 估算:', gasEstimate.toString());
    
    const gasPrice = await provider.getFeeData();
    const estimatedCost = gasEstimate * gasPrice.gasPrice / BigInt(10**18);
    console.log('✅ 预估 Gas 费用:', estimatedCost.toString(), 'ETH');
  } catch (error) {
    console.log('❌ Gas 估算失败:', error.message);
    console.log('   原因:', error.reason || '未知');
  }
}

testMint().catch(console.error);
