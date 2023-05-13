// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

/// @title A SavingLife decentralized Charity campaign
/// @author Oluwatunmise
contract SavingLife {
    /// @notice totalCampaign that holds the total of Charity Campaign number of campaign created
    uint256 public totalCampaign;

    /// @notice Campaign struct to hold all the neccessary information needed for each campaign
    struct Campaign {
        uint id;
        address payable creator;
        uint created_at;
        string title;
        string description;
        string image;
        uint amount;
        uint contributors;
        uint raised;
        bool ended;
    }

    /// @notice campaigns array that will holds all the charity campaigns created
    Campaign[] internal campaigns;

    /// @notice isValidId is a modifier that checks is an id is valid or not
    /// @dev It checks if the id passed as an argument is less than the totalCampaign value
    /// @param _id the id to be checked
    modifier isValidId(uint256 _id) {
        require(_id < totalCampaign, "Invalid ID");
        _;
    }

    /// @param _title the title of the charity campaign
    /// @param _description the description of what the charity campaign is about
    /// @param _image the image that describes the charity campaign
    /// @param _amount the amount to needed by the campaign
    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _image,
        uint _amount
    ) public {
        require(bytes(_title).length > 0, "Title is required");
        require(bytes(_description).length > 0, "Description is required");
        require(bytes(_image).length > 0, "Image is required");
        require(_amount > 0, "Amount needed must be greater than 0 ");
        Campaign memory newCampaign = Campaign(
            totalCampaign,
            payable(msg.sender),
            block.timestamp,
            _title,
            _description,
            _image,
            _amount,
            0,
            0,
            false
        );
        campaigns.push(newCampaign);
        totalCampaign++;
    }

    /// @notice getCampaign gets the data of a particular campaign stored in the campaign array
    /// @dev It uses the campaign id passed as an argument to get a particular campaign from the campaign array
    /// @param _id the id of a campaign
    /// @return Campaign with all the data stored in it
    function getCampaign(
        uint _id
    ) public view isValidId(_id) returns (Campaign memory) {
        return campaigns[_id];
    }

    /// @notice doante allows any user to donate to a particular campaign
    /// @dev It uses the campaign's id passed as an argument to get a particular campaign from the campaign array and the funds donated are added to that campaign
    /// @param _id the id of a campaign
    function donate(uint _id) public payable isValidId(_id) {
        require(msg.value > 0, "Amount must be greater than 0!");
        require(campaigns[_id].ended == false, "Campaign has ended");
        require(
            msg.sender != campaigns[_id].creator,
            "You cannot donate to your own campaign"
        );
        require(
        msg.value <= (campaigns[_id].amount - campaigns[_id].raised),
        "Donation amount exceeds required amount"
    );
        campaigns[_id].contributors++;
        campaigns[_id].raised += msg.value;
    }

    /// @notice withdraw allows only the owner of a campaign to withdraw all the funds donated to that campaign
    /// @dev It uses the campaign id passed as an argument to get a particular campaign from the campaign array and sends the funds donated to the campaign to the owner of the campaign
    /// @param _id the id of a campaign
    function withdraw(uint _id) public isValidId(_id) {
        require(
            campaigns[_id].creator == msg.sender,
            "Only creator can withdraw"
        );
        require(campaigns[_id].ended == false, "Funds has been withdrawn!");
        require(campaigns[_id].raised > 0, "No funds to withdraw");
        uint256 amount = campaigns[_id].raised;
        campaigns[_id].ended = true;

        campaigns[_id].creator.transfer(amount);
    }
}
