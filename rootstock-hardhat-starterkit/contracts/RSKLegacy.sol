// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

/**
 * @title  RSKLegacy — Decentralized Inheritance Vault (Frontend-Friendly Edition)
 * @notice Dead-man's switch vault for rBTC on the Rootstock network.
 *
 * @dev    ARCHITECTURE CHANGE from v1:
 *         The constructor NO LONGER takes _beneficiary or _lockDuration.
 *         Instead, the user deploys the contract (or a factory deploys it),
 *         then calls `initialize(beneficiary, lockDuration)` from their
 *         connected wallet on the frontend — along with the initial deposit.
 *
 *         This means:
 *         - msg.sender at initialize() time becomes the owner
 *         - The beneficiary address is entered by the user in the UI
 *         - The lock duration is chosen by the user in the UI
 *         - The initial rBTC deposit is sent at initialize() time
 *
 *         Security design decisions (unchanged from v1):
 *         - ReentrancyGuard pattern (manual, no external dependency)
 *         - Checks-Effects-Interactions (CEI) on every state-changing function
 *         - No unchecked arithmetic (Solidity 0.8+ reverts on overflow/underflow)
 *         - Pull-payment pattern: funds sent to caller, not pushed to stored addresses
 *         - Role separation: owner vs beneficiary
 *         - Two-step ownership transfer
 *         - Beneficiary change has a time-lock AND a deadline guard
 *         - Contract can be paused by owner (pings still work when paused)
 *         - All critical actions emit events for off-chain auditability
 *
 *         DESIGN NOTE — Unlimited Ping / Dead-Man's Switch:
 *         ping() has no frequency restriction and no deadline check. This is
 *         intentional: as long as the owner is alive and able to call ping(),
 *         the switch must not trigger. An owner cannot be forced off-chain.
 *         The trade-off is that a coerced owner could theoretically ping
 *         indefinitely; however this is a property of all dead-man's switch
 *         designs and is considered a feature (owner is alive) not a bug.
 *         A future upgrade could add an optional MAX_VAULT_LIFETIME constant
 *         for users who want an absolute expiry regardless of pings.
 *
 *         DESIGN NOTE — block.timestamp:
 *         Miners can manipulate block.timestamp by a few seconds (~15 s on RSK).
 *         Given the contract's minimum 1-day lock duration and 2-day beneficiary
 *         change delay, a few seconds of drift is not exploitable in practice.
 *         No mitigation is required.
 */
contract RSKLegacy {

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotBeneficiary();
    error ZeroAddress();
    error SameAddress();
    error AlreadyInitialized();
    error NotInitialized();
    error ContractNotActive();
    error ContractAlreadyPaused();
    error ContractNotPaused();
    error DeadlineNotReached();
    error DeadlineAlreadyPassed();
    error InsufficientDeposit();
    error NothingToWithdraw();
    error TransferFailed();
    error Reentrancy();
    error BeneficiaryChangeLocked();
    error LockDurationTooShort();
    error LockDurationTooLong();
    error NoPendingOwner();
    error NotPendingOwner();

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Minimum allowed lock duration: 1 day
    uint256 public constant MIN_LOCK_DURATION = 1 days;

    /// @notice Maximum allowed lock duration: 10 years
    uint256 public constant MAX_LOCK_DURATION = 3650 days;

    /// @notice Delay before a beneficiary change takes effect
    uint256 public constant BENEFICIARY_CHANGE_DELAY = 2 days;

    /// @notice Minimum deposit to prevent dust attacks
    uint256 public constant MIN_DEPOSIT = 1000 wei;

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice True once initialize() has been successfully called
    bool public initialized;

    /// @notice Current vault owner
    address public owner;

    /// @notice Pending owner during two-step transfer
    address public pendingOwner;

    /// @notice Designated heir
    address public beneficiary;

    /// @notice Pending beneficiary (time-locked)
    address public pendingBeneficiary;

    /// @notice Timestamp when the pending beneficiary change was proposed
    uint256 public beneficiaryChangeRequestedAt;

    /// @notice Seconds of inactivity before beneficiary can claim
    uint256 public lockDuration;

    /// @notice Timestamp of the last owner ping (or initialization)
    uint256 public lastSeen;

    /// @notice True while vault is operational
    bool public active;

    /// @notice True if owner has paused new deposits
    bool public paused;

    /// @notice Reentrancy lock
    bool private _locked;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Initialized(address indexed owner, address indexed beneficiary, uint256 lockDuration, uint256 initialDeposit);
    event Deposited(address indexed from, uint256 amount, uint256 newBalance);
    event Pinged(address indexed owner, uint256 newDeadline);
    event Claimed(address indexed beneficiary, uint256 amount);
    event EmergencyCancelled(address indexed owner, uint256 amount);
    event BeneficiaryChangeRequested(address indexed currentBeneficiary, address indexed proposed, uint256 effectiveAt);
    event BeneficiaryChanged(address indexed oldBeneficiary, address indexed newBeneficiary);
    event BeneficiaryChangeCancelled(address indexed cancelledProposal);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event LockDurationChanged(uint256 oldDuration, uint256 newDuration);
    event Paused(address indexed owner);
    event Unpaused(address indexed owner);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier nonReentrant() {
        if (_locked) revert Reentrancy();
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert NotBeneficiary();
        _;
    }

    modifier whenActive() {
        if (!active) revert ContractNotActive();
        _;
    }

    modifier whenInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor — intentionally empty
    // -------------------------------------------------------------------------

    /**
     * @dev The constructor is intentionally parameter-free.
     *      All setup happens in initialize(), which is called by the user
     *      from the frontend after connecting their wallet.
     *      This makes the contract compatible with factory/clone patterns.
     */
    constructor() {}

    // -------------------------------------------------------------------------
    // Initialize  ← THE KEY CHANGE: replaces constructor parameters
    // -------------------------------------------------------------------------

    /**
     * @notice Set up the vault. Called once by the user from the frontend.
     * @dev    msg.sender becomes the owner. Accepts an optional initial deposit.
     *         The frontend should call this with:
     *           - _beneficiary: address entered in the "Beneficiary" input field
     *           - _lockDuration: seconds derived from the user's chosen time period
     *           - msg.value: the rBTC amount the user wants to deposit
     *
     * @param  _beneficiary  Address of the intended heir (entered in the UI)
     * @param  _lockDuration Inactivity window in seconds (e.g. 365 days = 31536000)
     */
    function initialize(address _beneficiary, uint256 _lockDuration) external payable {
        // CHECKS
        if (initialized)                       revert AlreadyInitialized();
        if (_beneficiary == address(0))        revert ZeroAddress();
        if (_beneficiary == msg.sender)        revert SameAddress();
        if (_lockDuration < MIN_LOCK_DURATION) revert LockDurationTooShort();
        if (_lockDuration > MAX_LOCK_DURATION) revert LockDurationTooLong();
        if (msg.value > 0 && msg.value < MIN_DEPOSIT) revert InsufficientDeposit();

        // EFFECTS
        initialized  = true;
        owner        = msg.sender;
        beneficiary  = _beneficiary;
        lockDuration = _lockDuration;
        lastSeen     = block.timestamp;
        active       = true;

        // INTERACTIONS (emit only — no external calls)
        emit Initialized(msg.sender, _beneficiary, _lockDuration, msg.value);
        if (msg.value > 0) {
            emit Deposited(msg.sender, msg.value, address(this).balance);
        }
    }

    // -------------------------------------------------------------------------
    // Deposit
    // -------------------------------------------------------------------------

    /**
     * @notice Deposit rBTC into the vault.
     * @dev    Anyone can top-up the vault. Paused vaults reject new deposits.
     *         Must be called after initialize().
     */
    function deposit() external payable whenInitialized whenActive {
        if (paused)                  revert ContractAlreadyPaused();
        if (msg.value < MIN_DEPOSIT) revert InsufficientDeposit();

        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    /// @notice Plain rBTC transfers route here
    receive() external payable {
        if (!initialized || !active || paused) revert ContractNotActive();
        if (msg.value < MIN_DEPOSIT)           revert InsufficientDeposit();

        emit Deposited(msg.sender, msg.value, address(this).balance);
    }

    /// @dev Reject unknown selectors
    fallback() external payable {
        revert("RSKLegacy: unknown function");
    }

    // -------------------------------------------------------------------------
    // Owner actions
    // -------------------------------------------------------------------------

    /**
     * @notice Prove liveness — resets the inactivity deadline.
     *         The frontend "Ping" button calls this.
     *
     * @dev    DESIGN NOTE: ping() intentionally has no frequency restriction
     *         and no deadline check. If the owner is alive and able to call
     *         ping(), the dead-man's switch must not trigger. This is the
     *         core invariant of the design. See contract-level NatSpec for
     *         full rationale.
     */
    function ping() external onlyOwner whenInitialized whenActive {
        lastSeen = block.timestamp;
        emit Pinged(msg.sender, block.timestamp + lockDuration);
    }

    /**
     * @notice Emergency withdrawal — owner reclaims all funds instantly.
     *         Deactivates the vault permanently.
     */
    function emergencyCancel() external onlyOwner whenInitialized whenActive nonReentrant {
        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        // EFFECTS before INTERACTIONS (CEI)
        active = false;

        (bool success, ) = owner.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EmergencyCancelled(msg.sender, amount);
    }

    /**
     * @notice Change the inactivity window.
     * @param  _newDuration New lock duration in seconds
     */
    function setLockDuration(uint256 _newDuration) external onlyOwner whenInitialized whenActive {
        if (_newDuration < MIN_LOCK_DURATION) revert LockDurationTooShort();
        if (_newDuration > MAX_LOCK_DURATION) revert LockDurationTooLong();
        if (isDeadlinePassed())               revert DeadlineAlreadyPassed();

        emit LockDurationChanged(lockDuration, _newDuration);
        lockDuration = _newDuration;
    }

    /**
     * @notice Pause the vault (blocks new deposits; pings still work).
     */
    function pause() external onlyOwner whenInitialized whenActive {
        if (paused) revert ContractAlreadyPaused();
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause the vault.
     */
    function unpause() external onlyOwner whenInitialized whenActive {
        if (!paused) revert ContractNotPaused();
        paused = false;
        emit Unpaused(msg.sender);
    }

    // -------------------------------------------------------------------------
    // Beneficiary change (time-locked, two-step)
    // -------------------------------------------------------------------------

    /**
     * @notice Propose a new beneficiary. Takes effect after BENEFICIARY_CHANGE_DELAY.
     * @param  _proposed Address of the proposed new beneficiary
     */
    function requestBeneficiaryChange(address _proposed) external onlyOwner whenInitialized whenActive {
        if (_proposed == address(0))  revert ZeroAddress();
        if (_proposed == owner)       revert SameAddress();
        if (_proposed == beneficiary) revert SameAddress();
        if (isDeadlinePassed())       revert DeadlineAlreadyPassed();

        pendingBeneficiary           = _proposed;
        beneficiaryChangeRequestedAt = block.timestamp;

        emit BeneficiaryChangeRequested(
            beneficiary,
            _proposed,
            block.timestamp + BENEFICIARY_CHANGE_DELAY
        );
    }

    /**
     * @notice Confirm and apply the pending beneficiary change.
     *         Callable by anyone once the delay has elapsed.
     *
     * @dev    FIX (Issue #1): Added isDeadlinePassed() check. Without this,
     *         an attacker could:
     *           1. Owner requests beneficiary change on day 363 (365-day vault)
     *           2. Deadline passes on day 365
     *           3. Attacker confirms the change on day 365+
     *           4. New (attacker-controlled) beneficiary calls claim() instead
     *              of the original heir.
     *         By reverting when the vault deadline has passed, the original
     *         beneficiary is guaranteed to be able to claim once the deadline
     *         is reached, regardless of any pending change.
     */
    function confirmBeneficiaryChange() external whenInitialized whenActive {
        if (pendingBeneficiary == address(0)) revert ZeroAddress();
        if (block.timestamp < beneficiaryChangeRequestedAt + BENEFICIARY_CHANGE_DELAY)
            revert BeneficiaryChangeLocked();

        // FIX: Prevent confirmation after vault deadline has passed.
        // The original beneficiary should be able to claim at this point.
        if (isDeadlinePassed()) revert DeadlineAlreadyPassed();

        address old                  = beneficiary;
        beneficiary                  = pendingBeneficiary;
        pendingBeneficiary           = address(0);
        beneficiaryChangeRequestedAt = 0;

        emit BeneficiaryChanged(old, beneficiary);
    }

    /**
     * @notice Cancel a pending beneficiary change before it takes effect.
     */
    function cancelBeneficiaryChange() external onlyOwner whenInitialized whenActive {
        if (pendingBeneficiary == address(0)) revert ZeroAddress();

        address cancelled        = pendingBeneficiary;
        pendingBeneficiary       = address(0);
        beneficiaryChangeRequestedAt = 0;

        emit BeneficiaryChangeCancelled(cancelled);
    }

    // -------------------------------------------------------------------------
    // Two-step ownership transfer
    // -------------------------------------------------------------------------

    /**
     * @notice Initiate an ownership transfer. New owner must accept.
     * @param  _newOwner Candidate new owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner whenInitialized {
        if (_newOwner == address(0))  revert ZeroAddress();
        if (_newOwner == owner)       revert SameAddress();
        if (_newOwner == beneficiary) revert SameAddress();

        pendingOwner = _newOwner;
        emit OwnershipTransferStarted(owner, _newOwner);
    }

    /**
     * @notice Accept ownership — must be called by the pending owner.
     */
    function acceptOwnership() external whenInitialized {
        if (pendingOwner == address(0))  revert NoPendingOwner();
        if (msg.sender != pendingOwner)  revert NotPendingOwner();

        address old  = owner;
        owner        = pendingOwner;
        pendingOwner = address(0);

        // Reset lastSeen so new owner has a full window
        lastSeen = block.timestamp;

        emit OwnershipTransferred(old, owner);
    }

    /**
     * @notice Cancel a pending ownership transfer.
     */
    function cancelOwnershipTransfer() external onlyOwner whenInitialized {
        if (pendingOwner == address(0)) revert NoPendingOwner();
        pendingOwner = address(0);
    }

    // -------------------------------------------------------------------------
    // Beneficiary claim
    // -------------------------------------------------------------------------

    /**
     * @notice Claim the vault balance after the inactivity deadline has passed.
     *         The frontend "Claim Inheritance" button calls this (only shown
     *         to the connected beneficiary wallet after the deadline).
     */
    function claim() external onlyBeneficiary whenInitialized whenActive nonReentrant {
        // CHECKS
        if (!isDeadlinePassed()) revert DeadlineNotReached();

        uint256 amount = address(this).balance;
        if (amount == 0) revert NothingToWithdraw();

        // EFFECTS before INTERACTIONS (CEI)
        active = false;

        // INTERACTIONS
        (bool success, ) = beneficiary.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Claimed(beneficiary, amount);
    }

    // -------------------------------------------------------------------------
    // View helpers (used by the frontend dashboard)
    // -------------------------------------------------------------------------

    /**
     * @notice Returns true if the owner has missed their check-in window.
     *
     * @dev    NOTE on block.timestamp: Miners can manipulate block.timestamp
     *         by ~15 seconds on RSK. Given the minimum 1-day lock duration
     *         and 2-day beneficiary change delay, this drift is not exploitable
     *         in practice and no mitigation is required.
     */
    function isDeadlinePassed() public view returns (bool) {
        if (!initialized) return false;
        return block.timestamp > lastSeen + lockDuration;
    }

    /**
     * @notice Seconds remaining until the beneficiary can claim (0 if passed).
     */
    function timeUntilClaim() external view returns (uint256) {
        if (!initialized) return 0;
        uint256 deadline = lastSeen + lockDuration;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /**
     * @notice The absolute UNIX timestamp when the beneficiary can claim.
     */
    function claimDeadline() external view returns (uint256) {
        return lastSeen + lockDuration;
    }

    /**
     * @notice Current vault balance in wei.
     */
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Full vault status for the frontend dashboard.
     *         Call this once to populate all UI fields.
     */
    function vaultStatus() external view returns (
        bool    _initialized,
        address _owner,
        address _beneficiary,
        uint256 _balance,
        uint256 _lastSeen,
        uint256 _lockDuration,
        uint256 _deadline,
        uint256 _secondsLeft,
        bool    _active,
        bool    _paused,
        bool    _deadlinePassed
    ) {
        uint256 deadline = initialized ? lastSeen + lockDuration : 0;
        uint256 secsLeft = (initialized && block.timestamp < deadline)
            ? deadline - block.timestamp
            : 0;

        return (
            initialized,
            owner,
            beneficiary,
            address(this).balance,
            lastSeen,
            lockDuration,
            deadline,
            secsLeft,
            active,
            paused,
            isDeadlinePassed()
        );
    }
}
