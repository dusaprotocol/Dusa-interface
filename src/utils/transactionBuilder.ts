import { LimitOrder, SwapParameters, StartDCAParameters } from '@dusalabs/sdk';
import { Args } from '@massalabs/massa-web3';
import { ArrayTypes, MAX_GAS_CALL } from '@massalabs/massa-web3';
import {
  dcaManagerSC,
  dcaManagerSCV2,
  factoryV2SC,
  faucetSC,
  governanceSC,
  rewarderSC,
  routerSC,
  routerV2SC,
  STAKING_SC_ADDRESS,
  vaultManagerSC,
  voterSC,
  votingEscrowSC
} from './config';
import { VESTING_SC_ADDRESS } from './config';
import { AutopoolConfig, minimalFee, currentEpoch } from './constants';
import { MASSA, WMAS } from './tokens';
import { ICallData, MassaUnits, Token, Version } from './types';

const ONE_BILLION = 1_000_000_000n;
export const callData: Pick<ICallData, 'coins' | 'fee' | 'maxGas'> = {
  coins: 100n * MassaUnits.mMassa, // 0.1 MAS
  fee: minimalFee,
  maxGas: ONE_BILLION
};

// ==================================================== //
// ====                    SWAP                    ==== //
// ==================================================== //

export const buildSwapTx = (params: SwapParameters): ICallData => {
  return {
    ...callData,
    targetAddress: routerV2SC,
    targetFunction: params.methodName,
    parameter: params.args,
    coins: params.value,
    maxGas: ONE_BILLION * 2n
  };
};

// ==================================================== //
// ====                ADD LIQUIDITY               ==== //
// ==================================================== //

export const buildAddLiquidityTx = (
  token0: string,
  token1: string,
  binStep: number,
  amount0: bigint,
  amount1: bigint,
  amount0Min: bigint,
  amount1Min: bigint,
  activeIdDesired: number,
  idSlippage: number,
  deltaIds: number[],
  distributionX: bigint[],
  distributionY: bigint[],
  to: string,
  method: string,
  v: Version
): ICallData => {
  const masToSend = 40_400_000n + 45_800_000n * BigInt(deltaIds.length);

  const args = new Args()
    .addString(token0)
    .addString(token1)
    .addU64(toBI(binStep))
    .addU256(amount0)
    .addU256(amount1)
    .addU256(amount0Min)
    .addU256(amount1Min)
    .addU64(toBI(activeIdDesired))
    .addU64(toBI(idSlippage))
    .addArray(deltaIds.map(BigInt), ArrayTypes.I64)
    .addArray(distributionX, ArrayTypes.U256)
    .addArray(distributionY, ArrayTypes.U256)
    .addString(to)
    .addU64(BigInt(Date.now() + 600_000));
  if (method === 'addLiquidityMAS') args.addU64(masToSend);

  return {
    ...callData,
    targetAddress: v === 'V1' ? routerSC : routerV2SC,
    targetFunction: method,
    parameter: args,
    coins:
      method === 'addLiquidityMAS'
        ? (token0 === WMAS.address ? amount0 : amount1) + masToSend
        : masToSend,
    maxGas: MAX_GAS_CALL
  };
};

// ==================================================== //
// ====              REMOVE LIQUIDITY              ==== //
// ==================================================== //

export const buildRemoveLiquidityTx = (
  tokenA: string,
  tokenB: string,
  binStep: number,
  amountXMin: bigint,
  amountYMin: bigint,
  ids: number[],
  amounts: bigint[],
  to: string,
  method: string,
  v: Version
): ICallData => {
  const isToken0MAS = tokenA == WMAS.address;
  const isToken1MAS = tokenB == WMAS.address;
  const isMAS = method == 'removeLiquidityMAS';
  const masToSend = 19_200_000n + 10_300_000n * BigInt(ids.length);

  if (!isToken0MAS && isToken1MAS) {
    [tokenA, tokenB] = [tokenB, tokenA];
    [amountXMin, amountYMin] = [amountYMin, amountXMin];
  }

  const args = new Args();
  if (!isMAS) args.addString(tokenA);
  args
    .addString(tokenB)
    .addU32(BigInt(binStep))
    .addU256(isMAS ? amountYMin : amountXMin)
    .addU256(isMAS ? amountXMin : amountYMin)
    .addArray(ids.map(BigInt), ArrayTypes.U64)
    .addArray(amounts, ArrayTypes.U256)
    .addString(to)
    .addU64(BigInt(Date.now() + 600_000));

  return {
    ...callData,
    targetAddress: v === 'V1' ? routerSC : routerV2SC,
    targetFunction: method,
    parameter: args,
    maxGas: MAX_GAS_CALL,
    coins: masToSend
  };
};

// ==================================================== //
// ====             INCREASE ALLOWANCE             ==== //
// ==================================================== //

export const buildIncreaseAllowanceTx = (
  token: string,
  spender: string,
  amount: bigint
): ICallData => {
  const args = new Args().addString(spender).addU256(amount > 0n ? amount : 0n);

  return {
    ...callData,
    targetAddress: token,
    targetFunction: 'increaseAllowance',
    parameter: args
  };
};

export function buildSetApprovalForAll(
  token: string,
  spender: string
): ICallData {
  const args = new Args().addBool(true).addString(spender);

  return {
    ...callData,
    targetAddress: token,
    targetFunction: 'setApprovalForAll',
    parameter: args
  };
}

// ==================================================== //
// ====            AUTONOMOUS LIQUIDITY            ==== //
// ==================================================== //

export const buildALDeposit = (
  token0Address: string,
  token1Address: string,
  type: AutopoolConfig,
  amountX: bigint,
  amountY: bigint
): ICallData => {
  const isToken0MAS = token0Address === WMAS.address;
  const isToken1MAS = token1Address === WMAS.address;
  const isMAS = isToken0MAS || isToken1MAS;

  if (!isToken0MAS && isToken1MAS) {
    [token0Address, token1Address] = [token1Address, token0Address];
    [amountX, amountY] = [amountY, amountX];
  }

  const args = new Args()
    .addString(token0Address)
    .addString(token1Address)
    .addU64(toBI(type));

  if (!isMAS) args.addU256(amountX);

  args
    .addU256(amountY)
    .addU256(0n) // high slippage with mas, why ??? 3.42 instead of 3.60
    .addU256(0n); // high slippage with mas, why??? 3.42 instead of 3.60

  return {
    ...callData,
    targetAddress: vaultManagerSC,
    targetFunction: isMAS ? 'depositMAS' : 'deposit',
    parameter: args,
    maxGas: MAX_GAS_CALL,
    coins: isMAS ? amountX : callData.coins
  };
};

export const buildAutonomousWithdrawAll = (
  token0Address: string,
  token1Address: string,
  type: AutopoolConfig,
  method: string
): ICallData => {
  const isMAS = method === 'withdrawAllMAS';
  const args = new Args().addString(
    isMAS && token0Address === WMAS.address ? token1Address : token0Address
  );
  if (!isMAS) args.addString(token1Address);
  args.addU64(toBI(type));

  return {
    ...callData,
    targetAddress: vaultManagerSC,
    targetFunction: method,
    parameter: args,
    maxGas: ONE_BILLION * 2n
  };
};

// ==================================================== //
// ====                     DCA                    ==== //
// ==================================================== //

export const buildDCATx = (
  param: StartDCAParameters & { moreGas: boolean }
): ICallData => {
  const args = new Args()
    .addU256(param.amountEachDCA)
    .addU64(toBI(param.interval))
    .addU64(toBI(param.nbOfDCA))
    .addArray(param.tokenPath, ArrayTypes.STRING)
    .addU32(toBI(param.threshold))
    .addBool(param.moreGas)
    .addU64(toBI(param.startIn));

  return {
    ...callData,
    targetAddress: dcaManagerSCV2,
    targetFunction: 'startDCA',
    parameter: args,
    maxGas: ONE_BILLION * 2n
  };
};

export const buildStopDCATx = (id: number): ICallData => {
  const args = new Args().addU64(BigInt(id));

  return {
    ...callData,
    targetAddress: id >= 24 ? dcaManagerSCV2 : dcaManagerSC,
    targetFunction: 'stopDCA',
    parameter: args
  };
};

export const buildUpdateDCATx = (
  param: StartDCAParameters & { id: number; moreGas: boolean }
): ICallData => {
  const args = new Args()
    .addU64(BigInt(param.id))
    .addU256(param.amountEachDCA)
    .addU64(toBI(param.interval))
    .addU64(toBI(param.nbOfDCA))
    .addArray(param.tokenPath, ArrayTypes.STRING)
    .addU32(toBI(param.threshold))
    .addBool(param.moreGas);

  return {
    ...callData,
    targetAddress: param.id >= 24 ? dcaManagerSCV2 : dcaManagerSC,
    targetFunction: 'updateDCA',
    parameter: args,
    maxGas: ONE_BILLION * 2n,
    coins:
      700_000_000n *
      (param.moreGas ? 2n : 1n) *
      BigInt(param.tokenPath.length - 1)
  };
};

// ==================================================== //
// ====                  LIMIT ORDER                 ==== //
// ==================================================== //

export const buildAddOrderTx = (
  order: LimitOrder,
  limitOrderSC: string,
  useMas = false
): ICallData => {
  const masToSend = MassaUnits.oneMassa;

  const args = new Args().addU8(order.orderType).addU64(order.binId);
  if (useMas) {
    args.addU64(masToSend);
  } else {
    args.addU256(order.amountIn);
  }

  return {
    ...callData,
    targetAddress: limitOrderSC,
    targetFunction: useMas ? 'addLimitOrderMas' : 'addLimitOrder',
    parameter: args,
    coins: useMas ? order.amountIn + masToSend : 100n * MassaUnits.mMassa,
    maxGas: MAX_GAS_CALL,
    fee: MassaUnits.oneMassa
  };
};

export const buildCancelOrderTx = (
  orderId: number,
  limitOrderSC: string,
  isMas: boolean
): ICallData => {
  const args = new Args().addU32(BigInt(orderId));

  return {
    ...callData,
    targetAddress: limitOrderSC,
    targetFunction: isMas ? 'cancelOrderMas' : 'cancelOrder',
    parameter: args
  };
};

export const buildClaimOrderTx = (
  orderId: number,
  limitOrderSC: string,
  useMas: boolean
): ICallData => {
  const args = new Args().addU32(BigInt(orderId));

  return {
    ...callData,
    targetAddress: limitOrderSC,
    targetFunction: useMas ? 'claimOrderMas' : 'claimOrder',
    parameter: args
  };
};

export const buildClaimFeesTx = (
  address: string,
  account: string,
  ids: number[]
): ICallData => {
  const args = new Args()
    .addString(account)
    .addArray(ids.map(BigInt), ArrayTypes.U64);

  return {
    ...callData,
    targetAddress: address,
    targetFunction: 'collectFees',
    parameter: args
  };
};

// ==================================================== //
// ====                    FAUCET                  ==== //
// ==================================================== //

export const buildFaucetTx = (): ICallData => {
  return {
    ...callData,
    targetAddress: faucetSC,
    targetFunction: 'claim',
    parameter: new Args()
  };
};

// ==================================================== //
// ====                GOVERNANCE                  ==== //
// ==================================================== //

export const buildVoteTx = (
  proposalId: number,
  support: 0 | 1 | 2,
  lockIds: number[]
): ICallData => {
  const args = new Args()
    .addU32(BigInt(proposalId))
    .addU8(BigInt(support))
    .addArray(lockIds.map(toBI), ArrayTypes.U64);

  return {
    ...callData,
    targetAddress: governanceSC,
    targetFunction: 'vote',
    parameter: args,
    coins: 10n * MassaUnits.mMassa
  };
};

export const buildCreateProposalTx = (
  title: string,
  description: string,
  endBlock: number
): ICallData => {
  const args = new Args()
    .addString(title)
    .addString(description)
    .addU64(toBI(endBlock));
  return {
    ...callData,
    targetAddress: governanceSC,
    targetFunction: 'propose',
    parameter: args
  };
};

// ==================================================== //
// ====                    WMAS                    ==== //
// ==================================================== //

export const buildWrapTx = (amount: bigint): ICallData => {
  return {
    ...callData,
    targetAddress: WMAS.address,
    targetFunction: 'deposit',
    parameter: new Args(),
    coins: amount
  };
};

export const buildUnwrapTx = (_amount: bigint, target: string): ICallData => {
  const amount = _amount <= BigInt(2 ** 64 - 1) ? _amount : 0n;
  const args = new Args().addU64(amount).addString(target);

  return {
    ...callData,
    targetAddress: WMAS.address,
    targetFunction: 'withdraw',
    parameter: args,
    coins: 0n
  };
};

// ==================================================== //
// ====                  CREATE                    ==== //
// ==================================================== //

export const buildCreatePoolTx = (
  tokenA: string,
  tokenB: string,
  activeId: number,
  binStep: number
): ICallData => {
  return {
    ...callData,
    targetAddress: factoryV2SC,
    targetFunction: 'createLBPair',
    parameter: new Args()
      .addString(tokenA)
      .addString(tokenB)
      .addU32(BigInt(activeId))
      .addU32(BigInt(binStep)),
    coins: MassaUnits.oneMassa * 10n
  };
};

// ==================================================== //
// ====                  REWARD                    ==== //
// ==================================================== //

export const buildClaimRewardTx = (
  marketAddress: string[],
  epoch: bigint[],
  tokensAddresses: string[]
): ICallData => {
  // Safety checks to ensure all parameters are valid arrays
  if (
    !Array.isArray(marketAddress) ||
    !Array.isArray(epoch) ||
    !Array.isArray(tokensAddresses)
  ) {
    throw new Error('All parameters must be valid arrays');
  }

  if (
    marketAddress.length !== epoch.length ||
    marketAddress.length !== tokensAddresses.length
  ) {
    throw new Error('All arrays must have the same length');
  }

  // Validate array elements are not undefined or null
  if (marketAddress.some((addr) => addr === undefined || addr === null)) {
    throw new Error('Market addresses contain invalid values');
  }

  if (epoch.some((e) => e === undefined || e === null)) {
    throw new Error('Epochs contain invalid values');
  }

  if (tokensAddresses.some((addr) => addr === undefined || addr === null)) {
    throw new Error('Token addresses contain invalid values');
  }

  const args = new Args()
    .addArray(marketAddress, ArrayTypes.STRING)
    .addArray(epoch, ArrayTypes.U64)
    .addArray(tokensAddresses, ArrayTypes.STRING);

  // No `maxGas` on purpose: both wallet providers estimate it from a read-only
  // run when it is absent. Asking for MAX_GAS_CALL reserves a whole block of
  // gas (Massa's per-block limit is MAX_GAS_CALL + 800_000), so at `minimalFee`
  // the operation only fits an otherwise-empty slot and can expire unexecuted.
  return {
    coins: callData.coins,
    fee: callData.fee,
    targetAddress: rewarderSC,
    targetFunction: 'batchClaim',
    parameter: args
  };
};

// ==================================================== //
// ====                  TRANSFER                  ==== //
// ==================================================== //

export const buildTransferTokenTx = (
  token: string,
  receiver: string,
  amount: bigint
): ICallData => {
  const args = new Args()
    .addString(receiver)
    .addU256(amount > 0n ? amount : 0n);

  return {
    ...callData,
    targetAddress: token,
    targetFunction: 'transfer',
    parameter: args
  };
};

// ==================================================== //
// ====                    SALE                    ==== //
// ==================================================== //

export const buildSaleTx = (
  token: Token,
  amountIn: bigint,
  amountOutMin: bigint,
  target: string
): ICallData => {
  const args = new Args();
  if (!token.equals(MASSA)) args.addU256(amountIn);
  args.addU256(amountOutMin);

  const coins = token.equals(MASSA) ? amountIn : callData.coins;

  return {
    ...callData,
    targetAddress: target,
    targetFunction: 'buy',
    parameter: args,
    coins
  };
};

export const buildClaimVestingTx = (sessionId: number, amount: bigint) => {
  const args = new Args()
    .addU64(BigInt(sessionId))
    .addU256(amount > 0n ? amount : 0n);

  return {
    ...callData,
    targetAddress: VESTING_SC_ADDRESS,
    targetFunction: 'claimVestingSession',
    parameter: args
  };
};

// ==================================================== //
// ====                  STAKING                  ==== //
// ==================================================== //

export const buildStakingTx = (amount: bigint, isDeposit: boolean) => {
  const args = new Args().addU256(amount);

  return {
    ...callData,
    targetAddress: STAKING_SC_ADDRESS,
    targetFunction: isDeposit ? 'deposit' : 'withdraw',
    parameter: args
  };
};

// export const buildStakeTx = (amount: bigint) => {
//   const txs: Tx[] = [
//     new Tx(
//       'increaseAllowance',
//       new Args()
//         .addString(STAKING_SC_ADDRESS)
//         .addU256(amount > 0n ? amount : 0n)
//         .serialize(),
//       IS_BUILDNET ? JELLY.address : DUSA_MAIN.address
//     ),
//     new Tx(
//       'deposit',
//       new Args().addU256(amount).serialize(),
//       STAKING_SC_ADDRESS
//     )
//   ];

//   return {
//     ...callData,
//     targetAddress: multicallSC,
//     targetFunction: 'multicall',
//     parameter: new Args().addSerializableObjectArray(txs)
//   };
// };

// export const buildUnstakeTx = (amount: bigint) => {
//   const args = new Args().addU256(amount);

//   return {
//     ...callData,
//     targetAddress: STAKING_SC_ADDRESS,
//     targetFunction: 'withdraw',
//     parameter: args
//   };
// };

// ==================================================== //
// ====                  veDUSA                    ==== //
// ==================================================== //

export const buildDelegateLockTx = (
  delegator: bigint,
  delegatee: bigint
): ICallData => {
  const args = new Args().addU64(delegator).addU64(delegatee);

  console.log({ delegator, delegatee });

  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'delegate',
    parameter: args
  };
};

export const buildWithdrawTx = (tokenId: bigint): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId);

  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'withdraw',
    parameter: args
  };
};

export const buildCreateLockTx = (
  amount: bigint,
  lockDuration: number
): ICallData => {
  const args = new Args().addU256(amount).addU256(toBI(lockDuration));

  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'createLock',
    parameter: args,
    maxGas: MAX_GAS_CALL
  };
};

export const buildVoteEscrowTx = (
  tokenId: bigint,
  poolVote: string[],
  weights: bigint[]
): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');
  // console.log(poolVote, weights);
  const args = new Args()
    .addU64(tokenId)
    .addArray(poolVote, ArrayTypes.STRING)
    .addArray(weights, ArrayTypes.U256);

  return {
    ...callData,
    targetAddress: voterSC,
    targetFunction: 'vote',
    parameter: args
  };
};

export const buildPokeTx = (tokenId: bigint): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId);
  return {
    ...callData,
    targetAddress: voterSC,
    targetFunction: 'poke',
    parameter: args
  };
};

export const buildResetTx = (tokenId: bigint): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId);
  return {
    ...callData,
    targetAddress: voterSC,
    targetFunction: 'reset',
    parameter: args
  };
};

export const buildDepositBribesTx = (
  poolAddress: string,
  tokenAddress: string,
  amount: bigint,
  epoch?: number
): ICallData => {
  const epochToUse = epoch ?? currentEpoch.id;
  const args = new Args()
    .addString(poolAddress)
    .addString(tokenAddress)
    .addU256(amount)
    .addU64(BigInt(epochToUse));

  return {
    ...callData,
    targetAddress: voterSC,
    targetFunction: 'depositBribes',
    parameter: args,
    maxGas: MAX_GAS_CALL
  };
};

export const buildIncreaseAmountTx = (
  tokenId: bigint,
  amount: bigint
): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId).addU256(amount);
  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'increaseAmount',
    parameter: args
  };
};

export const buildLockPermanentTx = (tokenId: bigint): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId);
  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'lockPermanent',
    parameter: args
  };
};

export const buildUnlockPermanentTx = (tokenId: bigint): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId);
  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'unlock',
    parameter: args
  };
};

export const buildIncreaseUnlockTimeTx = (
  tokenId: bigint,
  lockDuration: bigint
): ICallData => {
  // if (tokenId <= 0n) throw new Error('Invalid tokenId');

  const args = new Args().addU64(tokenId).addU256(lockDuration);
  return {
    ...callData,
    targetAddress: votingEscrowSC,
    targetFunction: 'increaseUnlockTime',
    parameter: args
  };
};

// export const buildMergeTx = (from: bigint, to: bigint): ICallData => {
//   const args = new Args().addU256(from).addU256(to);

//   return {
//     ...callData,
//     targetAddress: votingEscrowSC,
//     targetFunction: 'merge',
//     parameter: args
//   };
// };

// ==================================================== //
// ====                  FLOOR TOKEN               ==== //
// ==================================================== //

export const buildDeployFloorTx = (
  // Floor token args
  tokenY: string,
  factory: string,
  activeId: number,
  binStep: number,
  floorPerBin: string,
  // Transfer tax token args
  name: string,
  symbol: string,
  decimals: number,
  initialSupply: string,
  taxRatePercent: number,
  taxRecipient: string
): ICallData => {
  // Convert tax rate from percentage (0-100) to PRECISION-based format (1e18)
  // Example: 5% = 5 * 1e18 / 100 = 0.05e18
  const PRECISION = 10n ** 18n;
  const taxRate =
    (BigInt(Math.floor(taxRatePercent * 100)) * PRECISION) / 10000n;

  // Constructor parameters in order:
  // Floor token: tokenY, factory, activeId, binStep, floorPerBin
  // Transfer tax: name, symbol, decimals, initialSupply, taxRate, taxRecipient
  const args = new Args()
    .addString(tokenY)
    .addString(factory)
    .addU32(BigInt(activeId))
    .addU32(BigInt(binStep))
    .addU256(BigInt(floorPerBin))
    .addString(name)
    .addString(symbol)
    .addU8(BigInt(decimals))
    .addU256(BigInt(initialSupply))
    .addU256(taxRate)
    .addString(taxRecipient);

  return {
    ...callData,
    maxGas: MAX_GAS_CALL,
    coins: MassaUnits.oneMassa * 20n,
    targetAddress: 'AS1jgFzhaMP1sy4GBQYuXptyDCtqGYA96cxAhQwo27fLYna8jrMf',
    targetFunction: 'deploy',
    parameter: args
  };
};

// Transfer Tax Management Functions
export const buildSetTaxRecipientTx = (
  tokenAddress: string,
  newTaxRecipient: string
): ICallData => {
  const args = new Args().addString(newTaxRecipient);

  return {
    ...callData,
    targetAddress: tokenAddress,
    targetFunction: 'setTaxRecipient',
    parameter: args
  };
};

export const buildSetTaxRateTx = (
  tokenAddress: string,
  taxRatePercent: number
): ICallData => {
  // Convert tax rate from percentage (0-100) to PRECISION-based format (1e18)
  const PRECISION = 10n ** 18n;
  const taxRate =
    (BigInt(Math.floor(taxRatePercent * 100)) * PRECISION) / 10000n;

  const args = new Args().addU256(taxRate);

  return {
    ...callData,
    targetAddress: tokenAddress,
    targetFunction: 'setTaxRate',
    parameter: args
  };
};

export const buildSetExcludedFromTaxTx = (
  tokenAddress: string,
  account: string,
  excludedStatus: bigint
): ICallData => {
  const args = new Args().addString(account).addU8(excludedStatus);

  return {
    ...callData,
    targetAddress: tokenAddress,
    targetFunction: 'setExcludedFromTax',
    parameter: args
  };
};

// ==================================================== //
// ====                    MISC                    ==== //
// ==================================================== //

export const toBI = (value: number) =>
  BigInt(isNaN(value) ? 0 : Math.floor(Math.abs(value)));
