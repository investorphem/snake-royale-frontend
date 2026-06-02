// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @dev Interface for interacting with ERC20 tokens like cUSD.
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @dev OpenZeppelin v4.x Ownable contract wrapper.
 * The constructor takes 0 arguments and automatically sets msg.sender as the owner.
 */
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/**
 * @title SnakeWager
 * @dev Manages multiplayer room creation, entry fees in cUSD, and secure admin-led settlement.
 */
contract SnakeWager is Ownable {
    IERC20 public immutable wagerToken;

    struct Room {
        uint256 roomId;
        uint256 entryFee;
        address[] players;
        address winner;
        bool isSettled;
        bool isActive;
    }

    // Mapping from Room ID to Room details
    mapping(uint256 => Room) public rooms;
    
    // Tracks whether a player is currently locked in a specific active room
    mapping(uint256 => mapping(address => bool)) public isInRoom;

    event RoomCreated(uint256 indexed roomId, uint256 entryFee);
    event PlayerJoined(uint256 indexed roomId, address indexed player);
    event WagerSettled(uint256 indexed roomId, address indexed winner, uint256 payoutAmount);

    /**
     * @param _wagerTokenAddress The contract address of the token used for wagering (e.g., cUSD)
     */
    constructor(address _wagerTokenAddress) Ownable() {
        require(_wagerTokenAddress != address(0), "Invalid token address");
        wagerToken = IERC20(_wagerTokenAddress);
    }

    /**
     * @dev Creates a new wagering arena room.
     * @param _roomId Unique identifier for the game room.
     * @param _entryFee Amount of tokens required to join the match.
     */
    function createRoom(uint256 _roomId, uint256 _entryFee) external onlyOwner {
        require(!rooms[_roomId].isActive, "Room already exists");
        
        rooms[_roomId].roomId = _roomId;
        rooms[_roomId].entryFee = _entryFee;
        rooms[_roomId].isActive = true;
        rooms[_roomId].isSettled = false;

        emit RoomCreated(_roomId, _entryFee);
    }

    /**
     * @dev Allows players to join an open room by depositing the entry fee.
     * @param _roomId The identifier of the room to join.
     */
    function joinRoom(uint256 _roomId) external {
        Room storage room = rooms[_roomId];
        require(room.isActive, "Room is not active");
        require(!room.isSettled, "Room already settled");
        require(!isInRoom[_roomId][msg.sender], "Already in this room");

        // Pull the entry fee from the player's wallet into this contract
        if (room.entryFee > 0) {
            bool success = wagerToken.transferFrom(msg.sender, address(this), room.entryFee);
            require(success, "Token transfer failed. Check allowance.");
        }

        room.players.push(msg.sender);
        isInRoom[_roomId][msg.sender] = true;

        emit PlayerJoined(_roomId, msg.sender);
    }

    /**
     * @dev Called by the Node.js server engine to declare a winner and distribute the funds.
     * @param _roomId The identifier of the finished room.
     * @param _winner The address of the player who won the match.
     */
    function declareWinner(uint256 _roomId, address _winner) external onlyOwner {
        Room storage room = rooms[_roomId];
        require(room.isActive, "Room is not active");
        require(!room.isSettled, "Room already settled");
        require(isInRoom[_roomId][_winner], "Winner was not a registered player");

        room.isSettled = true;
        room.isActive = false;
        room.winner = _winner;

        // Calculate total pool prize gathered from all room participants
        uint256 totalPool = room.entryFee * room.players.length;

        // Pay out the complete pool rewards to the winning player
        if (totalPool > 0) {
            bool success = wagerToken.transfer(_winner, totalPool);
            require(success, "Payout transfer failed");
        }

        emit WagerSettled(_roomId, _winner, totalPool);
    }

    /**
     * @dev Emergency fallback to recover tokens if a match gets permanently stuck.
     */
    function emergencyRefund(uint256 _roomId) external onlyOwner {
        Room storage room = rooms[_roomId];
        require(room.isActive, "Room is not active");
        require(!room.isSettled, "Room already settled");

        room.isActive = false;
        room.isSettled = true;

        uint256 refundAmount = room.entryFee;
        if (refundAmount > 0) {
            for (uint256 i = 0; i < room.players.length; i++) {
                address player = room.players[i];
                wagerToken.transfer(player, refundAmount);
            }
        }
    }
}