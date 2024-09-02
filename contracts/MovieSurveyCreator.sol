// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract MovieSurveyCreator {
    enum SurveyStatus { Created, Ongoing, Ended }

    struct Survey {
        address creator; // Address of survey creator
        string genre;
        string[] movies;
        mapping(string => uint256) votes;
        SurveyStatus status;
        uint256 startTime;
        uint256 duration;
        uint256 totalVotes;
        uint256 winningMovieId;
    }
    
    address public owner; // Address of the contract owner
    uint256 public surveyId;
    mapping(uint256 => Survey) surveys;
    mapping(address => uint256[]) users;

    event SurveyCreated(uint256 surveyId, address creator);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
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



}