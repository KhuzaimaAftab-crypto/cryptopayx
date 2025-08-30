const CryptoPayXToken = artifacts.require("CryptoPayXToken");

contract("CryptoPayXToken", (accounts) => {
  let token;
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const initialSupply = 1000000;

  beforeEach(async () => {
    token = await CryptoPayXToken.new(initialSupply, { from: owner });
  });

  describe("Deployment", () => {
    it("should deploy with correct initial values", async () => {
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      const ownerBalance = await token.balanceOf(owner);

      assert.equal(name, "CryptoPayX Token", "Incorrect token name");
      assert.equal(symbol, "CPX", "Incorrect token symbol");
      assert.equal(decimals, 18, "Incorrect decimals");
      assert.equal(totalSupply.toString(), web3.utils.toWei(initialSupply.toString(), "ether"), "Incorrect total supply");
      assert.equal(ownerBalance.toString(), totalSupply.toString(), "Owner should have all initial supply");
    });

    it("should set the correct owner", async () => {
      const contractOwner = await token.owner();
      assert.equal(contractOwner, owner, "Incorrect owner");
    });

    it("should enable minting by default", async () => {
      const mintingEnabled = await token.mintingEnabled();
      assert.equal(mintingEnabled, true, "Minting should be enabled by default");
    });
  });

  describe("ERC20 Functionality", () => {
    it("should transfer tokens between accounts", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      await token.transfer(user1, amount, { from: owner });
      
      const user1Balance = await token.balanceOf(user1);
      assert.equal(user1Balance.toString(), amount, "User1 should receive correct amount");
    });

    it("should approve and transferFrom correctly", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      await token.approve(user1, amount, { from: owner });
      const allowance = await token.allowance(owner, user1);
      assert.equal(allowance.toString(), amount, "Incorrect allowance");
      
      await token.transferFrom(owner, user2, amount, { from: user1 });
      const user2Balance = await token.balanceOf(user2);
      assert.equal(user2Balance.toString(), amount, "User2 should receive correct amount");
    });

    it("should fail when transferring more than balance", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      try {
        await token.transfer(user1, amount, { from: user2 });
        assert.fail("Transfer should have failed");
      } catch (error) {
        assert(error.message.includes("transfer amount exceeds balance"), "Wrong error message");
      }
    });
  });

  describe("Minting", () => {
    it("should allow owner to mint tokens", async () => {
      const amount = web3.utils.toWei("1000", "ether");
      const initialBalance = await token.balanceOf(user1);
      
      await token.mint(user1, amount, { from: owner });
      
      const newBalance = await token.balanceOf(user1);
      const expectedBalance = initialBalance.add(web3.utils.toBN(amount));
      assert.equal(newBalance.toString(), expectedBalance.toString(), "Incorrect balance after minting");
    });

    it("should not allow non-owner to mint tokens", async () => {
      const amount = web3.utils.toWei("1000", "ether");
      
      try {
        await token.mint(user1, amount, { from: user1 });
        assert.fail("Minting should have failed");
      } catch (error) {
        assert(error.message.includes("Only owner can call this function"), "Wrong error message");
      }
    });

    it("should disable minting when requested", async () => {
      await token.disableMinting({ from: owner });
      const mintingEnabled = await token.mintingEnabled();
      assert.equal(mintingEnabled, false, "Minting should be disabled");
      
      const amount = web3.utils.toWei("1000", "ether");
      try {
        await token.mint(user1, amount, { from: owner });
        assert.fail("Minting should have failed");
      } catch (error) {
        assert(error.message.includes("Minting is disabled"), "Wrong error message");
      }
    });
  });

  describe("Burning", () => {
    it("should allow users to burn their tokens", async () => {
      const amount = web3.utils.toWei("100", "ether");
      await token.transfer(user1, amount, { from: owner });
      
      const initialBalance = await token.balanceOf(user1);
      const initialSupply = await token.totalSupply();
      
      await token.burn(amount, { from: user1 });
      
      const newBalance = await token.balanceOf(user1);
      const newSupply = await token.totalSupply();
      
      assert.equal(newBalance.toString(), "0", "Balance should be zero after burning");
      assert.equal(newSupply.toString(), initialSupply.sub(web3.utils.toBN(amount)).toString(), "Total supply should decrease");
    });

    it("should not allow burning more than balance", async () => {
      const amount = web3.utils.toWei("100", "ether");
      
      try {
        await token.burn(amount, { from: user1 });
        assert.fail("Burning should have failed");
      } catch (error) {
        assert(error.message.includes("burn amount exceeds balance"), "Wrong error message");
      }
    });
  });

  describe("Ownership", () => {
    it("should transfer ownership correctly", async () => {
      await token.transferOwnership(user1, { from: owner });
      const newOwner = await token.owner();
      assert.equal(newOwner, user1, "Ownership should be transferred");
    });

    it("should not allow non-owner to transfer ownership", async () => {
      try {
        await token.transferOwnership(user2, { from: user1 });
        assert.fail("Ownership transfer should have failed");
      } catch (error) {
        assert(error.message.includes("Only owner can call this function"), "Wrong error message");
      }
    });
  });

  describe("Events", () => {
    it("should emit Transfer event on token transfer", async () => {
      const amount = web3.utils.toWei("100", "ether");
      const result = await token.transfer(user1, amount, { from: owner });
      
      assert.equal(result.logs.length, 1, "Should emit one event");
      assert.equal(result.logs[0].event, "Transfer", "Should emit Transfer event");
      assert.equal(result.logs[0].args.from, owner, "Incorrect from address");
      assert.equal(result.logs[0].args.to, user1, "Incorrect to address");
      assert.equal(result.logs[0].args.value.toString(), amount, "Incorrect amount");
    });

    it("should emit Mint event on token minting", async () => {
      const amount = web3.utils.toWei("100", "ether");
      const result = await token.mint(user1, amount, { from: owner });
      
      const mintEvent = result.logs.find(log => log.event === "Mint");
      assert(mintEvent, "Should emit Mint event");
      assert.equal(mintEvent.args.to, user1, "Incorrect to address");
      assert.equal(mintEvent.args.amount.toString(), amount, "Incorrect amount");
    });
  });
});