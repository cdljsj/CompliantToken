import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("CompliantERC20 contract", function () {
    let demoNFT: Contract;
    let compliantERC20: Contract;
    let tokenIssuer: any;
    let tokenHolder1: any;
    let tokenHolder2: any;

    this.beforeEach(async function() {
        const signers = await ethers.getSigners();
        tokenIssuer = signers[1];
        tokenHolder1 = signers[2];
        tokenHolder2= signers[3];
        const DemoNFT = await ethers.getContractFactory("DemoNFT");
        demoNFT = await DemoNFT.connect(tokenIssuer).deploy();
        console.log("DemoNFT address: ", demoNFT.address);
        await demoNFT.safeMint(tokenIssuer.address);
        await demoNFT.safeMint(tokenIssuer.address);

        const name = "Compliant Token";
        const symbol = "CTT";
        const complianceDocNFT = demoNFT.address;
        // tokenIssuer = namedAccounts["tokenIssuer"];
        console.log("tokenIssuer: ", tokenIssuer.address);
        const CompliantERC20 = await ethers.getContractFactory("CompliantERC20");
        compliantERC20 = await CompliantERC20.deploy(name, symbol, complianceDocNFT, tokenIssuer.address);
        await compliantERC20.connect(tokenIssuer).updateCompliance(1);
        console.log("Current compliance id: ", (await compliantERC20.currentComplianceId()).toString());
    })

    it("Should issue Token properly", async function () {
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder1.address, "1000000000000000000000");
        let balanceOfHolder1 = await compliantERC20.balanceOf(tokenHolder1.address);
        expect(balanceOfHolder1.toString()).equal("1000000000000000000000");
        const complianceIdOfHolder1 = await compliantERC20.tokenHolderCompliance(tokenHolder1.address);
        expect(complianceIdOfHolder1.toString()).equal("1");

        // Issued token could be transfered properly
        await compliantERC20.connect(tokenHolder1).transfer(tokenHolder2.address, "100000000000000000000");
        balanceOfHolder1 = await compliantERC20.balanceOf(tokenHolder1.address);
        expect(balanceOfHolder1.toString()).equal("900000000000000000000");
        let balanceOfHolder2 = await compliantERC20.balanceOf(tokenHolder2.address);
        expect(balanceOfHolder2.toString()).equal("100000000000000000000");
    });

    it("Should accept compliance change properly", async function() {
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder1.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder2.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).updateCompliance(2);
        expect((await compliantERC20.currentComplianceId()).toString()).equal("1")
        expect((await compliantERC20.pendingComplianceId()).toString()).equal("2")
    })

    it("Should not allow transfer before all holders signoff compliance change", async function() {
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder1.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder2.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).updateCompliance(2);
        
        expect(compliantERC20.connect(tokenHolder1).transfer(tokenHolder2.address, "100000000000000000000")).to.be.revertedWith("Transfer not allowed when pending compliance exists");
        await compliantERC20.connect(tokenHolder1).acceptComplianceUpdate();
        expect(compliantERC20.connect(tokenHolder1).transfer(tokenHolder2.address, "100000000000000000000")).to.be.revertedWith("Transfer not allowed when pending compliance exists");
    })

    it("Should allow transfer after all holders accept compliance change", async function() {
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder1.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder2.address, "1000000000000000000000");
        expect((await compliantERC20.tokenHoldersCount()).toString()).to.equal("2");
        await compliantERC20.connect(tokenIssuer).updateCompliance(2);
        
        expect((await compliantERC20.pendingComplianceId()).toString()).to.equal("2");
        await compliantERC20.connect(tokenHolder1).acceptComplianceUpdate();
        expect((await compliantERC20.pendingComplianceSignOffCount()).toString()).to.equal("1");
        await compliantERC20.connect(tokenHolder2).acceptComplianceUpdate();
        await compliantERC20.connect(tokenHolder1).transfer(tokenHolder2.address, "100000000000000000000");
        let balanceOfHolder1 = await compliantERC20.balanceOf(tokenHolder1.address);
        expect(balanceOfHolder1.toString()).equal("900000000000000000000");
    })

    it("Should allow transfer to token issuer if some holder declines the compliance change", async function() {
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder1.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder2.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).updateCompliance(2);
        
        await compliantERC20.connect(tokenHolder1).acceptComplianceUpdate();
        expect((await compliantERC20.pendingComplianceSignOffCount()).toString()).to.equal("1");
        await compliantERC20.connect(tokenHolder2).declineComplianceUpdate();
        expect(compliantERC20.connect(tokenHolder2).transfer(tokenHolder1.address, "100000000000000000000")).to.be.revertedWith("Token holder who declines the change in terms and conditions only can transfer tokens to token issuer");
        expect(compliantERC20.connect(tokenHolder1).transfer(tokenHolder2.address, "100000000000000000000")).to.be.revertedWith("Tokens can only be transfered to token holders accept the latest compliance");
        await compliantERC20.connect(tokenHolder2).transfer(tokenIssuer.address, "100000000000000000000");
        let balanceOfHolder2 = await compliantERC20.balanceOf(tokenHolder2.address);
        expect(balanceOfHolder2.toString()).equal("900000000000000000000");
    })

    it("Should not allow signoff more than once", async function() {
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder1.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).issueTokens(tokenHolder2.address, "1000000000000000000000");
        await compliantERC20.connect(tokenIssuer).updateCompliance(2);
        
        await compliantERC20.connect(tokenHolder1).acceptComplianceUpdate();
        expect(compliantERC20.connect(tokenHolder1).acceptComplianceUpdate()).to.be.revertedWith("Already signed off");
        expect((await compliantERC20.pendingComplianceSignOffCount()).toString()).to.equal("1");
    })

});