// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} "@openzeppelin/contracts/security/Pausable.sol";

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
    address public contractOwner; // Address of the contract owner
    uint256 public surveyId;
    mapping(uint256 => Survey) public surveys;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(uint256 => uint256)) public votes;
    mapping(address => uint256[]) public users;

    /**************************** EVENTS ****************************/
    event SurveyCreated(uint256 surveyId, address indexed surveyCreator);
    event SurveyStarted(uint256 surveyId);
    event Voted(uint256 surveyId, string movie, address indexed voter);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);

    /**************************** MODIFIERS ****************************/
    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Only the owner can perform this action");
        _;
    }

    modifier onlySurveyCreator(uint256 _surveyId) {
        require(msg.sender == surveys[_surveyId].surveyCreator, "You are not the survey creator and cannot perform this action");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
    }

    /**************************** FUNCTIONS ****************************/
    function createSurvey(string calldata _genre, string[] calldata _movies, uint256 _duration) external returns (uint256) {
        require(_movies.length > 0, "At least one movie is required for a survey.");
        require(_duration > 0, "Duration of survey must be greater than 0");

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

        users[msg.sender].push(surveyId);

        emit SurveyCreated(surveyId, msg.sender);

        return surveyId;
    }

    function startSurvey(uint256 _surveyId) external onlySurveyCreator(_surveyId) whenNotPaused {
        Survey storage survey = surveys[_surveyId];

        require(survey.status == SurveyStatus.Created, "Survey has already started or ended");
        require(survey.startTime == 0, "Survey has already started");

        survey.startTime = block.timestamp;
        survey.status = SurveyStatus.Ongoing;

        emit SurveyStarted(_surveyId);
    }

    function vote(uint256 _surveyId, uint256 _movieId) external nonReentrant whenNotPaused {
        Survey storage survey = surveys[_surveyId];

        require(survey.status == SurveyStatus.Ongoing, "Survey is not ongoing");
        require(survey.startTime + survey.duration > block.timestamp, "Survey has ended");
        require(_movieId < survey.movies.length, "Invalid movie ID");
        require(!hasVoted[_surveyId][msg.sender], "You have already voted in this survey");
        require(msg.sender != survey.surveyCreator, "Survey creator cannot vote");

        hasVoted[_surveyId][msg.sender] = true;

        votes[_surveyId][_movieId] += 1;
        survey.totalVotes += 1;

        if (votes[_surveyId][_movieId] > survey.winningMovieVotes) {
            survey.winningMovieId = _movieId;
            survey.winningMovieVotes = votes[_surveyId][_movieId];
        }

        emit Voted(_surveyId, survey.movies[_movieId], msg.sender);
    }

    function getSurvey(uint256 _surveyId) external view returns (address _surveyCreator, string memory _genre, string[] memory _movies, uint256 _startTime, uint256 _duration) {
        Survey storage survey = surveys[_surveyId];
        require(survey.status == SurveyStatus.Ongoing, "Survey is not ongoing");

        return (survey.surveyCreator, survey.genre, survey.movies, survey.startTime, survey.duration);
    }

    function getCurrentLeadingMovie(uint256 _surveyId) external view returns (string memory, uint256) {
        Survey storage survey = surveys[_surveyId];
        require(survey.status == SurveyStatus.Ongoing, "Survey is not ongoing");

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
}
