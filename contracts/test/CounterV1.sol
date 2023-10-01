// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract CounterV1 {
  uint public count;

  function inc() external {
    count += 1;
  }
}
