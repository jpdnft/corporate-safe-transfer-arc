import { expect } from "chai";
import { ethers } from "hardhat";

describe("CorporateSafeTransfer", function () {
  async function deployFixture() {
    const [mary, ralph, rita, other, newPayer, newRecipient] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const CorporateSafeTransfer = await ethers.getContractFactory("CorporateSafeTransfer");
    const safeTransfer = await CorporateSafeTransfer.deploy(await usdc.getAddress());
    await safeTransfer.waitForDeployment();

    const amount = ethers.parseUnits("1000", 6);
    await usdc.mint(ralph.address, amount);
    await usdc.mint(newPayer.address, amount);

    return { mary, ralph, rita, other, newPayer, newRecipient, usdc, safeTransfer };
  }

  async function configureAndApprove() {
    const fixture = await deployFixture();
    const { ralph, rita, usdc, safeTransfer } = fixture;
    const amount = ethers.parseUnits("250", 6);

    await safeTransfer.setPayer(ralph.address);
    await safeTransfer.setRecipient(rita.address);
    await usdc.connect(ralph).approve(await safeTransfer.getAddress(), amount);

    return { ...fixture, amount };
  }

  it("deployer becomes owner", async function () {
    const { mary, safeTransfer } = await deployFixture();

    expect(await safeTransfer.owner()).to.equal(mary.address);
  });

  it("owner can set payer", async function () {
    const { ralph, safeTransfer } = await deployFixture();

    await expect(safeTransfer.setPayer(ralph.address))
      .to.emit(safeTransfer, "PayerUpdated")
      .withArgs(ethers.ZeroAddress, ralph.address);

    expect(await safeTransfer.payer()).to.equal(ralph.address);
  });

  it("owner can set recipient", async function () {
    const { rita, safeTransfer } = await deployFixture();

    await expect(safeTransfer.setRecipient(rita.address))
      .to.emit(safeTransfer, "RecipientUpdated")
      .withArgs(ethers.ZeroAddress, rita.address);

    expect(await safeTransfer.recipient()).to.equal(rita.address);
  });

  it("non-owner cannot set payer or recipient", async function () {
    const { ralph, rita, other, safeTransfer } = await deployFixture();

    await expect(safeTransfer.connect(other).setPayer(ralph.address))
      .to.be.revertedWithCustomError(safeTransfer, "OwnableUnauthorizedAccount")
      .withArgs(other.address);

    await expect(safeTransfer.connect(other).setRecipient(rita.address))
      .to.be.revertedWithCustomError(safeTransfer, "OwnableUnauthorizedAccount")
      .withArgs(other.address);
  });

  it("only payer can deposit", async function () {
    const { other, amount, safeTransfer } = await configureAndApprove();

    await expect(safeTransfer.connect(other).deposit(amount, "Monthly funding", "AP-1001"))
      .to.be.revertedWithCustomError(safeTransfer, "NotAuthorizedPayer");
  });

  it("deposit fails without approval", async function () {
    const { ralph, rita, safeTransfer } = await deployFixture();
    const amount = ethers.parseUnits("100", 6);

    await safeTransfer.setPayer(ralph.address);
    await safeTransfer.setRecipient(rita.address);

    await expect(safeTransfer.connect(ralph).deposit(amount, "Monthly funding", "AP-1002"))
      .to.be.reverted;
  });

  it("deposit creates transfer record", async function () {
    const { ralph, amount, usdc, safeTransfer } = await configureAndApprove();

    await expect(safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05"))
      .to.emit(safeTransfer, "TransferCreated")
      .withArgs(1, ralph.address, amount, "Sydney payroll", "PAY-2026-05");

    const transfer = await safeTransfer.getTransfer(1);
    expect(transfer.id).to.equal(1);
    expect(transfer.amount).to.equal(amount);
    expect(transfer.memo).to.equal("Sydney payroll");
    expect(transfer.internalReference).to.equal("PAY-2026-05");
    expect(transfer.fundedBy).to.equal(ralph.address);
    expect(transfer.withdrawn).to.equal(false);
    expect(await safeTransfer.getTransferCount()).to.equal(1);
    expect(await usdc.balanceOf(await safeTransfer.getAddress())).to.equal(amount);
    expect(await safeTransfer.getAvailableTransfers()).to.deep.equal([1n]);
  });

  it("only recipient can withdraw", async function () {
    const { ralph, other, amount, safeTransfer } = await configureAndApprove();
    await safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05");

    await expect(safeTransfer.connect(other).withdraw(1))
      .to.be.revertedWithCustomError(safeTransfer, "NotAuthorizedRecipient");
  });

  it("recipient can withdraw an available transfer", async function () {
    const { ralph, rita, amount, usdc, safeTransfer } = await configureAndApprove();
    await safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05");

    await expect(safeTransfer.connect(rita).withdraw(1))
      .to.emit(safeTransfer, "TransferWithdrawn")
      .withArgs(1, rita.address, amount);

    const transfer = await safeTransfer.getTransfer(1);
    expect(transfer.withdrawn).to.equal(true);
    expect(transfer.withdrawnAt).to.be.greaterThan(0);
    expect(await usdc.balanceOf(rita.address)).to.equal(amount);
    expect(await safeTransfer.getAvailableTransfers()).to.deep.equal([]);
    expect(await safeTransfer.getCompletedTransfers()).to.deep.equal([1n]);
    expect(await safeTransfer.totalPendingAmount()).to.equal(0);
  });

  it("transfer cannot be withdrawn twice", async function () {
    const { ralph, rita, amount, safeTransfer } = await configureAndApprove();
    await safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05");
    await safeTransfer.connect(rita).withdraw(1);

    await expect(safeTransfer.connect(rita).withdraw(1))
      .to.be.revertedWithCustomError(safeTransfer, "TransferAlreadyWithdrawn");
  });

  it("owner can update payer and recipient while funds remain in contract", async function () {
    const { ralph, rita, newPayer, newRecipient, amount, usdc, safeTransfer } = await configureAndApprove();
    await safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05");

    await safeTransfer.setPayer(newPayer.address);
    await safeTransfer.setRecipient(newRecipient.address);

    expect(await safeTransfer.payer()).to.equal(newPayer.address);
    expect(await safeTransfer.recipient()).to.equal(newRecipient.address);
    await expect(safeTransfer.connect(newRecipient).withdraw(1)).to.emit(safeTransfer, "TransferWithdrawn");
    expect(await safeTransfer.getCompletedTransfers()).to.deep.equal([1n]);
    expect(await usdc.balanceOf(await safeTransfer.getAddress())).to.equal(0);
    expect(await safeTransfer.totalPendingAmount()).to.equal(0);
    expect(await safeTransfer.getTransferCount()).to.equal(1);
  });

  it("owner can recover USDC sent directly without a transfer record", async function () {
    const { mary, ralph, usdc, safeTransfer } = await deployFixture();
    const directAmount = ethers.parseUnits("25", 6);

    await usdc.connect(ralph).transfer(await safeTransfer.getAddress(), directAmount);

    await expect(safeTransfer.recoverUntrackedUSDC(mary.address, directAmount))
      .to.emit(safeTransfer, "UntrackedUSDCRecovered")
      .withArgs(mary.address, directAmount);

    expect(await usdc.balanceOf(await safeTransfer.getAddress())).to.equal(0);
    expect(await usdc.balanceOf(mary.address)).to.equal(directAmount);
  });

  it("owner cannot recover USDC reserved for pending transfers", async function () {
    const { mary, ralph, amount, usdc, safeTransfer } = await configureAndApprove();
    await safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05");

    await expect(safeTransfer.recoverUntrackedUSDC(mary.address, 1))
      .to.be.revertedWithCustomError(safeTransfer, "AmountExceedsUntrackedBalance");

    expect(await usdc.balanceOf(await safeTransfer.getAddress())).to.equal(amount);
    expect(await safeTransfer.totalPendingAmount()).to.equal(amount);
  });

  it("previous payer cannot deposit after being replaced", async function () {
    const { ralph, newPayer, amount, usdc, safeTransfer } = await configureAndApprove();

    await safeTransfer.setPayer(newPayer.address);
    await usdc.connect(newPayer).approve(await safeTransfer.getAddress(), amount);

    await expect(safeTransfer.connect(ralph).deposit(amount, "Old payer attempt", "OLD-1"))
      .to.be.revertedWithCustomError(safeTransfer, "NotAuthorizedPayer");

    await expect(safeTransfer.connect(newPayer).deposit(amount, "New payer deposit", "NEW-1"))
      .to.emit(safeTransfer, "TransferCreated")
      .withArgs(1, newPayer.address, amount, "New payer deposit", "NEW-1");
  });

  it("previous recipient cannot withdraw after being replaced", async function () {
    const { ralph, rita, newRecipient, amount, safeTransfer } = await configureAndApprove();
    await safeTransfer.connect(ralph).deposit(amount, "Sydney payroll", "PAY-2026-05");

    await safeTransfer.setRecipient(newRecipient.address);

    await expect(safeTransfer.connect(rita).withdraw(1))
      .to.be.revertedWithCustomError(safeTransfer, "NotAuthorizedRecipient");

    await expect(safeTransfer.connect(newRecipient).withdraw(1))
      .to.emit(safeTransfer, "TransferWithdrawn");
  });
});
