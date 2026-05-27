// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface INationRegistry {
    function getAgentNation(address agent) external view returns (string memory);
    function updateNationScore(string calldata nation, uint256 points) external;
}

contract AgentRank is Ownable {
    INationRegistry public nationRegistry;

    mapping(address => uint256) public agentPoints;

    event PointsAwarded(address indexed agent, uint256 points, uint256 totalPoints);
    event RankUp(address indexed agent, string newRank);

    // OpenZeppelin v4: Ownable() takes no arguments — deployer is auto-set as owner
    constructor(address _nationRegistry) {
        nationRegistry = INationRegistry(_nationRegistry);
    }

    function awardPoints(address agent, uint256 points) external onlyOwner {
        uint256 oldPoints = agentPoints[agent];
        agentPoints[agent] += points;

        string memory oldRank = getRank(oldPoints);
        string memory newRank = getRank(agentPoints[agent]);

        emit PointsAwarded(agent, points, agentPoints[agent]);

        // Emit RankUp if threshold crossed — great for auto-tweeting
        if (keccak256(bytes(oldRank)) != keccak256(bytes(newRank))) {
            emit RankUp(agent, newRank);
        }

        // Sync points to nation leaderboard
        string memory nation = nationRegistry.getAgentNation(agent);
        if (bytes(nation).length > 0) {
            nationRegistry.updateNationScore(nation, points);
        }
    }

    function getRank(uint256 points) public pure returns (string memory) {
        if (points < 100)  return "Recruit Scout";
        if (points < 300)  return "Tactical Analyst";
        if (points < 700)  return "Intelligence Officer";
        if (points < 1500) return "War Room Strategist";
        return "Supreme Commander";
    }

    function getAgentRank(address agent) external view returns (string memory) {
        return getRank(agentPoints[agent]);
    }
}
