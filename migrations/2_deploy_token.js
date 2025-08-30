const CryptoPayXToken = artifacts.require("CryptoPayXToken");

module.exports = function (deployer, network, accounts) {
  // Deploy token with initial supply of 1,000,000 tokens
  const initialSupply = 1000000;
  
  deployer.deploy(CryptoPayXToken, initialSupply).then(() => {
    console.log("CryptoPayX Token deployed at:", CryptoPayXToken.address);
    console.log("Initial supply:", initialSupply, "CPX");
    console.log("Owner:", accounts[0]);
  });
};