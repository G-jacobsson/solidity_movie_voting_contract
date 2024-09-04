// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MovieSurveyCreator
 * @author @G-jacobsson
 * @notice This contract allows users to create movie surveys and vote on them. 
 */
contract MovieSurveyCreator is ReentrancyGuard, Pausable {
    /**************************** ENUMS ****************************/
    enum SurveyStatus { Created, Ongoing, Ended }

    /**************************** STRUCTS ****************************/
    struct Survey {
        address surveyCreator; // Address of survey creator
        SurveyStatus status;
        string genre;
        string[] movies;
        uint256 startTime;
        uint256 duration;
        uint256 totalVotes;
        uint256 winningMovieId;
        uint256 winningMovieVotes;
    }

    /**************************** STATE VARIABLES ****************************/
    address private contractOwner; // Address of the contract owner
    uint256 private surveyId; // ID Counter for surveys
    uint256 public constant MAX_SURVEY_DURATION = 604800; // 1 week in seconds
    mapping(uint256 => Survey) private surveys;
    mapping(uint256 => mapping(address => bool)) private hasVoted;
    mapping(uint256 => mapping(uint256 => uint256)) private votes;
    mapping(address => uint256[]) private userSurveys;

    /**************************** EVENTS ****************************/
    event SurveyCreated(uint256 surveyId, address indexed surveyCreator);
    event SurveyStarted(uint256 surveyId);
    event SurveyEnded(uint256 indexed surveyId, uint256 winningMovieId, uint256 winningMovieVotes);
    event Voted(uint256 surveyId, string movie, address indexed voter);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    /**************************** CUSTOM ERRORS ****************************/
    error Unauthorized();
    error SurveyAlreadyStarted();
    error SurveyNotStarted();
    error SurveyHasEnded();
    error InvalidMovieId();
    error AlreadyVoted();
    error SurveyCreatorCannotVote();
    error SurveyDoesNotExist();

    /**************************** MODIFIERS ****************************/
    modifier onlyContractOwner() {
        if (msg.sender != contractOwner) revert Unauthorized();
        _;
    }

    modifier onlySurveyCreator(uint256 _surveyId) {
        if (msg.sender != surveys[_surveyId].surveyCreator) revert Unauthorized();
        _;
    }

    modifier surveyExists(uint256 _surveyId) {
        if (surveys[_surveyId].surveyCreator == address(0)) revert SurveyDoesNotExist();
        _;
    }

    modifier surveyOngoing(uint256 _surveyId) {
        Survey storage survey = surveys[_surveyId];
        if (survey.status != SurveyStatus.Ongoing) revert SurveyNotStarted();
        if (survey.startTime + survey.duration <= block.timestamp) revert SurveyHasEnded();
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    /**************************** FUNCTIONS ****************************/
    function createSurvey(string calldata _genre, string[] calldata _movies, uint256 _duration) external returns (uint256) {
        require(_movies.length > 0, "At least one movie is required for a survey.");
        require(_duration > 0 && _duration <= MAX_SURVEY_DURATION, "Invalid survey duration.");

        ++surveyId;

        Survey storage newSurvey = surveys[surveyId];

        newSurvey.surveyCreator = msg.sender;
        newSurvey.genre = _genre;
        newSurvey.status = SurveyStatus.Created;
        newSurvey.duration = _duration;
        newSurvey.totalVotes = 0;
        newSurvey.winningMovieId = 0;
        newSurvey.winningMovieVotes = 0;

        for (uint256 i = 0; i < _movies.length; ++i) {
            newSurvey.movies.push(_movies[i]);
        }

        userSurveys[msg.sender].push(surveyId);

        emit SurveyCreated(surveyId, msg.sender);

        return surveyId;
    }

    function startSurvey(uint256 _surveyId) external onlySurveyCreator(_surveyId) whenNotPaused surveyExists(_surveyId) {
        Survey storage survey = surveys[_surveyId];

        if (survey.status != SurveyStatus.Created) revert SurveyAlreadyStarted();
        if(survey.startTime != 0) revert SurveyAlreadyStarted();

        survey.startTime = block.timestamp;
        survey.status = SurveyStatus.Ongoing;

        emit SurveyStarted(_surveyId);
    }

    function endSurvey(uint256 _surveyId) external onlySurveyCreator(_surveyId) surveyExists(_surveyId) {
        Survey storage survey = surveys[_surveyId];
        if (survey.status != SurveyStatus.Ongoing) revert SurveyNotStarted();

        survey.status = SurveyStatus.Ended;

        emit SurveyEnded(_surveyId, survey.winningMovieId, survey.winningMovieVotes);
    }

    function vote(uint256 _surveyId, uint256 _movieId) external nonReentrant whenNotPaused surveyExists(_surveyId) surveyOngoing(_surveyId) {
        Survey storage survey = surveys[_surveyId];

        if (_movieId >= survey.movies.length) revert InvalidMovieId();
        if (hasVoted[_surveyId][msg.sender]) revert AlreadyVoted();
        if (msg.sender == survey.surveyCreator) revert SurveyCreatorCannotVote();

        hasVoted[_surveyId][msg.sender] = true;
        votes[_surveyId][_movieId] += 1;
        survey.totalVotes += 1;

        if (votes[_surveyId][_movieId] > survey.winningMovieVotes) {
            survey.winningMovieId = _movieId;
            survey.winningMovieVotes = votes[_surveyId][_movieId];
        }

        // check that the user is recorded as having voted
        assert(hasVoted[_surveyId][msg.sender]);

        emit Voted(_surveyId, survey.movies[_movieId], msg.sender);
    }

    function getSurvey(uint256 _surveyId) external view surveyExists(_surveyId) returns (address _surveyCreator, string memory _genre, string[] memory _movies, uint256 _startTime, uint256 _duration) {
        Survey storage survey = surveys[_surveyId];

        if (survey.status != SurveyStatus.Ongoing) revert SurveyNotStarted();

        return (survey.surveyCreator, survey.genre, survey.movies, survey.startTime, survey.duration);
    }

    function getCurrentLeadingMovie(uint256 _surveyId) external view surveyExists(_surveyId) surveyOngoing(_surveyId) returns (string memory, uint256) {
        Survey storage survey = surveys[_surveyId];

        return (survey.movies[survey.winningMovieId], survey.winningMovieVotes);
    }

    function pause() external onlyContractOwner {
        _pause();
        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyContractOwner {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    // Fallback functions to revert any payments sent to the contract or any unknown function calls
    receive() external payable {
        revert("This contract does not accept payments");
    }

    fallback() external {
        revert("Invalid function call");
    }
}
