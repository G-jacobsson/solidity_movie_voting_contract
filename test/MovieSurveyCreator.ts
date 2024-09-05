import { expect } from 'chai';
import hre, { ethers } from 'hardhat';

describe('MovieSurveyCreator', function () {
  const genre = 'Action';
  const movies = ['Movie1', 'Movie2'];
  const duration = 3600;

  async function deployMovieSurveyCreatorFixture() {
    const [contractOwner, surveyCreator, voter1, voter2, voter3] =
      await ethers.getSigners();

    const MovieSurveyCreator = await ethers.getContractFactory(
      'MovieSurveyCreator'
    );
    const movieSurveyCreator = await MovieSurveyCreator.deploy();

    return {
      movieSurveyCreator,
      contractOwner,
      surveyCreator,
      voter1,
      voter2,
      voter3,
    };
  }

  describe('Deployment', function () {
    it('Should deploy MovieSurveyCreator and set deployer as contractOwner', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();

      const ownerFromContract = await movieSurveyCreator.contractOwner();
      expect(ownerFromContract).to.equal(contractOwner.address);
    });
  });

  describe('Survey Management', function () {
    it('Should create a survey with valid parameters and handle invalid cases', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      )
        .to.emit(movieSurveyCreator, 'SurveyCreated')
        .withArgs(1, surveyCreator.address);

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, [], duration)
      ).to.be.revertedWith('At least two movies are required for a survey.');

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, 2 * 604800)
      ).to.be.revertedWith('Invalid survey duration.');
    });

    it('Should revert if a non-creator tries to start or end the survey', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await expect(
        movieSurveyCreator.connect(voter1).startSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');

      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(voter1).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');
    });

    it('Should start and end a survey properly and handle invalid cases', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      const unauthorizedUser = await ethers.provider.getSigner(2);
      await expect(
        movieSurveyCreator.connect(unauthorizedUser).startSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');

      await expect(movieSurveyCreator.connect(surveyCreator).startSurvey(1))
        .to.emit(movieSurveyCreator, 'SurveyStarted')
        .withArgs(1);

      await expect(
        movieSurveyCreator.connect(surveyCreator).startSurvey(1)
      ).to.be.revertedWithCustomError(
        movieSurveyCreator,
        'SurveyAlreadyStarted'
      );

      await hre.network.provider.send('evm_increaseTime', [duration]);
      await hre.network.provider.send('evm_mine');

      await expect(movieSurveyCreator.connect(surveyCreator).endSurvey(1))
        .to.emit(movieSurveyCreator, 'SurveyEnded')
        .withArgs(1, 0, 0);

      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyNotStarted');
    });

    it('Should revert when trying to create a survey with zero duration', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.connect(surveyCreator).createSurvey(genre, movies, 0)
      ).to.be.revertedWith('Invalid survey duration.');
    });

    it('Should return correct survey details', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      const survey = await movieSurveyCreator.getSurvey(1);

      expect(survey[0]).to.equal(surveyCreator.address);
      expect(survey[1]).to.equal(genre);
      expect(survey[2]).to.deep.equal(movies);
      expect(survey[3]).to.equal(0);
      expect(survey[4]).to.equal(duration);
      expect(survey[5]).to.equal(0);
    });

    it('Should revert if getting details of a non-existent survey', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.getSurvey(999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyDoesNotExist');
    });
  });

  describe('Voting', function () {
    it('Should allow voting and handle invalid cases', async function () {
      const { movieSurveyCreator, surveyCreator, voter1, voter2 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(movieSurveyCreator.connect(voter1).vote(1, 0))
        .to.emit(movieSurveyCreator, 'Voted')
        .withArgs(1, 'Movie1', voter1.address);

      const leadingMovie = await movieSurveyCreator.getCurrentLeadingMovie(1);
      expect(leadingMovie[0]).to.equal('Movie1');
      expect(leadingMovie[1]).to.equal(1);

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'AlreadyVoted');

      await expect(
        movieSurveyCreator.connect(voter2).vote(1, 999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'InvalidMovieId');

      await expect(
        movieSurveyCreator.connect(surveyCreator).vote(1, 0)
      ).to.be.revertedWithCustomError(
        movieSurveyCreator,
        'SurveyCreatorCannotVote'
      );

      await movieSurveyCreator.connect(voter2).vote(1, 0);
      const updatedLeadingMovie =
        await movieSurveyCreator.getCurrentLeadingMovie(1);
      expect(updatedLeadingMovie[1]).to.equal(2);
    });

    it('Should handle voting for different movies in a survey', async function () {
      const { movieSurveyCreator, surveyCreator, voter1, voter2, voter3 } =
        await deployMovieSurveyCreatorFixture();

      const multipleMovies = ['Movie1', 'Movie2', 'Movie3'];
      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, multipleMovies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await movieSurveyCreator.connect(voter1).vote(1, 0);

      await movieSurveyCreator.connect(voter2).vote(1, 1);

      await movieSurveyCreator.connect(voter3).vote(1, 2);

      const leadingMovie = await movieSurveyCreator.getCurrentLeadingMovie(1);
      expect(leadingMovie[0]).to.equal('Movie1');
    });

    it('Should handle voting edge cases and ensure correctness of the voting process', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'InvalidMovieId');

      const leadingMovie = await movieSurveyCreator.getCurrentLeadingMovie(1);
      expect(leadingMovie[1]).to.equal(0);
    });

    it('Should revert if trying to vote before the survey starts', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 0)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyNotStarted');
    });
  });

  describe('Contract State', function () {
    it('Should allow pausing and unpausing the contract by the contract owner', async function () {
      const { movieSurveyCreator, contractOwner, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator.connect(contractOwner).pause();

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'EnforcedPause');

      await movieSurveyCreator.connect(contractOwner).unpause();

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      )
        .to.emit(movieSurveyCreator, 'SurveyCreated')
        .withArgs(1, surveyCreator.address);
    });

    it('Should revert when trying to vote while the contract is paused', async function () {
      const { movieSurveyCreator, contractOwner, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await movieSurveyCreator.connect(contractOwner).pause();

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 0)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'EnforcedPause');

      await movieSurveyCreator.connect(contractOwner).unpause();
      await movieSurveyCreator.connect(voter1).vote(1, 0);
    });

    it('Should revert if trying to start a survey while the contract is paused', async function () {
      const { movieSurveyCreator, contractOwner, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await movieSurveyCreator.connect(contractOwner).pause();

      await expect(
        movieSurveyCreator.connect(surveyCreator).startSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'EnforcedPause');

      await movieSurveyCreator.connect(contractOwner).unpause();
      await expect(movieSurveyCreator.connect(surveyCreator).startSurvey(1))
        .to.emit(movieSurveyCreator, 'SurveyStarted')
        .withArgs(1);
    });

    it('Should revert if trying to end a survey while the contract is paused', async function () {
      const { movieSurveyCreator, contractOwner, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await hre.network.provider.send('evm_increaseTime', [duration]);
      await hre.network.provider.send('evm_mine');

      await movieSurveyCreator.connect(contractOwner).pause();

      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'EnforcedPause');

      await movieSurveyCreator.connect(contractOwner).unpause();
      await expect(movieSurveyCreator.connect(surveyCreator).endSurvey(1))
        .to.emit(movieSurveyCreator, 'SurveyEnded')
        .withArgs(1, 0, 0);
    });

    it('Should not allow non-owner to pause/unpause the contract', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.connect(surveyCreator).pause()
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');

      await expect(
        movieSurveyCreator.connect(surveyCreator).unpause()
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');
    });

    it('Should reject payments and handle fallback functions correctly', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        contractOwner.sendTransaction({
          to: movieSurveyCreator.getAddress(),
          value: ethers.parseEther('1'),
        })
      ).to.be.revertedWith('This contract does not accept payments');
    });
  });

  describe('Edge Cases', function () {
    it('Should handle non-existent function calls correctly', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        contractOwner.sendTransaction({
          to: movieSurveyCreator.getAddress(),
          data: '0x12345678',
        })
      ).to.be.revertedWith('Invalid function call');
    });

    it('Should handle surveys with maximum duration correctly', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const maxDuration = 604800;
      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, maxDuration)
      )
        .to.emit(movieSurveyCreator, 'SurveyCreated')
        .withArgs(1, surveyCreator.address);
    });

    it('Should revert if trying to interact with a non-existent survey', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.connect(surveyCreator).startSurvey(999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyDoesNotExist');

      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyDoesNotExist');
    });
  });
});
