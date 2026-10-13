import {
  Bin as _Bin,
  Token as BaseToken,
  Fraction,
  parseUnits,
  TokenAmount
} from '@dusalabs/sdk';
import { BigintIsh } from '@dusalabs/sdk/dist/constants';
import { Address } from '@massalabs/massa-web3';
import { CHAIN_ID, EXPLORER, IS_BUILDNET, NETWORK } from './config';
import {
  calculateEpochDates,
  currentEpoch,
  currentSeason,
  epochDuration,
  genesis,
  genesisTimestamp,
  JELLY_VALUE,
  launchTimestamp,
  ONE_DAY,
  ONE_HOUR,
  ONE_MINUTE,
  ONE_MONTH,
  ONE_PERIOD,
  ONE_WEEK,
  POINTS_BY_JELLY,
  POINTS_BY_JELLY_AFTER_50,
  POINTS_BY_JELLY_BEFORE_37,
  unknownURI
} from './constants';
import { defaultDeposit } from './placeholders';
import { pools as _pools, poolsV2WithLO } from './pools';
import { getImportedTokens, getLastTokens, getLastTokensDCA } from './storage';
import {
  DUSA_LOCKED_PUBLIC_1,
  DUSA_LOCKED_PUBLIC_2,
  DUSA_LOCKED_SEED,
  JELLY,
  MASSA,
  tokens
} from './tokens';
import {
  Reward,
  Token as PrismaToken,
  GlobalLeaderboardItemDetails,
  RewardDetails
} from './trpc';
import {
  Bin,
  Vault,
  DayWindow,
  TimeWindow,
  Token,
  Epoch,
  WeekWindow,
  NumberWindow,
  TWindow,
  VestingSession,
  PoolLiquidity,
  Pool,
  PoolV2WithLO
} from './types';

export const abs = (x: bigint): bigint => (x < 0n ? -x : x);

export const round = (x: number, precision = 2): number =>
  Math.round(x * 10 ** precision) / 10 ** precision;

export const roundPrice = (x: number): number =>
  round(x, x > 100 ? 2 : x > 1 ? 4 : 6);

export const formatNumber = (num: number, precision = 2): string => {
  return num.toLocaleString('en-US', {
    maximumSignificantDigits:
      num < 1 ? (precision <= 0 ? 1 : precision) : undefined,
    maximumFractionDigits: precision
  });
};

export const printBigintIsh = (
  token: Token,
  amount: BigintIsh,
  precision = 2
): string => formatNumber(roundTokenAmount(token, amount), precision);

export const roundTokenAmount = (
  token: Token,
  amount: BigintIsh,
  precision = token.decimals
) => Number(new TokenAmount(token, amount).toFixed(precision));

export const roundLowerUnit = (valeur: number) => {
  return Math.floor(valeur);
};

export const roundUpperUnit = (valeur: number) => {
  return Math.ceil(valeur);
};

// ????
export const sortTokens = (tkns: Token[]): Token[] => {
  const sortTokenArray = [
    'DUSA',
    'MAS',
    'WMAS',
    'USDC.e',
    'WBTC.e',
    'DAI.e',
    'WETH.e',
    'PUR'
  ]; // tokens.map(t => t.symbol)
  const sortTokenIndices = Object.fromEntries(
    sortTokenArray.map((symbol, index) => [symbol, index])
  );

  return tkns
    .sort((a, b) => (a.symbol.toUpperCase() < b.symbol.toUpperCase() ? -1 : 1))
    .sort((a, b) => {
      const aIndex =
        sortTokenIndices[a.symbol] !== undefined
          ? sortTokenIndices[a.symbol]
          : sortTokenArray.length;
      const bIndex =
        sortTokenIndices[b.symbol] !== undefined
          ? sortTokenIndices[b.symbol]
          : sortTokenArray.length;

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.symbol.localeCompare(b.symbol);
    });
};

export const unFormatPrintedNumber = (printedNumber: string) =>
  printedNumber.replace(/,/g, '');

export const roundFractionPrice = (fraction: Fraction): string => {
  const value =
    Number(fraction.quotient) +
    Number(fraction.remainder.numerator) /
      Number(fraction.remainder.denominator || 1);

  let decimalPlaces = 18;
  if (value > 100) decimalPlaces = 2;
  else if (value > 1) decimalPlaces = 4;

  return formatNumberWithSubscriptZeros(
    fraction.toFixed(decimalPlaces),
    value < 1 ? 5 : 4
  );
};

export const roundFractionPriceAdaptive = (
  fraction: Fraction,
  baseToken: Token
): string => {
  const value = parseFloat(fraction.toSignificant(10));

  // Use intelligent precision based on the value magnitude
  let precision: number;
  if (value >= 1000) precision = 2;
  else if (value >= 100) precision = 3;
  else if (value >= 10) precision = 4;
  else if (value >= 1) precision = 5;
  else if (value >= 0.1) precision = 6;
  else if (value >= 0.01) precision = 7;
  else if (value >= 0.001) precision = 8;
  else precision = Math.min(baseToken.decimals, 10);

  // Use toFixed with dynamic precision, then remove trailing zeros but preserve at least 1 significant digit
  let result = value.toFixed(precision).replace(/0+$/, '');

  // Ensure we don't end with a decimal point
  if (result.endsWith('.')) {
    result = result.slice(0, -1);
  }

  // Ensure we have at least one digit after decimal for small values
  if (value < 1 && !result.includes('.')) {
    result = value.toFixed(1);
  }

  return result;
};

export const printUSD = (value: number, keepCents = true, precision = 2) =>
  formatNumberWithSubscriptZeros(
    value.toLocaleString('en-US', {
      maximumSignificantDigits: value < 1 ? precision : undefined,
      maximumFractionDigits: keepCents ? precision : 0,
      minimumFractionDigits: keepCents ? precision : 0
    })
  );

export const toFraction = (float: number): Fraction => {
  if (isNaN(float) || float === 0 || !isFinite(float)) return new Fraction(0n);
  const value = BigInt(Math.round(float * 1e40));
  return new Fraction(value, BigInt(1e40));
};

export const minmax = (val: number, min: number, max: number) =>
  Math.min(Math.max(min, val), max);

export const blockInvalidChar = (
  e: React.KeyboardEvent,
  additionalString: string[] = ['']
) => {
  ['e', 'E', '+', '-'].concat(additionalString).includes(e.key) &&
    e.preventDefault();
};

export const isAddressValid = (address: string): boolean => {
  if (!address) return false;
  try {
    Address.fromString(address);
    return true;
  } catch (e) {
    return false;
  }
};

export const printAddress = (address: string) =>
  `${address.substring(0, 5)}...${address.substring(address.length - 5)}`;

// ********************************

export const printDate = (
  date: Date | string | number,
  format?: TWindow,
  withYear = false
) => {
  let formatOptions: Intl.DateTimeFormatOptions = {
    year: withYear ? 'numeric' : undefined
  };
  switch (format) {
    case TimeWindow.Day:
      formatOptions = {
        hour: '2-digit',
        minute: '2-digit'
      };
      break;
    case TimeWindow.Week:
    case DayWindow.WEEK:
    case TimeWindow.Month:
    case DayWindow.MONTH:
    case DayWindow.QUARTER:
    case DayWindow.HALF_YEAR:
    case WeekWindow.QUARTER:
    case WeekWindow.HALF_YEAR:
    case WeekWindow.YEAR:
      formatOptions = {
        month: 'short',
        day: '2-digit'
      };
      break;
    case NumberWindow.BASE:
    case NumberWindow.MID:
    case NumberWindow.ALL:
      formatOptions = {
        month: 'numeric',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      break;
    case DayWindow.YEAR:
      formatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      };
      break;
    default:
      formatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };
      break;
  }
  return new Date(date).toLocaleString(undefined, formatOptions);
};

export const getTokenFromAddress = (address: string): Token => {
  const tokenList = tokens.concat(getImportedTokens());

  const token = tokenList.find((t) => t.address === address);
  if (!token) {
    throw new Error(`Token ${address} not found.`);
  }
  return token;
};

export const getLogoURIFromToken = (token: Token): string => {
  if (token.logoURI) return token.logoURI;
  else {
    try {
      return getTokenFromAddress(token.address).logoURI;
    } catch {
      return unknownURI;
    }
  }
};

export const getTokensFromStorage = (): (Token | undefined)[] => {
  const lastTokens = getLastTokens();

  const tokensFromStorage = lastTokens.map((token) => {
    return tokens
      .concat(getImportedTokens())
      .find((t) => (token ? t.equals(token) : false));
  });

  return !tokensFromStorage.length ? [MASSA, undefined] : tokensFromStorage;
};

export const getTokensDCAFromStorage = (): (Token | undefined)[] => {
  const lastTokens = getLastTokensDCA();

  const tokensFromStorage = lastTokens.map((token) => {
    return tokens.find((t) => (token ? t.equals(token) : false));
  });
  return tokensFromStorage;
};

export const getPriceFromId = _Bin.getPriceFromId;
export const getIdFromPrice = _Bin.getIdFromPrice;
export const getIdSlippageFromPriceSlippage =
  _Bin.getIdSlippageFromPriceSlippage;

// ????
export const getIntervalFromSeconds = (nbSeconds: number): string[] => {
  let remainingSeconds = nbSeconds;

  const secondsInMinute = 60;
  const secondsInHour = 60 * secondsInMinute;
  const secondsInDay = 24 * secondsInHour;
  const secondsInWeek = 7 * secondsInDay;
  const secondsInMonth = 30 * secondsInDay; // Approximation

  const months = Math.floor(remainingSeconds / secondsInMonth);
  remainingSeconds %= secondsInMonth;

  const weeks = Math.floor(remainingSeconds / secondsInWeek);
  remainingSeconds %= secondsInWeek;

  const days = Math.floor(remainingSeconds / secondsInDay);
  remainingSeconds %= secondsInDay;

  const hours = Math.floor(remainingSeconds / secondsInHour);
  remainingSeconds %= secondsInHour;

  const minutes = Math.floor(remainingSeconds / secondsInMinute);
  remainingSeconds %= secondsInMinute;

  return [
    months > 0 ? `${months} month${months !== 1 ? 's ' : ' '}` : '',
    weeks > 0 ? `${weeks} week${weeks !== 1 ? 's ' : ' '}` : '',
    days > 0 ? `${days} day${days !== 1 ? 's ' : ' '}` : '',
    hours > 0 ? `${hours} hour${hours !== 1 ? 's ' : ' '}` : '',
    minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's ' : ' '}` : '',
    remainingSeconds > 0
      ? `${remainingSeconds.toFixed(0)} second${
          remainingSeconds !== 1 ? 's ' : ' '
        }`
      : ''
  ].filter(Boolean);
};

// prettier-ignore
export const emptyBin: Bin = { id: 0, amount0: 0n, amount1: 0n, amountLBT: 0n, value: 0, accToken0PerShare: 0n, accToken1PerShare: 0n };
export const fillMissingBins = (
  bins: Bin[],
  nbBinsToAddOnEachSide = 0
): Bin[] => {
  if (!bins.length) return bins;

  // add missing bins between first and last bin
  const minId = bins[0].id - nbBinsToAddOnEachSide;
  const maxId = bins[bins.length - 1].id + nbBinsToAddOnEachSide;
  const existingBinIds = new Set(bins.map((bin) => bin.id));

  const filledBins: Bin[] = Array.from(
    { length: maxId - minId + 1 },
    (_, index) => {
      const id = minId + index;
      const newBin = { ...emptyBin, id };
      return existingBinIds.has(id)
        ? (bins.find((bin) => bin.id === id) ?? newBin)
        : newBin;
    }
  );

  return filledBins;
};

export const fillEmptyBinsOnRange = (
  bins: Bin[],
  range: [number, number]
): Bin[] => {
  if (!bins.length) return bins;

  const filledBins: Bin[] = Array.from(
    { length: range[1] - range[0] + 1 },
    (_, index) => {
      const id = range[0] + index;
      const newBin = { ...emptyBin, id };
      return bins.find((bin) => bin.id === id) ?? newBin;
    }
  );

  return filledBins;
};

export const transformBins = (r: Bin[], activeId: number) => {
  if (r.length === 0) return r;

  const rangeCentered: [number, number] = activeId
    ? activeId - r[0].id < r[r.length - 1].id - activeId
      ? [activeId - (r[r.length - 1].id - activeId), r[r.length - 1].id]
      : [r[0].id, activeId + (activeId - r[0].id)]
    : [r[0].id, r[r.length - 1].id];
  const filledBins = fillEmptyBinsOnRange(r, rangeCentered);
  const _activeBinIndex = filledBins.findIndex((bin) => bin.id === activeId);
  const middleBin = Math.floor(filledBins.length / 2);

  if (_activeBinIndex !== -1 && _activeBinIndex < middleBin) {
    const nbBinsToAdd = (middleBin - _activeBinIndex) * 2;
    const emptyBins = Array.from({ length: nbBinsToAdd }, (_, i) => ({
      ...emptyBin,
      id: filledBins[0].id - i - 1
    })).sort((a, b) => a.id - b.id);
    return [...emptyBins, ...filledBins].sort((a, b) => a.id - b.id);
  } else if (_activeBinIndex > middleBin) {
    const nbBinsToAdd = (_activeBinIndex - middleBin) * 2;
    const emptyBins = Array.from({ length: nbBinsToAdd }, (_, i) => ({
      ...emptyBin,
      id: filledBins[filledBins.length - 1].id + i + 1
    }));
    return [...filledBins, ...emptyBins];
  } else return filledBins;
};

//

const getTick = (timestamp: number | Date | string, x: number) =>
  new Date(Math.floor(new Date(timestamp).getTime() / x) * x);

export const getDailyTick = (timestamp: number | Date | string = Date.now()) =>
  getTick(timestamp, ONE_DAY);

export const filledEmptyRewardsWeeks = (
  points: GlobalLeaderboardItemDetails[]
) => {
  const res: GlobalLeaderboardItemDetails[] = [];
  let lastFriday = getDailyTick().getTime();
  while (new Date(lastFriday).getUTCDay() !== 5) {
    lastFriday -= ONE_DAY;
  }
  const weeks = new Set(points.map((r) => r.date.getTime()));
  for (let date = lastFriday; date > launchTimestamp; date -= ONE_WEEK) {
    if (weeks.has(date)) {
      const point = points.find((r) => r.date.getTime() === date);
      if (point) res.push(point);
    } else
      res.push({
        date: new Date(date),
        userAddress: '',
        discordScore: 0,
        referralScore: 0,
        totalScore: 0,
        makerScore: 0,
        swapScore: 0,
        points: 0
      });
  }
  return res;
};

export function filledEmptyIncentivesWeeks(rewards: RewardDetails[]) {
  if (rewards.length === 0) return [];

  const startEpoch = 37;
  const lastEpoch = currentEpoch.id - 1;

  const existingEpochs = new Set(rewards.map((r) => r.rewardEpoch));

  const rewardMap: Record<number, RewardDetails[]> = {};

  for (const r of rewards) {
    if (!rewardMap[r.rewardEpoch]) {
      rewardMap[r.rewardEpoch] = [];
    }
    rewardMap[r.rewardEpoch].push(r);
  }

  const result: RewardDetails[] = [];

  for (let epoch = startEpoch; epoch <= lastEpoch; epoch++) {
    if (existingEpochs.has(epoch)) {
      rewardMap[epoch].forEach((r, i) => {
        if (i === 0) return;
        rewardMap[epoch][0] = {
          ...rewardMap[epoch][0],
          makerRewardsWithStreakRaw:
            rewardMap[epoch][0].makerRewardsWithStreakRaw +
            ';' +
            r.makerRewardsWithStreakRaw,
          makerRewardsWithStreak:
            rewardMap[epoch][0].makerRewardsWithStreak +
            r.makerRewardsWithStreak
        };
      });
      result.push(rewardMap[epoch][0]);
    } else {
      result.push({
        rewardEpoch: epoch,
        userAddress: '',
        poolAddress: '',
        makerRewards: 0,
        makerRewardsWithStreak: 0,
        percentOfTotalFees: 0,
        makerScore: 0,
        makerRank: 0,
        rewardPercentage: 0,
        rewardToken: 'JELLY',
        makerRewardsRaw: '0',
        makerRewardsWithStreakRaw: '0',
        pairName: '0',
        rewardAmount: 0,
        weeklyStreak: 0,
        accruedFeesX: '0',
        accruedFeesY: '0',
        accruedFeesL: '0',
        accruedFeesUsd: 0,
        accruedFeesUsdEffective: 0
      });
    }
  }
  return result;
}

// Autonomous Liquidity
// Sum the values for different autonomous liquidity vault for a specific pool
export const sumVaults = (vaults: Vault[]): Bin[] => {
  const summedBins: Bin[] = vaults.reduce((result, { bins }) => {
    bins.forEach((bin) => {
      const existingBinIndex = result.findIndex((b) => b.id === bin.id);
      if (existingBinIndex === -1) {
        result.push({
          ...bin
        });
      } else {
        result[existingBinIndex].amount0 += bin.amount0;
        result[existingBinIndex].amount1 += bin.amount1;
        result[existingBinIndex].amountLBT += bin.amountLBT;
        result[existingBinIndex].value += bin.value;
      }
    });

    return result;
  }, [] as Bin[]);

  return summedBins.sort((a, b) => (a.id > b.id ? 1 : -1));
};
export const sumBinAmounts = (bins: Bin[]) =>
  bins.reduce(
    (acc, bin) => ({
      amount0: acc.amount0 + bin.amount0,
      amount1: acc.amount1 + bin.amount1
    }),
    defaultDeposit
  );

const getNbSignificantNumbers = (amount: bigint): number =>
  Math.floor(Math.log10(Number(amount === 0n ? 1n : amount))) + 1;

export const tokenAmountToSignificant = (tokenAmount: TokenAmount): string =>
  tokenAmount.toSignificant(getNbSignificantNumbers(tokenAmount.raw));

export const getBinValue = (
  token0: Token,
  token1: Token,
  amount0: bigint,
  amount1: bigint,
  activeId: number,
  binStep: number
) => {
  const price = getPriceFromId(activeId, binStep);
  const priceAdjusted = price * 10 ** (token0.decimals - token1.decimals);
  const priceAsFraction = toFraction(priceAdjusted);
  const value = Number(
    new TokenAmount(token0, amount0)
      .multiply(priceAsFraction)
      .add(new TokenAmount(token1, amount1))
      .toSignificant(6)
  );
  return value;
};

export const parseSlot = (
  thread: number,
  period: number,
  isSecond = false
): number => {
  const timestamp =
    genesisTimestamp + period * ONE_PERIOD + (thread / 2) * 1000;
  return isSecond ? Math.floor(timestamp / 1000) : timestamp;
};

export const calculateTVL = (
  amount0: TokenAmount,
  amount1: TokenAmount,
  token0Value: number,
  token1Value: number
) => {
  let tvl = new Fraction(0n);
  if (token0Value) tvl = tvl.add(amount0).multiply(toFraction(token0Value));
  if (token1Value) tvl = tvl.add(amount1.multiply(toFraction(token1Value)));

  return Number(tvl.toSignificant(6));
};

export const calculateAPR = (usdPerDay: Fraction, tvl: number): number => {
  if (tvl === 0 || isNaN(tvl)) return 0;
  const apr = usdPerDay.divide(toFraction(tvl)).multiply(365n).multiply(100n);
  return Number(apr.toSignificant(6));
};

export const calculateRewardAPR = (
  rewardTokens: Reward['rewardTokens'],
  epoch: Epoch,
  tvl: number
) => {
  const usdPerDay = rewardTokens.reduce(
    (acc, rewardToken) =>
      acc.add(
        calculateRewardsPerDay(rewardToken, epoch).multiply(
          toFraction(
            rewardToken.address === JELLY.address
              ? JELLY_VALUE
              : rewardToken.dollarValue
          )
        )
      ),
    new Fraction(1n)
  );

  return calculateAPR(usdPerDay, tvl);
};

export const calculateRewardsPerDay = (
  rewardInfo: Reward['rewardTokens'][number],
  epoch: Epoch
) => {
  const {
    token: { address, decimals }
  } = rewardInfo;
  const epochDurat = Math.round(
    (epoch.to.getTime() - epoch.from.getTime()) / ONE_DAY
  );
  const rewardToken = new BaseToken(CHAIN_ID, address, decimals);
  return new TokenAmount(rewardToken, rewardInfo.amount).divide(
    BigInt(epochDurat)
  );
};

export const getEpochFromId = (id: number): Epoch => {
  const dates = calculateEpochDates(id);
  return {
    id,
    from: dates.from,
    to: dates.to
  };
};

export const getEpochFromDate = (date: Date): Epoch => {
  const dateTime = date.getTime();

  // Handle epochs before transition (0-72)
  if (dateTime <= calculateEpochDates(72).to.getTime()) {
    const epochId = Math.floor((dateTime - genesis) / epochDuration);
    return getEpochFromId(epochId + 2);
  }

  // Handle epoch 73 (shortened epoch)
  const epoch73 = calculateEpochDates(73);
  if (dateTime >= epoch73.from.getTime() && dateTime <= epoch73.to.getTime()) {
    return getEpochFromId(73);
  }

  // Handle epochs 74+ (new cycle)
  const epoch74Start = calculateEpochDates(74).from.getTime();
  if (dateTime >= epoch74Start) {
    const daysSinceEpoch74 = Math.floor(
      (dateTime - epoch74Start) / epochDuration
    );
    return getEpochFromId(74 + daysSinceEpoch74);
  }

  // Default fallback
  return getEpochFromId(1);
};

export const parseScore = (score: number) => {
  return round(score, 0).toLocaleString();
};

const convertToSubscript = (number: number) =>
  String(number)
    .split('')
    .map((digit) => String.fromCharCode(8320 + parseInt(digit)))
    .join('');

/**
 * Formats a number string using scientific notation with subscript zeros.
 *
 * @param num - The number string or number to format.
 * @param precision - The number of decimal places to include in the formatted string. Default is 3.
 * @returns The formatted number string.
 */
export function formatNumberWithSubscriptZeros(
  num: string | number,
  precision = 3
): string {
  const hasE = num.toString().includes('e');
  const numberStr = hasE
    ? parseFloat(num.toString()).toFixed(18)
    : num.toString();
  const number = typeof num === 'number' ? num : parseFloat(numberStr);
  const isNegative = number < 0;
  const absNumberStr = isNegative ? numberStr.slice(1) : numberStr;

  if (number === 0 || absNumberStr.replace(/0|\./g, '') === '') {
    return '0';
  }

  const [part0, part1 = ''] = absNumberStr.split('.');

  if (/^0*$/.test(part1)) {
    return isNegative ? `-${part0}` : part0;
  }

  const leadingZerosMatch = part1.match(/^0+/);
  if (leadingZerosMatch) {
    const leadingZerosCount = leadingZerosMatch[0].length;

    if (leadingZerosCount > 2) {
      const smallCount = convertToSubscript(leadingZerosCount);
      const result = `${part0}.0${smallCount}${part1
        .slice(leadingZerosCount, leadingZerosCount + precision)
        .replace(/0+$/, '')}`;
      return isNegative ? `-${result}` : result;
    } else {
      const result = `${part0}.${part1
        .slice(0, precision + leadingZerosCount)
        .replace(/0+$/, '')}`;
      return isNegative ? `-${result}` : result;
    }
  } else {
    const result = `${part0}.${part1.slice(0, precision).replace(/0+$/, '')}`;
    return isNegative ? `-${result}` : result;
  }
}

export const changeQuantityWithFixedPriceRaw = (
  quantity: string | undefined,
  isToken0: boolean,
  targetPrice: Fraction,
  token0: Token | undefined,
  token1: Token | undefined
): { qty0: string; qty1: string } => {
  let qty0 = '';
  let qty1 = '';

  if (!quantity) return { qty0, qty1 };

  if (token0 === undefined || token1 === undefined) {
    if (isToken0) qty0 = quantity;
    else qty1 = quantity;
    return { qty0, qty1 };
  }

  isToken0 ? (qty0 = quantity) : (qty1 = quantity);
  const qty = parseUnits(quantity, (isToken0 ? token0 : token1).decimals);
  if (qty <= 0n) return { qty0, qty1 };

  const fraction = isToken0
    ? targetPrice.multiply(qty)
    : targetPrice.numerator === 0n
      ? new Fraction(0n)
      : targetPrice.invert().multiply(qty);
  const qtyBigInt = fraction.quotient;
  const qtyParsed = tokenAmountToSignificant(
    new TokenAmount(isToken0 ? token1 : token0, qtyBigInt)
  );
  if (qtyBigInt === 0n) isToken0 ? (qty1 = '') : (qty0 = '');
  else isToken0 ? (qty1 = qtyParsed) : (qty0 = qtyParsed);
  return { qty0, qty1 };
};

const getExplorerParam = (id: string) => {
  if (isAddressValid(id)) return 'address';
  if (id.startsWith('B1')) return 'block';
  if (id.startsWith('O1')) return 'operation';
};

export const buildExplorerLink = (id: string, isEthereum?: boolean): string => {
  const param = getExplorerParam(id);
  const networkQuery = NETWORK === 'buildnet' ? '?network=buildnet' : '';
  return isEthereum
    ? `https://${IS_BUILDNET ? 'sepolia.' : ''}etherscan.io/tx/${id}`
    : `${EXPLORER}/${param}/${id}${networkQuery}`;
};

export const cleanAddress = (address: string | undefined) =>
  address?.replace('_', '') || ''; // TEMP: handle MAS-WMAS

export const toToken = (token: PrismaToken) =>
  new Token(
    CHAIN_ID,
    token.address,
    token.decimals,
    '',
    token.symbol,
    token.name
  );

/**
 * Filters pools based on the search value.
 * @param search symbol or symbols separated by a space
 * @param pools list of pools
 * @returns
 */
export const filterPools = (search: string, pools: Pool[]): Pool[] => {
  const symbols = search.toLowerCase().split(' ');
  // Search for pools with the token symbol if the search value is one symbol,
  // otherwise search for pools with the token symbols if the search value is two symbols.
  const filteredPools = pools.filter((pool) => {
    const symbol0 = pool.token0.symbol.toLowerCase();
    const symbol1 = pool.token1.symbol.toLowerCase();
    return (
      (symbol0.includes(symbols[0]) || symbol1.includes(symbols[0])) &&
      (symbols.length === 1 ||
        symbol0.includes(symbols[1]) ||
        symbol1.includes(symbols[1]))
    );
  });
  return filteredPools;
};

/**
 * Finds a pool in poolsV2WithLO that matches the given tokens (regardless of order)
 * @param token0 - First token
 * @param token1 - Second token
 * @returns The matching PoolV2WithLO or undefined if not found
 */
export const findLimitOrderPool = (
  token0: Token,
  token1: Token
): PoolV2WithLO | undefined => {
  return poolsV2WithLO.find(
    (pool) =>
      (pool.token0.address === token0.address &&
        pool.token1.address === token1.address) ||
      (pool.token0.address === token1.address &&
        pool.token1.address === token0.address)
  );
};

/**
 * Finds a pool in poolsV2WithLO that matches the given pool address
 * @param poolAddress - The pool address to match
 * @returns The matching PoolV2WithLO or undefined if not found
 */
export const findLimitOrderPoolByAddress = (
  poolAddress: string
): PoolV2WithLO | undefined => {
  return poolsV2WithLO.find((pool) => pool.pairAddress === poolAddress);
};

export const getPoolByLOAddress = (loSC: string): PoolV2WithLO | undefined =>
  poolsV2WithLO.find((pool) => pool.loSC === loSC);

/**
 * Validates if a pool supports limit orders and returns detailed info
 * @param token0 First token
 * @param token1 Second token
 * @returns Object with support status and pool info
 */
export const validateLimitOrderSupport = (
  token0: Token | undefined,
  token1: Token | undefined
): {
  isSupported: boolean;
  pool: PoolV2WithLO | undefined;
  error?: string;
} => {
  if (!token0 || !token1) {
    return {
      isSupported: false,
      pool: undefined,
      error: 'Both tokens must be selected'
    };
  }

  const pool = findLimitOrderPool(token0, token1);

  if (!pool) {
    return {
      isSupported: false,
      pool: undefined,
      error: `Limit orders are not supported for ${token0.symbol}/${token1.symbol} pair`
    };
  }

  if (!pool.loSC || pool.loSC.trim() === '') {
    return {
      isSupported: false,
      pool,
      error: `Limit order smart contract not configured for ${token0.symbol}/${token1.symbol}`
    };
  }

  return {
    isSupported: true,
    pool,
    error: undefined
  };
};

/**
 * Shortens dayjs `fromNow` output
 * @param str
 * @returns
 */
export const shortenDate = (str: string) =>
  str
    .replace(' years', 'y')
    .replace(' year', 'y')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' seconds', 's')
    .replace(' second', 's')
    .replace(' ago', '')
    .replace('a fews', 'a few s')
    .replace('am', '1m')
    .replace('ad', '1d')
    .replace('anh', '1h');

export const getFrequencyDuration = (index: number) => {
  switch (index) {
    case 0:
      return ONE_MINUTE;
    case 1:
      return ONE_HOUR;
    case 2:
      return ONE_DAY;
    case 3:
      return ONE_WEEK;
    case 4:
      return ONE_MONTH;
    default:
      return ONE_DAY;
  }
};

export const getTimezomeDate = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const newDate = new Date(date);
  newDate.setMinutes(date.getMinutes() - offset);
  return newDate;
};

export const isInDusaSeason = (): boolean => {
  const seasonStart = currentSeason.from.getTime();
  const seasonEnd = currentSeason.to.getTime();
  const timestamp = new Date().getTime();
  return timestamp >= seasonStart && timestamp <= seasonEnd;
};

export const convertPointsToJELLY = (points: number, epoch: number) => {
  if (epoch < 37) return points / POINTS_BY_JELLY_BEFORE_37;
  if (epoch >= 51) return points / POINTS_BY_JELLY_AFTER_50;
  else return points / POINTS_BY_JELLY;
};

export const u8ArrayToString = (array: Uint8Array): string =>
  String.fromCharCode(...array);

export const DELIMITER = ':';
export const createKey = (...args: any[]): string =>
  args.map(String).join(DELIMITER);

export const binStepToDepth = (binStep: number) => {
  switch (binStep) {
    case 1:
      return 200;
    case 20:
    case 15:
      return 1000;
    default:
      return 2500;
  }
};

export const clamp = (num: number, min: number, max: number) => {
  return Math.max(min, Math.min(num, max));
};

export const isMobile = () => {
  const pattern =
    /(iphone|ipad|ipod|android|blackberry|windows phone|tablet|playbook|silk|(android(?!.*mobile)))/i;
  return pattern.test(navigator.userAgent);
};

export const getDusaLockedToken = (sale: string) =>
  sale === 'Seed'
    ? DUSA_LOCKED_SEED
    : sale === 'Public 1'
      ? DUSA_LOCKED_PUBLIC_1
      : DUSA_LOCKED_PUBLIC_2;

/**
 * Returns a promise that resolves after the specified time interval and throws an error if the
 * specified promise does not resolve before the timeout interval.
 *
 * @param promise - The promise to be resolved.
 * @param timeoutMs - The time interval in milliseconds.
 *
 * @throws if the specified promise does not resolve before the timeout interval.
 *
 * @returns A promise that resolves after the specified time interval.
 */
export async function withTimeoutRejection<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const sleep = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Timeout of ${timeoutMs} has passed and promise did not resolve`
          )
        ),
      timeoutMs
    )
  );
  return Promise.race([promise, sleep]) as Promise<T>;
}

export const decodeVestingId = (idEncoded: string): number => {
  const buf = Buffer.from(idEncoded, 'binary');
  return Number(buf.readBigUInt64LE(0));
};

export const getVestingAmountAvailable = (vestingSession: VestingSession) => {
  const {
    startTimestamp,
    initialReleaseAmount,
    totalAmount,
    cliffDuration,
    linearDuration
  } = vestingSession;
  const currentTime = Date.now(); // Convert to seconds
  const startTime = startTimestamp;
  const cliffEndTime = Number(startTime + cliffDuration);
  const linearEndTime = cliffEndTime + Number(linearDuration);
  let amountUnlocked = 0n;
  if (
    initialReleaseAmount > 0n &&
    currentTime >= startTime &&
    currentTime < cliffEndTime
  ) {
    // If there is an initial release amount, it is available immediately
    amountUnlocked = initialReleaseAmount;
  } else if (currentTime < cliffEndTime) {
    amountUnlocked = 0n;
  } else if (currentTime < linearEndTime) {
    const elapsed = currentTime - cliffEndTime;
    const totalLinearDuration = linearDuration;
    const linearReleaseAmount =
      ((totalAmount - initialReleaseAmount) * BigInt(elapsed)) /
      BigInt(totalLinearDuration);
    amountUnlocked = initialReleaseAmount + linearReleaseAmount;
  } else {
    amountUnlocked = vestingSession.totalAmount;
  }
  return amountUnlocked - vestingSession.claimedAmount;
};

export const randomInt = (max: number, min = 0) =>
  Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Converts a 256-bit BigInt to a binary string representation
 * This interprets the raw bytes as UTF-16 characters
 *
 * @param value - A BigInt containing up to 256 bits
 * @returns A string created from the binary representation
 */
export function u256ToString(value: bigint): string {
  // Ensure the value is in range for 256 bits
  const mask = (1n << 256n) - 1n;
  const normalizedValue = value & mask;

  // Create a buffer to hold the 32 bytes (256 bits)
  const buffer = new ArrayBuffer(32);
  const view = new DataView(buffer);

  // Write the BigInt to the buffer in little-endian format
  // (8 bytes at a time)
  for (let i = 0; i < 32; i += 8) {
    const chunk = (normalizedValue >> BigInt(i * 8)) & 0xffffffffffffffffn;

    // Write each byte of the chunk
    for (let j = 0; j < 8; j++) {
      const byte = Number((chunk >> BigInt(j * 8)) & 0xffn);
      view.setUint8(i + j, byte);
    }
  }

  // Convert to a string using UTF-16 encoding
  const uint16Array = new Uint16Array(buffer);
  let result = '';
  for (let i = 0; i < uint16Array.length; i++) {
    result += String.fromCharCode(uint16Array[i]);
  }

  return result;
}
