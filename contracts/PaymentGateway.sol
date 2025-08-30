// SPDX-License-Identifier: MIT
// CryptoPayX Payment Gateway Contract
// Developed by Khuzaima_Epsilonkz
// GitHub: @KhuzaimaAftab-crypto
pragma solidity ^0.8.19;

import "./Token.sol";

contract PaymentGateway {
    address public owner;
    CryptoPayXToken public token;
    
    uint256 public transactionFee; // Fee in basis points (100 = 1%)
    uint256 public constant MAX_FEE = 1000; // Maximum 10% fee
    
    struct Payment {
        address from;
        address to;
        uint256 amount;
        uint256 fee;
        uint256 timestamp;
        string description;
        bool completed;
    }
    
    struct Merchant {
        string name;
        string email;
        bool isActive;
        uint256 totalVolume;
        uint256 transactionCount;
    }
    
    mapping(address => Merchant) public merchants;
    mapping(bytes32 => Payment) public payments;
    mapping(address => bytes32[]) public userPayments;
    mapping(address => uint256) public balances;
    
    bytes32[] public allPaymentIds;
    
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string description
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee
    );
    
    event MerchantRegistered(address indexed merchant, string name);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event Withdrawal(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyActiveMerchant() {
        require(merchants[msg.sender].isActive, "Merchant not active");
        _;
    }
    
    constructor(address _tokenAddress, uint256 _transactionFee) {
        require(_transactionFee <= MAX_FEE, "Fee too high");
        owner = msg.sender;
        token = CryptoPayXToken(_tokenAddress);
        transactionFee = _transactionFee;
    }
    
    function registerMerchant(string memory _name, string memory _email) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(!merchants[msg.sender].isActive, "Merchant already registered");
        
        merchants[msg.sender] = Merchant({
            name: _name,
            email: _email,
            isActive: true,
            totalVolume: 0,
            transactionCount: 0
        });
        
        emit MerchantRegistered(msg.sender, _name);
    }
    
    function createPayment(
        address _to,
        uint256 _amount,
        string memory _description
    ) public returns (bytes32) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        require(token.balanceOf(msg.sender) >= _amount, "Insufficient balance");
        
        bytes32 paymentId = keccak256(
            abi.encodePacked(msg.sender, _to, _amount, block.timestamp, _description)
        );
        
        require(payments[paymentId].from == address(0), "Payment ID already exists");
        
        uint256 fee = (_amount * transactionFee) / 10000;
        
        payments[paymentId] = Payment({
            from: msg.sender,
            to: _to,
            amount: _amount,
            fee: fee,
            timestamp: block.timestamp,
            description: _description,
            completed: false
        });
        
        userPayments[msg.sender].push(paymentId);
        userPayments[_to].push(paymentId);
        allPaymentIds.push(paymentId);
        
        emit PaymentCreated(paymentId, msg.sender, _to, _amount, _description);
        
        return paymentId;
    }
    
    function executePayment(bytes32 _paymentId) public {
        Payment storage payment = payments[_paymentId];
        require(payment.from == msg.sender, "Not authorized");
        require(!payment.completed, "Payment already completed");
        require(token.balanceOf(msg.sender) >= payment.amount, "Insufficient balance");
        
        uint256 netAmount = payment.amount - payment.fee;
        
        // Transfer tokens
        require(token.transferFrom(msg.sender, payment.to, netAmount), "Transfer failed");
        
        if (payment.fee > 0) {
            require(token.transferFrom(msg.sender, owner, payment.fee), "Fee transfer failed");
        }
        
        payment.completed = true;
        
        // Update merchant stats if recipient is a merchant
        if (merchants[payment.to].isActive) {
            merchants[payment.to].totalVolume += payment.amount;
            merchants[payment.to].transactionCount++;
        }
        
        emit PaymentCompleted(_paymentId, payment.from, payment.to, payment.amount, payment.fee);
    }
    
    function deposit(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        balances[msg.sender] += _amount;
        emit Deposit(msg.sender, _amount);
    }
    
    function withdraw(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        balances[msg.sender] -= _amount;
        require(token.transfer(msg.sender, _amount), "Transfer failed");
        
        emit Withdrawal(msg.sender, _amount);
    }
    
    function getUserPayments(address _user) public view returns (bytes32[] memory) {
        return userPayments[_user];
    }
    
    function getPaymentDetails(bytes32 _paymentId) public view returns (
        address from,
        address to,
        uint256 amount,
        uint256 fee,
        uint256 timestamp,
        string memory description,
        bool completed
    ) {
        Payment memory payment = payments[_paymentId];
        return (
            payment.from,
            payment.to,
            payment.amount,
            payment.fee,
            payment.timestamp,
            payment.description,
            payment.completed
        );
    }
    
    function getAllPayments() public view returns (bytes32[] memory) {
        return allPaymentIds;
    }
    
    function updateTransactionFee(uint256 _newFee) public onlyOwner {
        require(_newFee <= MAX_FEE, "Fee too high");
        uint256 oldFee = transactionFee;
        transactionFee = _newFee;
        emit FeeUpdated(oldFee, _newFee);
    }
    
    function deactivateMerchant(address _merchant) public onlyOwner {
        merchants[_merchant].isActive = false;
    }
    
    function withdrawFees() public onlyOwner {
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance > 0, "No fees to withdraw");
        require(token.transfer(owner, contractBalance), "Transfer failed");
    }
    
    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0), "New owner is the zero address");
        owner = _newOwner;
    }
}