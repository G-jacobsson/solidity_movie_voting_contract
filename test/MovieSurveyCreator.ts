import { expect } from 'chai';
import hre, { ethers } from 'hardhat';

describe('MovieSurveyCreator', function () {
  const genre = 'Action';
  const movies = ['Movie1', 'Movie2'];
  const duration = 3600;

  async function deployMovieSurveyCreatorFixture() {
    const [contractOwner, surveyCreator, voter1, voter2] =
      await ethers.getSigners();

    const MovieSurveyCreator = await ethers.getContractFactory(
      'MovieSurveyCreator'
    );
    const movieSurveyCreator = await MovieSurveyCreator.deploy();

    return { movieSurveyCreator, contractOwner, surveyCreator, voter1, voter2 };
  }

  describe('Constructor', function () {
    it('Should set the contract owner to the deployer', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();
      expect(await movieSurveyCreator.contractOwner()).to.equal(
        contractOwner.address
      );
    });
  });

  describe('Deployment', function () {
    it('Should deploy MovieSurveyCreator and set deployer as contractOwner', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();

      const ownerFromContract = await movieSurveyCreator.contractOwner();
      expect(ownerFromContract).to.equal(contractOwner.address);
    });
  });

  describe('Survey Management', function () {
    it('Should create a surveyId with valid parameters and emit SurveyCreated event', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const startTime = 0;

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      )
        .to.emit(movieSurveyCreator, 'SurveyCreated')
        .withArgs(1, surveyCreator.address);

      const survey = await movieSurveyCreator.getSurvey(1);
      expect(survey[0]).to.equal(surveyCreator.address);
      expect(survey[1]).to.equal(genre);
      expect(survey[2]).to.deep.equal(movies);
      expect(survey[3]).to.equal(startTime);
      expect(survey[4]).to.equal(duration);
    });

    it('Should not allow survey creation with duration exceeding the maximum limit', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const duration = 2 * 604800;

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      ).to.be.revertedWith('Invalid survey duration.');
    });

    it('Should not allow survey creation with empty movie array', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const movies: string[] = [];

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      ).to.be.revertedWith('At least one movie is required for a survey.');
    });

    it('Should not allow survey creation with duration of 0', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const duration = 0;

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      ).to.be.revertedWith('Invalid survey duration.');
    });

    it('Should revert if creating a survey with extremely large duration', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const duration = 100 * 604800;

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      ).to.be.revertedWith('Invalid survey duration.');
    });

    it('Should handle large number of movies correctly', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const movies = Array(100).fill('Movie');

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      )
        .to.emit(movieSurveyCreator, 'SurveyCreated')
        .withArgs(1, surveyCreator.address);
    });

    it('Should allow the survey creator to start a survey and emit SurveyStarted event', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await expect(movieSurveyCreator.connect(surveyCreator).startSurvey(1))
        .to.emit(movieSurveyCreator, 'SurveyStarted')
        .withArgs(1);

      const survey = await movieSurveyCreator.getSurvey(1);
      expect(survey[3]).to.be.greaterThan(0);
    });

    it('Should not allow non-creators to start the survey', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await expect(
        movieSurveyCreator.connect(voter1).startSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');
    });

    it('Should not allow starting a survey that has already started', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(surveyCreator).startSurvey(1)
      ).to.be.revertedWithCustomError(
        movieSurveyCreator,
        'SurveyAlreadyStarted'
      );
    });

    it('Should revert starting a survey that has already started (status not Created)', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(surveyCreator).startSurvey(1)
      ).to.be.revertedWithCustomError(
        movieSurveyCreator,
        'SurveyAlreadyStarted'
      );
    });

    it('Should not allow starting a survey that does not exist', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.connect(surveyCreator).startSurvey(999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyDoesNotExist');
    });

    it('Should allow the survey creator to end the survey and emit SurveyEnded event', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await hre.network.provider.send('evm_increaseTime', [3600]);
      await hre.network.provider.send('evm_mine');

      await expect(movieSurveyCreator.connect(surveyCreator).endSurvey(1))
        .to.emit(movieSurveyCreator, 'SurveyEnded')
        .withArgs(1, 0, 0);

      const survey = await movieSurveyCreator.getSurvey(1);
      expect(survey[5]).to.equal(2);
    });

    it('Should not allow non-creators to end the survey', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await hre.network.provider.send('evm_increaseTime', [3600]);
      await hre.network.provider.send('evm_mine');

      await expect(
        movieSurveyCreator.connect(voter1).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');
    });

    it('Should not allow ending a survey that has not started', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyNotStarted');
    });

    it('Should not allow ending a survey that does not exist', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyDoesNotExist');
    });
  });

  describe('Voting', function () {
    it('Should allow users to vote in an ongoing survey and emit Voted event', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(movieSurveyCreator.connect(voter1).vote(1, 0))
        .to.emit(movieSurveyCreator, 'Voted')
        .withArgs(1, 'Movie1', voter1.address);

      const leadingMovie = await movieSurveyCreator.getCurrentLeadingMovie(1);
      expect(leadingMovie[1]).to.equal(1);
    });

    it('Should not allow a user to vote more than once', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);
      await movieSurveyCreator.connect(voter1).vote(1, 0);

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'AlreadyVoted');
    });

    it('Should revert if a user tries to vote for a movie ID that is out of bounds', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'InvalidMovieId');
    });

    it('Should handle vote count correctly with multiple users', async function () {
      const { movieSurveyCreator, surveyCreator, voter1, voter2 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await movieSurveyCreator.connect(voter1).vote(1, 0);
      await movieSurveyCreator.connect(voter2).vote(1, 0);

      const leadingMovie = await movieSurveyCreator.getCurrentLeadingMovie(1);
      expect(leadingMovie[1]).to.equal(2);
    });

    it('Should not allow the survey creator to vote', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(surveyCreator).vote(1, 0)
      ).to.be.revertedWithCustomError(
        movieSurveyCreator,
        'SurveyCreatorCannotVote'
      );
    });

    it('Should handle invalid movie ID during voting', async function () {
      const { movieSurveyCreator, surveyCreator, voter1 } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);
      await movieSurveyCreator.connect(surveyCreator).startSurvey(1);

      await expect(
        movieSurveyCreator.connect(voter1).vote(1, 999)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'InvalidMovieId');
    });
  });

  describe('Contract State', function () {
    it('Should pause and unpause the contract and affect function calls', async function () {
      const { movieSurveyCreator, contractOwner, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator.connect(contractOwner).pause();
      console.log(contractOwner.address);

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

    it('Should revert if non-owner tries to pause the contract', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        movieSurveyCreator.connect(surveyCreator).pause()
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');
    });

    it('Should revert if non-owner tries to unpause the contract', async function () {
      const { movieSurveyCreator, contractOwner, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator.connect(contractOwner).pause();

      await expect(
        movieSurveyCreator.connect(surveyCreator).unpause()
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'Unauthorized');
    });

    it('Should reject payments and handle fallback', async function () {
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
    it('Should revert if attempting to call a non-existent function', async function () {
      const { movieSurveyCreator, contractOwner } =
        await deployMovieSurveyCreatorFixture();

      await expect(
        contractOwner.sendTransaction({
          to: movieSurveyCreator.getAddress(),
          data: '0x12345678',
        })
      ).to.be.revertedWith('Invalid function call');
    });

    it('Should handle maximum duration boundary value', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      const duration = 604800;

      await expect(
        movieSurveyCreator
          .connect(surveyCreator)
          .createSurvey(genre, movies, duration)
      )
        .to.emit(movieSurveyCreator, 'SurveyCreated')
        .withArgs(1, surveyCreator.address);
    });

    it('Should handle edge case where survey is ended before starting', async function () {
      const { movieSurveyCreator, surveyCreator } =
        await deployMovieSurveyCreatorFixture();

      await movieSurveyCreator
        .connect(surveyCreator)
        .createSurvey(genre, movies, duration);

      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'SurveyNotStarted');
    });

    it('Should handle multiple pause/unpause operations', async function () {
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

      await movieSurveyCreator.connect(contractOwner).pause();
      await expect(
        movieSurveyCreator.connect(surveyCreator).endSurvey(1)
      ).to.be.revertedWithCustomError(movieSurveyCreator, 'EnforcedPause');
    });
  });
});
