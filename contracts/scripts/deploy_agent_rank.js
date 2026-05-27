const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("[*] Deploying AgentRank with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("[*] Balance:", hre.ethers.utils.formatEther(balance), "OKB");

  const NATION_REGISTRY_ADDRESS = "0x93A84f111D9f82B4BbBDE830F5f91A254d3C547f";

  console.log("\n[*] Deploying AgentRank...");
  const AgentRank = await hre.ethers.getContractFactory("AgentRank");
  const agentRank = await AgentRank.deploy(NATION_REGISTRY_ADDRESS);
  await agentRank.deployed();

  const contractAddress = agentRank.address;
  console.log("[+] AgentRank deployed to:", contractAddress);
  console.log("\nAdd this to your ai-agent/.env:");
  console.log("AGENT_RANK_ADDRESS=" + contractAddress);
console.log("AGENT_RANK_ADDRESS=" + contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});