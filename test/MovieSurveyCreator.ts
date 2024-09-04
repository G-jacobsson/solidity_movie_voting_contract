import { expect } from 'chai';
import hre from 'hardhat';

describe('MovieSurveyCreator', function () {
  async function deployMovieSurveyCreatorFixture() {
    const [contractOwner, surveyCreator, voter] = await hre.ethers.getSigners();

    const MovieSurveyCreator = await hre.ethers.getContractFactory(
      'MovieSurveyCreator'
    );

    const movieSurveyCreator = await MovieSurveyCreator.deploy();

    return { movieSurveyCreator, contractOwner, surveyCreator, voter };
  }

  describe('Deployment', function () {
    it('should deploy MovieSurveyCreator and set deployer as contractOwner', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();

      const ownerFromContract = await (
        movieSurveyCreator as any
      ).contractOwner();
      expect(ownerFromContract).to.equal(contractOwner.address);
    });
  });
});
