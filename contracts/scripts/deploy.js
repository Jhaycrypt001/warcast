const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("[*] Deploying AgentRank with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("[*] Balance:", hre.ethers.formatEther(balance), "OKB");

  // Your already-deployed NationRegistry address
  const NATION_REGISTRY_ADDRESS = "0x93A84f111D9f82B4BbBDE830F5f91A254d3C547f";

  console.log("\n[*] Deploying AgentRank...");
  const AgentRank = await hre.ethers.getContractFactory("AgentRank");
  const agentRank = await AgentRank.deploy(NATION_REGISTRY_ADDRESS);
  await agentRank.waitForDeployment();

  const address = await agentRank.getAddress();
  console.log("[+] AgentRank deployed to:", address);
  console.log("\n========================================");
  console.log("Add this to your ai-agent/.env:");
  console.log(`AGENT_RANK_ADDRESS=${address}`);
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
