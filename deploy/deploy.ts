import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createFheInstance } from "../utils/instance";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const { instance } = await createFheInstance(hre, "0x0000000000000000000000000000000000000000");
  const minMemberTokenBalance = instance.encrypt32(Number(100));

  const privateDAO = await deploy("PrivateDAO", {
    from: deployer,
    args: [minMemberTokenBalance],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`Private DAO contract: `, privateDAO.address);
};

export default func;
func.id = "deploy_privatedao";
func.tags = ["PrivateDAO"];
