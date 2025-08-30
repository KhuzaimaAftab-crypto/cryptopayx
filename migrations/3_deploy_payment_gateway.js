const CryptoPayXToken = artifacts.require("CryptoPayXToken");
const PaymentGateway = artifacts.require("PaymentGateway");

module.exports = function (deployer, network, accounts) {
  deployer.then(async () => {
    // Get the deployed token instance
    const token = await CryptoPayXToken.deployed();
    
    // Deploy PaymentGateway with 1% transaction fee (100 basis points)
    const transactionFee = 100;
    
    await deployer.deploy(PaymentGateway, token.address, transactionFee);
    
    const paymentGateway = await PaymentGateway.deployed();
    
    console.log("Payment Gateway deployed at:", paymentGateway.address);
    console.log("Token address:", token.address);
    console.log("Transaction fee:", transactionFee / 100, "%");
    console.log("Owner:", accounts[0]);
    
    // Initial token allocation for development
    if (network === "development") {
      const transferAmount = web3.utils.toWei("10000", "ether");
      await token.transfer(paymentGateway.address, transferAmount, { from: accounts[0] });
      console.log("Transferred 10,000 CPX to Payment Gateway for testing");
    }
  });
};