import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const MovieSurveyCreatorModule = buildModule(
  'MovieSurveyCreatorModule',
  (m) => {
    const movieSurveyCreator = m.contract('MovieSurveyCreator', []);

    return { movieSurveyCreator };
  }
);

export default MovieSurveyCreatorModule;
