const CryptoPayXToken = artifacts.require("CryptoPayXToken");
const PaymentGateway = artifacts.require("PaymentGateway");

contract("PaymentGateway", (accounts) => {
  let token;
  let gateway;
  const owner = accounts[0];
  const merchant = accounts[1];
  const user1 = accounts[2];
  const user2 = accounts[3];
  const initialSupply = 1000000;
  const transactionFee = 100; // 1%

  beforeEach(async () => {
    token = await CryptoPayXToken.new(initialSupply, { from: owner });
    gateway = await PaymentGateway.new(token.address, transactionFee, { from: owner });
    
    // Transfer tokens to test accounts
    await token.transfer(user1, web3.utils.toWei("1000", "ether"), { from: owner });
    await token.transfer(user2, web3.utils.toWei("1000", "ether"), { from: owner });
    
    // Approve gateway to spend tokens
    await token.approve(gateway.address, web3.utils.toWei("10000", "ether"), { from: user1 });
    await token.approve(gateway.address, web3.utils.toWei("10000", "ether"), { from: user2 });
  });

  describe("Deployment", () => {
    it("should deploy with correct initial values", async () => {
      const gatewayOwner = await gateway.owner();
      const tokenAddress = await gateway.token();
      const fee = await gateway.transactionFee();

      assert.equal(gatewayOwner, owner, "Incorrect owner");
      assert.equal(tokenAddress, token.address, "Incorrect token address");
      assert.equal(fee.toString(), transactionFee.toString(), "Incorrect transaction fee");
    });

    it("should not allow fee greater than maximum", async () => {
      try {
        await PaymentGateway.new(token.address, 1001, { from: owner }); // > 10%
        assert.fail("Deployment should have failed");
      } catch (error) {
        assert(error.message.includes("Fee too high"), "Wrong error message");
      }
    });
  });

  describe("Merchant Registration", () => {
    it("should allow merchant registration", async () => {
      const result = await gateway.registerMerchant("Test Merchant", "test@merchant.com", { from: merchant });
      
      const merchantData = await gateway.merchants(merchant);
      assert.equal(merchantData.name, "Test Merchant", "Incorrect merchant name");
      assert.equal(merchantData.email, "test@merchant.com", "Incorrect merchant email");
      assert.equal(merchantData.isActive, true, "Merchant should be active");
      assert.equal(merchantData.totalVolume.toString(), "0", "Initial volume should be zero");
      assert.equal(merchantData.transactionCount.toString(), "0", "Initial transaction count should be zero");
      
      assert.equal(result.logs.length, 1, "Should emit one event");
      assert.equal(result.logs[0].event, "MerchantRegistered", "Should emit MerchantRegistered event");
    });

    it("should not allow empty merchant name", async () => {
      try {
        await gateway.registerMerchant("", "test@merchant.com", { from: merchant });
        assert.fail("Registration should have failed");
      } catch (error) {
        assert(error.message.includes("Name cannot be empty"), "Wrong error message");
      }
    });

    it("should not allow duplicate merchant registration", async () => {
      await gateway.registerMerchant("Test Merchant", "test@merchant.com", { from: merchant });
      
      try {
        await gateway.registerMerchant("Test Merchant 2", "test2@merchant.com", { from: merchant });
        assert.fail("Duplicate registration should have failed");
      } catch (error) {
        assert(error.message.includes("Merchant already registered"), "Wrong error message");
      }
    });
  });

  describe("Payment Creation", () => {
    it("should create payment successfully", async () => {
      const amount = web3.utils.toWei("100", "ether");
      const description = "Test payment";
      
      const result = await gateway.createPayment(user2, amount, description, { from: user1 });
      const paymentId = result.logs[0].args.paymentId;
      
      const payment = await gateway.getPaymentDetails(paymentId);
      assert.equal(payment.from, user1, "Incorrect sender");
      assert.equal(payment.to, user2, "Incorrect recipient");
      assert.equal(payment.amount.toString(), amount, "Incorrect amount");
      assert.equal(payment.description, description, "Incorrect description");
      assert.equal(payment.completed, false, "Payment should not be completed");
      
      assert.equal(result.logs[0].event, "PaymentCreated", "Should emit PaymentCreated event");
    });

    it("should calculate fee correctly", async () => {
      const amount = web3.utils.toWei("100", "ether");
      const expectedFee = web3.utils.toWei("1", "ether"); // 1% of 100
      
      const result = await gateway.createPayment(user2, amount, "Test", { from: user1 });
      const paymentId = result.logs[0].args.paymentId;
      
      const payment = await gateway.getPaymentDetails(paymentId);
      assert.equal(payment.fee.toString(), expectedFee, "Incorrect fee calculation");
    });

    it("should not allow zero amount", async () => {
      try {
        await gateway.createPayment(user2, 0, "Test", { from: user1 });
        assert.fail("Payment creation should have failed");
      } catch (error) {
        assert(error.message.includes("Amount must be greater than 0"), "Wrong error message");
      }
    });

    it("should not allow zero address recipient", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      try {
        await gateway.createPayment("0x0000000000000000000000000000000000000000", amount, "Test", { from: user1 });
        assert.fail("Payment creation should have failed");
      } catch (error) {
        assert(error.message.includes("Invalid recipient"), "Wrong error message");
      }
    });
  });

  describe("Payment Execution", () => {
    let paymentId;

    beforeEach(async () => {
      const amount = web3.utils.toWei("100", "ether");
      const result = await gateway.createPayment(user2, amount, "Test payment", { from: user1 });
      paymentId = result.logs[0].args.paymentId;
    });

    it("should execute payment successfully", async () => {
      const initialUser1Balance = await token.balanceOf(user1);
      const initialUser2Balance = await token.balanceOf(user2);
      const initialOwnerBalance = await token.balanceOf(owner);
      
      const result = await gateway.executePayment(paymentId, { from: user1 });
      
      const finalUser1Balance = await token.balanceOf(user1);
      const finalUser2Balance = await token.balanceOf(user2);
      const finalOwnerBalance = await token.balanceOf(owner);
      
      const payment = await gateway.getPaymentDetails(paymentId);
      const expectedNetAmount = web3.utils.toBN(payment.amount).sub(web3.utils.toBN(payment.fee));
      
      assert.equal(
        finalUser1Balance.toString(),
        initialUser1Balance.sub(web3.utils.toBN(payment.amount)).toString(),
        "Incorrect sender balance"
      );
      assert.equal(
        finalUser2Balance.toString(),
        initialUser2Balance.add(expectedNetAmount).toString(),
        "Incorrect recipient balance"
      );
      assert.equal(
        finalOwnerBalance.toString(),
        initialOwnerBalance.add(web3.utils.toBN(payment.fee)).toString(),
        "Incorrect owner balance (fee)"
      );
      
      assert.equal(payment.completed, true, "Payment should be completed");
      assert.equal(result.logs[0].event, "PaymentCompleted", "Should emit PaymentCompleted event");
    });

    it("should not allow unauthorized execution", async () => {
      try {
        await gateway.executePayment(paymentId, { from: user2 });
        assert.fail("Payment execution should have failed");
      } catch (error) {
        assert(error.message.includes("Not authorized"), "Wrong error message");
      }
    });

    it("should not allow double execution", async () => {
      await gateway.executePayment(paymentId, { from: user1 });
      
      try {
        await gateway.executePayment(paymentId, { from: user1 });
        assert.fail("Double execution should have failed");
      } catch (error) {
        assert(error.message.includes("Payment already completed"), "Wrong error message");
      }
    });
  });

  describe("Merchant Stats", () => {
    beforeEach(async () => {
      await gateway.registerMerchant("Test Merchant", "test@merchant.com", { from: merchant });
    });

    it("should update merchant stats on payment to merchant", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      const result = await gateway.createPayment(merchant, amount, "Purchase", { from: user1 });
      const paymentId = result.logs[0].args.paymentId;
      
      await gateway.executePayment(paymentId, { from: user1 });
      
      const merchantData = await gateway.merchants(merchant);
      assert.equal(merchantData.totalVolume.toString(), amount, "Incorrect total volume");
      assert.equal(merchantData.transactionCount.toString(), "1", "Incorrect transaction count");
    });
  });

  describe("Deposit and Withdrawal", () => {
    it("should allow users to deposit tokens", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      const result = await gateway.deposit(amount, { from: user1 });
      const balance = await gateway.balances(user1);
      
      assert.equal(balance.toString(), amount, "Incorrect deposit balance");
      assert.equal(result.logs[0].event, "Deposit", "Should emit Deposit event");
    });

    it("should allow users to withdraw tokens", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      await gateway.deposit(amount, { from: user1 });
      const initialTokenBalance = await token.balanceOf(user1);
      
      const result = await gateway.withdraw(amount, { from: user1 });
      const finalBalance = await gateway.balances(user1);
      const finalTokenBalance = await token.balanceOf(user1);
      
      assert.equal(finalBalance.toString(), "0", "Gateway balance should be zero");
      assert.equal(
        finalTokenBalance.toString(),
        initialTokenBalance.add(web3.utils.toBN(amount)).toString(),
        "Token balance should increase"
      );
      assert.equal(result.logs[0].event, "Withdrawal", "Should emit Withdrawal event");
    });

    it("should not allow withdrawal more than balance", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      try {
        await gateway.withdraw(amount, { from: user1 });
        assert.fail("Withdrawal should have failed");
      } catch (error) {
        assert(error.message.includes("Insufficient balance"), "Wrong error message");
      }
    });
  });

  describe("Admin Functions", () => {
    it("should allow owner to update transaction fee", async () => {
      const newFee = 200; // 2%
      
      const result = await gateway.updateTransactionFee(newFee, { from: owner });
      const updatedFee = await gateway.transactionFee();
      
      assert.equal(updatedFee.toString(), newFee.toString(), "Fee should be updated");
      assert.equal(result.logs[0].event, "FeeUpdated", "Should emit FeeUpdated event");
    });

    it("should not allow non-owner to update fee", async () => {
      try {
        await gateway.updateTransactionFee(200, { from: user1 });
        assert.fail("Fee update should have failed");
      } catch (error) {
        assert(error.message.includes("Only owner can call this function"), "Wrong error message");
      }
    });

    it("should allow owner to deactivate merchant", async () => {
      await gateway.registerMerchant("Test Merchant", "test@merchant.com", { from: merchant });
      
      await gateway.deactivateMerchant(merchant, { from: owner });
      const merchantData = await gateway.merchants(merchant);
      
      assert.equal(merchantData.isActive, false, "Merchant should be deactivated");
    });
  });
});