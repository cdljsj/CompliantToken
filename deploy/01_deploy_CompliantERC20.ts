import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const {deployments, getNamedAccounts} = hre;
	const {deploy} = deployments;
	
	const {deployer} = await getNamedAccounts();

	const name = "Compliant Token";
	const symbol = "CTT";
	const complianceDocNFT = "0x2f156a641fb4cdbdc30232e6af96658301dbd203";
	const tokenIssuer = "0x2280C50eF73550b7Ac71AaCd1d6485B3120c2c46";

	const DemoNFT = await deploy('DemoNFT', {
		from: deployer,
		gasLimit: 5000000,
		args: [],
		log: true,
		autoMine: true // speed up deployment on local network (ganache, hardhat), no effect on live networks
	});
	const DemoNFTContract = await deployments.get('DemoNFT');
	console.log("DemoNFTContract address: ", DemoNFTContract.address);

	await deploy('CompliantERC20', {
		from: deployer,
		gasLimit: 5000000,
		args: [name, symbol, complianceDocNFT, tokenIssuer],
		log: true,
		autoMine: true // speed up deployment on local network (ganache, hardhat), no effect on live networks
	});
	const CompliantERC20 = await deployments.get('CompliantERC20');
	console.log("CompliantERC20 address: ", CompliantERC20.address);
};
export default func;
func.tags = ['CompliantERC20'];

