// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./libs/StorageSlot.sol";

// import "hardhat/console.sol";

/**
 * @title Upgradable Proxy Smart Contract
 * @author Al-Qa'qa'
 * @notice This contract sets upgradable proxy smart contract using Proxy Pattern
 * @dev This contract is not audited
 */
contract Proxy {
  //////////////
  /// errors ///
  //////////////

  error Proxy__NotAContract();

  /////////////////
  /// Variables ///
  /////////////////

  bytes32 private constant IMPLEMENTATION_SLOT =
    bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
  bytes32 private constant ADMIN_SLOT =
    bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);

  //////////////////////////////////
  /// Moodifiers and constructor ///
  //////////////////////////////////

  modifier ifAdmin() {
    if (msg.sender == _getAdmin()) {
      _;
    } else {
      _fallback();
    }
  }

  /**
   * @notice Initialized the contract and setting the admin of it with the address passed
   * @param _proxyAdmin Admin address
   */
  constructor(address _proxyAdmin) {
    _setAdmin(_proxyAdmin);
  }

  /**
   * Calling internal `_fallback()`
   */
  fallback() external payable {
    _fallback();
  }

  /**
   * Calling internal `_fallback()`
   */
  receive() external payable {
    _fallback();
  }

  /////////////////////////////////////
  /// External and Public functions ///
  /////////////////////////////////////

  /**
   * @notice Changing the admin of the contract
   * @param _admin Admin address
   */
  function changeAdmin(address _admin) external ifAdmin {
    _setAdmin(_admin);
  }

  /**
   * @notice changing the implementaion address that the functions will be delegate called to it
   * @dev changing the implementation is the upgrading the smart contract, where it changes the address
   *      of the contract to be delegate called
   * @param _implementation Implementation address
   */
  function upgradeTo(address _implementation) external ifAdmin {
    // No need to check for the admin as the function will be `delegated` to the
    // implementation contract in case its called by non-admin address
    // require(msg.sender == _getAdmin(), "not authorized");
    _setImplementation(_implementation);
  }

  /// @notice Getting the current admin of the Proxy contract
  function admin() external ifAdmin returns (address) {
    return _getAdmin();
  }

  /// @notice Getting the Implementation address (the contract address that can be upgraded later)
  function implementation() external ifAdmin returns (address) {
    return _getImplementation();
  }

  //////////////////////////////////////
  /// Internal and Private functions ///
  //////////////////////////////////////

  /// @notice Getting the current admin of the Proxy contract
  function _getAdmin() private view returns (address) {
    return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
  }

  /**
   * @notice The functions that will be called in fallback and receive functions
   * @dev this is the function that is responsible for delegating the call to the implementation contractr
   */
  function _fallback() private {
    _delegate(_getImplementation());
  }

  /**
   * @notice Delegate call a function in the implementation contract address, and return the data
   *
   * @param _implementation Contract Address
   */
  function _delegate(address _implementation) private {
    assembly {
      // Copy msg.data. We take full control of memory in this inline assembly
      // block because it will not return to Solidity code. We overwrite the
      // Solidity scratch pad at memory position 0.

      // calldatacopy(t, f, s) - copy s bytes from calldata at position f to mem at position t
      // calldatasize() - size of call data in bytes
      calldatacopy(0, 0, calldatasize())

      // Call the implementation.
      // out and outsize are 0 because we don't know the size yet.

      // delegatecall(g, a, in, insize, out, outsize) -
      // - call contract at address a
      // - with input mem[in…(in+insize))
      // - providing g gas
      // - and output area mem[out…(out+outsize))
      // - returning 0 on error (eg. out of gas) and 1 on success
      let result := delegatecall(
        gas(),
        _implementation,
        0,
        calldatasize(),
        0,
        0
      )

      // Copy the returned data.
      // returndatacopy(t, f, s) - copy s bytes from returndata at position f to mem at position t
      // returndatasize() - size of the last returndata
      returndatacopy(0, 0, returndatasize())

      switch result
      // delegatecall returns 0 on error.
      case 0 {
        // revert(p, s) - end execution, revert state changes, return data mem[p…(p+s))
        revert(0, returndatasize())
      }
      default {
        // return(p, s) - end execution, return data mem[p…(p+s))
        return(0, returndatasize())
      }
    }
  }

  /**
   * @notice change the admin of the Proxy contract
   *
   * @param _admin New Admin address
   */
  function _setAdmin(address _admin) private {
    StorageSlot.getAddressSlot(ADMIN_SLOT).value = _admin;
  }

  /// @notice Getting the Implementation address (the contract address that can be upgraded later)
  function _getImplementation() private view returns (address) {
    return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
  }

  /**
   * @notice upgrading the contract by changing the implementation address
   *
   * @param _implementation New implementation
   */
  function _setImplementation(address _implementation) private {
    if (_implementation.code.length == 0) revert Proxy__NotAContract();
    StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = _implementation;
  }
}

/**
 * @title The Admin of the Proxy Smart Contract
 * @author Al-Qa'qa'
 * @notice This contract will be the admin (controller) of the Proxy contract
 * @dev This contract is not audited
 */
contract ProxyAdmin {
  //////////////
  /// errors ///
  //////////////

  error ProxyAdmin__NotAuthorized();
  error ProxyAdmin__CallingFailed();

  /////////////////
  /// Variables ///
  /////////////////

  address public owner;

  //////////////////////////////////
  /// Moodifiers and constructor ///
  //////////////////////////////////

  modifier onlyOwner() {
    if (msg.sender != owner) revert ProxyAdmin__NotAuthorized();
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  /////////////////////////////////////
  /// External and Public functions ///
  /////////////////////////////////////

  /**
   * @notice Get the admin address of the given Proxy Contract
   * @dev this function should be called by the admin of the given proxy address, or it will get reverted
   *
   * @param _proxy The Proxy address
   */
  function getProxyAdmin(address _proxy) external view returns (address) {
    (bool ok, bytes memory res) = _proxy.staticcall(
      abi.encodeCall(Proxy.admin, ())
    );
    if (!ok) revert ProxyAdmin__CallingFailed();
    return abi.decode(res, (address));
  }

  /**
   * @notice Get the implementation address of the given Proxy Contract
   * @dev this function should be called by the admin of the given proxy address, or it will get reverted
   *
   * @param _proxy The Proxy address
   */
  function getProxyImplementation(
    address _proxy
  ) external view returns (address) {
    (bool ok, bytes memory res) = _proxy.staticcall(
      abi.encodeCall(Proxy.implementation, ())
    );
    if (!ok) revert ProxyAdmin__CallingFailed();
    return abi.decode(res, (address));
  }

  /**
   * @notice Change the admin address of the given Proxy Contract address
   * @dev this function should be called by the admin of the given proxy address, or it will get reverted
   *
   * @param _proxy The Proxy address
   * @param _admin New admin
   */
  function changeProxyAdmin(
    address payable _proxy,
    address _admin
  ) external onlyOwner {
    Proxy(_proxy).changeAdmin(_admin);
  }

  /**
   * @notice Change the implementation address of the given Proxy Contract address
   * @notice upgrade the contract address that is managed my the Proxy to the given implementation address
   * @dev this function should be called by the admin of the given proxy address, or it will get reverted
   * @dev `_implementation` param should refer to a contract address
   *
   * @param _proxy The Proxy address
   * @param _implementation New Implementation
   */
  function upgrade(
    address payable _proxy,
    address _implementation
  ) external onlyOwner {
    Proxy(_proxy).upgradeTo(_implementation);
  }
}
