import { EventDecoder } from '@dusalabs/sdk';
import { Args, ArrayTypes } from '@massalabs/massa-web3';
import { MIN_ALLOWANCE_BEFORE_INCREASE } from './constants';
import { getMasIfWmas } from './coreMethods';
import {
  getPairAddressTokens,
  getTokensFromPairAddress,
  argsDelimiter
} from './datastoreFetcher';
import {
  getTokenFromAddress,
  getIntervalFromSeconds,
  printBigintIsh,
  DELIMITER,
  getPoolByLOAddress
} from './methods';
import { MASSA, WMAS } from './tokens';
import { Version } from './types';

// Reads the parameters of a call from the start, without moving the offset of `params`
export const readArgs = (params: Args): Args => new Args(params.serialize());

export const getSwapDescription = async (
  events: string[],
  params: Args,
  isNativeIn: boolean,
  isNativeOut: boolean
): Promise<string> => {
  const swapLists: string[][] = [];
  let currentSwapList: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const item = events[i];

    if (item === 'TRANSFER SUCCESS') {
      if (currentSwapList.length) {
        swapLists.push(currentSwapList);
        currentSwapList = [];
      }
    } else if (item.startsWith('SWAP:') || item.startsWith('V1_SWAP:')) {
      currentSwapList.push(item);
    }
  }

  if (currentSwapList.length) {
    swapLists.push(currentSwapList);
  }

  swapLists.length > 2 && swapLists.splice(1, swapLists.length - 2);

  const swapAmounts = swapLists.map((swapEvents) => {
    return swapEvents.reduce(
      (prev, event) => {
        const isLegacy = event.startsWith('SWAP:');
        let amountInToBin = 0n;
        let amountOutOfBin = 0n;
        let feesTotal = 0n;
        if (isLegacy) {
          const decoded = EventDecoder.decodeSwap(event);
          amountInToBin = decoded.amountInToBin;
          amountOutOfBin = decoded.amountOutOfBin;
          feesTotal = decoded.feesTotal;
        } else {
          const decoded = EventDecoder.decodeSwapV2(event);
          amountInToBin = decoded.amountsIn.reduce(
            (acc, amount) => acc + amount,
            0n
          );
          feesTotal = decoded.feesTotal.reduce(
            (acc, amount) => acc + amount,
            0n
          );
          amountOutOfBin = decoded.amountOut;
        }

        prev.amountIn += amountInToBin + feesTotal;
        prev.amountOut += amountOutOfBin;

        return prev;
      },
      { amountIn: 0n, amountOut: 0n }
    );
  });

  // [amountIn,] amountOut, binSteps, isLegacy, path, ... (V2 router)
  const args = readArgs(params);
  args.nextU256();
  if (!isNativeIn) args.nextU256();
  args.nextArray(ArrayTypes.U64);
  args.nextArray(ArrayTypes.BOOL);
  const pathAddresses = args.nextArray<string>(ArrayTypes.STRING);

  const tokenIn = isNativeIn ? MASSA : getTokenFromAddress(pathAddresses[0]);
  const tokenOut = isNativeOut
    ? MASSA
    : getTokenFromAddress(pathAddresses[pathAddresses.length - 1]);

  return `Swap ${printBigintIsh(tokenIn, swapAmounts[0].amountIn)} ${
    tokenIn.symbol
  } for ${printBigintIsh(
    tokenOut,
    swapAmounts[swapLists.length === 1 ? 0 : 1].amountOut
  )} ${tokenOut.symbol}`;
};

export const getAddLiquidityDescription = async (
  events: string[],
  params: Args,
  version: Version
): Promise<string> => {
  const args = readArgs(params);
  const tokenX = getMasIfWmas(getTokenFromAddress(args.nextString()));
  const tokenY = getMasIfWmas(getTokenFromAddress(args.nextString()));
  const binStep = args.nextU64();

  return `Liquidity added in ${tokenX.symbol}/${tokenY.symbol}/${binStep}/${version}`;
};

export const getRemoveLiquidityDescription = async (
  events: string[],
  params: Args,
  version: Version,
  isNativeIn: boolean
): Promise<string> => {
  const args = readArgs(params);
  const tokenAAddress = args.nextString();
  const tokenBAddress = isNativeIn ? WMAS.address : args.nextString();
  const binStep = args.nextU32();
  const tokenA = getTokenFromAddress(tokenAAddress);
  const tokenB = getTokenFromAddress(tokenBAddress);

  const description = `Liquidity removed from ${tokenA.symbol}/${tokenB.symbol}/${binStep}/${version}`;

  return description;
};

export const getClaimFeesDescription = async (
  pairAddress: string,
  events: string[]
): Promise<string> => {
  const { amountX, amountY } = EventDecoder.decodeCollectFees(
    events[events.length - 1]
  );
  const tokens = await getPairAddressTokens(pairAddress);
  const tokenIn = getTokenFromAddress(tokens[0]);
  const tokenOut = getTokenFromAddress(tokens[1]);

  let description = 'Claim ';
  if (amountX > 0)
    description += `${printBigintIsh(tokenIn, amountX)} ${tokenIn.symbol} `;
  if (amountX > 0 && amountY > 0) description += 'and ';
  if (amountY > 0)
    description += `${printBigintIsh(tokenOut, amountY)} ${tokenOut.symbol} `;
  description += 'from generated fees';

  return description;
};

export const getAllowanceDescription = async (
  params: Args,
  tokenAddress: string
): Promise<string> => {
  const args = readArgs(params);
  args.nextString(); // spender
  const amount = args.nextU256();
  const token = getTokenFromAddress(tokenAddress);
  const description =
    amount < BigInt(MIN_ALLOWANCE_BEFORE_INCREASE)
      ? `
    Increase allowance for ${printBigintIsh(token, amount)} ${token.symbol}`
      : `Increase unlimited allowance for ${token.symbol}`;

  return description;
};

export const getApprovalDescription = async (
  pairAddress: string
): Promise<string> => {
  const tokens = await getPairAddressTokens(pairAddress);
  const tokenIn = getTokenFromAddress(tokens[0]);
  const tokenOut = getTokenFromAddress(tokens[1]);
  return `Approved ${tokenIn.symbol}/${tokenOut.symbol} LBToken`;
};

export const getDepositDescription = async (
  events: string[],
  pairAddress: string
): Promise<string> => {
  const { amountX, amountY } = EventDecoder.decodeVault(
    events[events.length - 2]
  ); // ICO QUEST is the last event
  const tokens = await getPairAddressTokens(pairAddress);
  const token0 = getTokenFromAddress(tokens[0]);
  const token1 = getTokenFromAddress(tokens[1]);
  return `Deposit  ${printBigintIsh(token0, amountX)} ${
    token0.symbol
  } and ${printBigintIsh(token1, amountY)} ${
    token1.symbol
  } in the vault for autonomous liquidity`;
};

export const getWithdrawDescription = async (
  events: string[],
  pairAddress: string
): Promise<string> => {
  const { amountX, amountY } = EventDecoder.decodeVault(
    events[events.length - 1]
  );
  const tokens = await getPairAddressTokens(pairAddress);
  const token0 = getTokenFromAddress(tokens[0]);
  const token1 = getTokenFromAddress(tokens[1]);
  return `Withdraw ${printBigintIsh(token0, amountX)} ${
    token0.symbol
  } and ${printBigintIsh(token1, amountY)} ${
    token1.symbol
  } from autonomous liquidity`;
};

export const getStartDCADescription = async (param: Args): Promise<string> => {
  const args = readArgs(param);
  const amount = args.nextU256();
  const interval = args.nextU64();
  args.nextU64(); // number of cycles
  const tokenPath = args.nextArray<string>(ArrayTypes.STRING);

  const token0 = getTokenFromAddress(tokenPath[0]);
  const token1 = getTokenFromAddress(tokenPath[tokenPath.length - 1]);

  const intervalText = getIntervalFromSeconds(Number(interval) / 1000);
  const intervalTextApprox = intervalText[0];

  const description = `Execute a DCA every ${intervalTextApprox} to swap ${printBigintIsh(token0, amount)} ${token0.symbol} into ${
    token1.symbol
  }`;

  return description;
};

export const getAddLimitOrderDescription = (
  param: Args,
  events: string[]
): string => {
  const isSellOrder = readArgs(param).nextU8() !== 0n;
  const event = events.find((e) => e.startsWith('NEW_LIMIT_ORDER:'));
  const loSCEvent = events.find((e) => e.startsWith('DEPOSITED:'));
  const baseDescription = 'Limit order created';
  if (!event || !loSCEvent) return baseDescription;
  const id = EventDecoder.decodeLimitOrder(event).id;
  const loSC = EventDecoder.extractParams(loSCEvent)[0];

  const pool = getPoolByLOAddress(loSC);

  const [tokenIn, tokenOut] = isSellOrder
    ? [pool?.token0, pool?.token1]
    : [pool?.token1, pool?.token0];

  if (!tokenIn || !tokenOut) return baseDescription;

  const description = `Limit order id ${id} opened, expected a swap from ${getMasIfWmas(tokenIn).symbol} to ${getMasIfWmas(tokenOut).symbol}`;
  return description;
};

export const getCreatePoolDescription = async (
  events: string[]
): Promise<string> => {
  const baseDescription = 'Pool created';
  if (!events) return baseDescription;
  const createEvents = events.filter((e) => e.startsWith('CREATE_LBPAIR'));
  if (!createEvents.length) return baseDescription;
  const { pair, binStep: bs } = EventDecoder.decodeCreateLBPair(
    createEvents[0]
  );

  const tokens = await getTokensFromPairAddress(pair);

  return `Pool created: ${getMasIfWmas(tokens[0]).symbol}/${
    getMasIfWmas(tokens[1]).symbol
  }/${bs}`;
};

export const getClaimRewardsDescription = async (
  events: string[]
): Promise<string> => {
  events = events.filter((e) => e.startsWith('Claim:'));
  const market = extractParamsClaim(events[0])[1];
  const amounts = events.map((e) => {
    const [, , , t, amount] = extractParamsClaim(e);
    const token = t === '' ? MASSA : getTokenFromAddress(t);
    return `${printBigintIsh(token, amount)} ${token.symbol}`;
  });

  return `Claimed ${amounts.map((a) => a).join(' and ')} from ${market === 'staking' ? 'staking' : 'incentives'} program`;
};

const computeLiquidity = (
  events: string[]
): { amountX: bigint; amountY: bigint } => {
  const amounts = events.reduce(
    (prev, event) => {
      const decoded = EventDecoder.decodeLiquidity(event);
      prev.amountX += decoded.amountX;
      prev.amountY += decoded.amountY;

      return prev;
    },
    { amountX: 0n, amountY: 0n }
  );

  return amounts;
};

const extractParamsClaim = (bytes: string): string[] =>
  bytes.split(DELIMITER).slice(1).join(DELIMITER).split(argsDelimiter);
