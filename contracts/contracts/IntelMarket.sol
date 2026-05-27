// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract IntelMarket {

    struct Listing {
        address seller;
        uint256 dispatchId;
        uint256 price;
        bool active;
    }

    IERC1155 public dispatchNFT;
    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;
    uint256 public constant FEE_BPS = 250; // 2.5%
    address public feeRecipient;

    event DispatchListed(uint256 indexed listingId, uint256 dispatchId, uint256 price, address seller);
    event DispatchSold(uint256 indexed listingId, address buyer, uint256 price);
    event ListingCancelled(uint256 indexed listingId);

    constructor(address _dispatchNFT, address _feeRecipient) {
        dispatchNFT = IERC1155(_dispatchNFT);
        feeRecipient = _feeRecipient;
    }

    function listDispatch(uint256 dispatchId, uint256 price) external returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(
            dispatchNFT.balanceOf(msg.sender, dispatchId) > 0,
            "You don't own this dispatch"
        );

        uint256 listingId = ++listingCount;
        listings[listingId] = Listing({
            seller: msg.sender,
            dispatchId: dispatchId,
            price: price,
            active: true
        });

        emit DispatchListed(listingId, dispatchId, price, msg.sender);
        return listingId;
    }

    function buyDispatch(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "Listing not active");
        require(msg.value >= l.price, "Insufficient payment");

        l.active = false;

        uint256 fee = (l.price * FEE_BPS) / 10000;
        uint256 sellerAmount = l.price - fee;

        payable(l.seller).transfer(sellerAmount);
        payable(feeRecipient).transfer(fee);

        dispatchNFT.safeTransferFrom(l.seller, msg.sender, l.dispatchId, 1, "");

        emit DispatchSold(listingId, msg.sender, l.price);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.seller == msg.sender, "Not your listing");
        require(l.active, "Listing not active");
        l.active = false;
        emit ListingCancelled(listingId);
    }
}