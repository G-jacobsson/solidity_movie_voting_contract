// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MovieSurveyCreator
 * @author @G-jacobsson
 * @notice This contract allows users to create movie surveys and vote on them. 
 */
contract MovieSurveyCreator is ReentrancyGuard {
    enum SurveyStatus { Created, Ongoing, Ended }

    struct Survey {
        address surveyCreator; // Address of survey creator
        SurveyStatus status;
        string genre;
        string[] movies;
        mapping(address => bool) hasVoted;
        mapping(uint256 => uint256) votes;
        uint256 startTime;
        uint256 duration;
        uint256 totalVotes;
        uint256 winningMovieId;
        uint256 winningMovieVotes;
    }
    
    address public contractOwner; // Address of the contract owner
    uint256 public surveyId;
    mapping(uint256 => Survey) public surveys;
    mapping(address => uint256[]) public users;

    event SurveyCreated(uint256 surveyId, address surveyCreator);
    event SurveyStarted(uint256 surveyId);
    event Voted(uint256 pollId, string movieId, address voter);

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Only the owner can perform this action");
        _;
    }

    modifier onlySurveyCreator(uint256 _surveyId) {
        require(msg.sender == surveys[_surveyId].surveyCreator, "You are not the survey creator and can not perform this action!");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
        surveyId = 0;
    }

    /**
     * @dev This function allows a user to create a new movie survey. 
     * The function takes in three parameters - genre, array of movies and duration.
     * It checks if there are at least two movies and that the duration is greater than zero.
     * If these conditions are met, it increments the surveyId counter, creates a new Survey struct instance with given inputs and emits a 'SurveyCreated' event.
     * @param _genre The genre of the movie survey.
     * @param _movies An array of strings representing the movies in the survey.
     * @param _duration The duration for which the survey is active, in seconds.
     * @return Returns the ID of the newly created survey.
     */
    function createSurvey(string calldata _genre, string[] calldata _movies, uint256 _duration) external returns (uint256) {
        require(_movies.length > 0, "At least two movies are required for a survey.");
        require(_duration > 0, "Duration of survey must be greater than 0");

        // Add to counter
        ++surveyId;

        // Create a new survey
        Survey storage newSurvey = surveys[surveyId];

        newSurvey.creator = msg.sender;
        newSurvey.genre = _genre;
        newSurvey.status = SurveyStatus.Created;
        newSurvey.totalVotes = 0;
        newSurvey.winningMovieId = 0;

         for (uint256 i = 0; i < _movies.length; ++i) {
            newSurvey.movies.push(_movies[i]);
        }

        // Map the user to the surveyId
        users[msg.sender].push(surveyId);

        // Emit event that survey has been created
        emit SurveyCreated(surveyId, msg.sender);

        return surveyId;
    }

    /**
     * @notice Starts a previously created survey. Only the creator of the survey can perform this action.
     * @param _surveyId The ID of the survey to be started.
     */
    function startSurvey(uint256 _surveyId) external onlySurveyCreator(_surveyId) {
        Survey storage survey = surveys[_surveyId];

        require(surveys[_surveyId].status == SurveyStatus.Created, "Survey has already started or ended");
        require(surveys[_surveyId].startTime == 0, "Survey has already started");

        survey.startTime = block.timestamp;
        survey.status = SurveyStatus.Ongoing;

        emit SurveyStarted(surveyId);
    }

    /**
     * @dev Function to allow users to vote on a survey. 
     *      The function checks if the survey is ongoing and has not ended yet. 
     *      It also ensures that the user has not already voted for the movie they are trying to vote for, 
     *      and updates the count of votes accordingly.
     * @param _surveyId ID of the survey where users will be voting on.
     * @param _movieId ID of the movie that is being voted on.
     */
    function vote(uint256 _surveyId, uint256 _movieId) external nonReentrant {
        Survey storage survey = surveys[_surveyId];

        require(surveys[_surveyId].status == SurveyStatus.Ongoing, "Survey is not ongoing");
        require(surveys[_surveyId].startTime + surveys[_surveyId].duration > block.timestamp, "Survey has ended");
        require(_movieId < survey.movies.length, "Invalid movie ID");
        require(!survey.hasVoted[msg.sender], "You have already voted in this survey");
        require(msg.sender != survey.surveyCreator, "Survey creator cannot vote");

        survey.hasVoted[msg.sender] = true;


        survey.votes[_movieId] += 1;
        survey.totalVotes += 1;

        // Update the winning movie
        if (survey.votes[_movieId] > survey.winningMovieVotes) {
            survey.winningMovieId = _movieId;
            survey.winningMovieVotes = survey.votes[_movieId];
        }

        emit Voted(_surveyId, survey.movies[_movieId], msg.sender);

    }

    /**
     * @notice Gets details about a specific survey, including its creator and duration. Only ongoing surveys can be fetched.
     * @param _surveyId The ID of the survey to fetch details for.
     * @return Returns the address of the survey's creator, the genre of movies, an array of movie titles, 
     * the timestamp when the survey started, and its duration in seconds.
     */
    function getSurvey(uint256 _surveyId) external view returns (address _creator, string memory _genre, string[] memory _movies, uint256 _startTime, uint256 _duration) {
        require(surveys[_surveyId].status == SurveyStatus.Ongoing);

        Survey storage survey = surveys[_surveyId];

        return (survey.surveyCreator, survey.genre, survey.movies, survey.startTime, survey.duration);
    }

    /**
     * @dev Returns information about the leading movie in a specific survey. 
     * The function only returns data if the survey is ongoing.
     * @param _surveyId Id of the survey to get info from.
     */
    function getCurrentLeadingMovie(uint256 _surveyId) external view returns (string memory, uint256) {
        require(surveys[_surveyId].status == SurveyStatus.Ongoing, "Survey is not ongoing");

        Survey storage survey = surveys[_surveyId];

        return (survey.movies[survey.winningMovieId], survey.winningMovieVotes);
    }

}