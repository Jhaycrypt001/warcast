// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NationRegistry {
    mapping(address => string) public agentNation;
    mapping(string => uint256) public nationMemberCount;
    mapping(string => uint256) public nationAccuracyScore;

    event AgentRegistered(address indexed agent, string nation);
    event NationScoreUpdated(string nation, uint256 newScore);

    function joinNation(string calldata nation) external {
        require(bytes(agentNation[msg.sender]).length == 0, "Already in a nation");
        require(bytes(nation).length > 0, "Nation cannot be empty");
        agentNation[msg.sender] = nation;
        nationMemberCount[nation]++;
        emit AgentRegistered(msg.sender, nation);
    }

    function updateNationScore(string calldata nation, uint256 points) external {
        nationAccuracyScore[nation] += points;
        emit NationScoreUpdated(nation, nationAccuracyScore[nation]);
    }

    function getAgentNation(address agent) external view returns (string memory) {
        return agentNation[agent];
    }
}