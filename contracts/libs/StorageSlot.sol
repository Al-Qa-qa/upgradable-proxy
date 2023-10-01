// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

library StorageSlot {
  struct AddressSlot {
    address value;
  }

  function getAddressSlot(
    bytes32 slot
  ) internal pure returns (AddressSlot storage r) {
    // Get storage pointer
    assembly {
      r.slot := slot
    }
  }
}
