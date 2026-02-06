#!/bin/bash

echo "🔍 开始验证合约..."
echo ""

# 合约地址
MINT_CONTROLLER="0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839"
SPARK_TOKEN="0xEABD7e41D19c9b977419aE054815C4bF9B028d20"

echo "📝 验证 MintController..."
npx hardhat verify --network base $MINT_CONTROLLER $SPARK_TOKEN "0xA0aaC49FcF8066D370544C14F3d99959e0541503"

echo ""
echo "📝 验证 SparkToken..."
npx hardhat verify --network base $SPARK_TOKEN

echo ""
echo "✅ 验证完成！"
echo "🔗 查看结果: https://basescan.org/address/$MINT_CONTROLLER#code"
