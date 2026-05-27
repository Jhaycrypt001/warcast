// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DispatchNFT is ERC1155, Ownable {

    enum ConfidenceTier { CHARLIE, BRAVO, ALPHA }
    enum Status { PENDING, CONFIRMED, BURNED }

    struct DispatchData {
        uint256 matchId;
        uint256 timestamp;
        string dispatchText;
        ConfidenceTier tier;
        Status status;
        string metadataURI;
        string homeTeam;
        string awayTeam;
        uint256 minute;
    }

    mapping(uint256 => DispatchData) public dispatches;
    uint256 public dispatchCount;

    event DispatchMinted(
        uint256 indexed dispatchId,
        uint256 matchId,
        string homeTeam,
        string awayTeam,
        ConfidenceTier tier
    );
    event DispatchResolved(uint256 indexed dispatchId, Status outcome);

    constructor() ERC1155("") {}

    function mintDispatch(
        address recipient,
        uint256 matchId,
        string calldata dispatchText,
        ConfidenceTier tier,
        string calldata metadataURI,
        string calldata homeTeam,
        string calldata awayTeam,
        uint256 minute,
        uint256 quantity
    ) external onlyOwner returns (uint256) {
        uint256 dispatchId = ++dispatchCount;

        dispatches[dispatchId] = DispatchData({
            matchId: matchId,
            timestamp: block.timestamp,
            dispatchText: dispatchText,
            tier: tier,
            status: Status.PENDING,
            metadataURI: metadataURI,
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            minute: minute
        });

        _mint(recipient, dispatchId, quantity, "");
        emit DispatchMinted(dispatchId, matchId, homeTeam, awayTeam, tier);
        return dispatchId;
    }

    function resolveDispatch(uint256 dispatchId, bool success) external onlyOwner {
        require(dispatches[dispatchId].timestamp != 0, "Dispatch does not exist");
        Status outcome = success ? Status.CONFIRMED : Status.BURNED;
        dispatches[dispatchId].status = outcome;
        emit DispatchResolved(dispatchId, outcome);
    }

    function getDispatch(uint256 dispatchId) external view returns (DispatchData memory) {
        return dispatches[dispatchId];
    }
}