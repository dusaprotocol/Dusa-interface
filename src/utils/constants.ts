import { parseUnits } from '@dusalabs/sdk';
import { getAirdropMcap } from './storage';
import { MASSA } from './tokens';
import { Epoch, Role, Season } from './types';
import { baseClient } from './w3';

export const U256_MAX: bigint = 2n ** 256n - 1n;
export const MIN_ALLOWANCE_BEFORE_INCREASE: bigint = 2n ** 255n;
export const SCALE_OFFSET = 128;

// Time constants (in ms)
export const ONE_MINUTE = 60 * 1000;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;
export const ONE_WEEK = 7 * ONE_DAY;
export const ONE_MONTH = 30 * ONE_DAY;
export const ONE_PERIOD = 16_000;
export const PERIOD_PER_DAY = ONE_DAY / ONE_PERIOD;

// (changes here should be reflected in the backend)
export const TIME_BETWEEN_TICKS = 5 * ONE_MINUTE;
export const TICKS_PER_DAY = ONE_DAY / TIME_BETWEEN_TICKS;

const nodeState = await baseClient.getNodeStatus();
export const genesisTimestamp = nodeState.config.genesisTimestamp;
export const currentBlock = nodeState.lastSlot?.period;
export const minimalFee = parseUnits(
  nodeState.minimalFees || '0.1',
  MASSA.decimals
);

export const launchTimestamp = 1_713_182_400_000; // new Date("2024-04-15").getTime()

// Autopool constants
export const autopoolConfigs = [11, 12, 13, 21, 22, 23, 31, 32, 33] as const;
export type AutopoolConfig = (typeof autopoolConfigs)[number];

const frequencies = ['30 minutes', '1 hour', '6 hours'] as const;
const nbBins = [11, 19, 31] as const;
type Frequency = (typeof frequencies)[number];
type NbBins = (typeof nbBins)[number];
type AutopoolDescription = {
  nbBins: NbBins;
  frequency: Frequency;
};
export const autopoolDescriptions: AutopoolDescription[] = [
  { nbBins: 11, frequency: '30 minutes' },
  { nbBins: 11, frequency: '1 hour' },
  { nbBins: 11, frequency: '6 hours' },
  { nbBins: 19, frequency: '30 minutes' },
  { nbBins: 19, frequency: '1 hour' },
  { nbBins: 19, frequency: '6 hours' },
  { nbBins: 31, frequency: '30 minutes' },
  { nbBins: 31, frequency: '1 hour' },
  { nbBins: 31, frequency: '6 hours' }
];

const genesisEpoch: Epoch = {
  id: 0,
  from: new Date('2024-04-15T00:00:00Z'),
  to: new Date('2024-04-21T23:59:59Z')
};

// epoch 0 to 90, with special handling for epoch 73+ transition
export const epochDuration = 7 * ONE_DAY;
export const genesis = genesisEpoch.to.getTime();

// Helper function to calculate epoch dates with transition logic
export const calculateEpochDates = (
  epochId: number
): { from: Date; to: Date } => {
  if (epochId === 0) {
    // Genesis epoch
    return {
      from: genesisEpoch.from,
      to: genesisEpoch.to
    };
  } else if (epochId < 73) {
    // Regular epochs before transition (Monday to Sunday)
    return {
      from: new Date(genesis + (epochId - 1) * epochDuration),
      to: new Date(genesis + epochId * epochDuration - 1)
    };
  } else if (epochId === 73) {
    // Transition epoch: Monday to Wednesday only (3 days)
    const startDate = new Date(genesis + (epochId - 1) * epochDuration);
    const endDate = new Date(startDate.getTime() + 3 * ONE_DAY - 1);
    return {
      from: startDate,
      to: endDate
    };
  } else {
    // New cycle epochs (Thursday to Wednesday)
    // Calculate base date for epoch 74 (starts on Thursday after epoch 73 ends)
    const epoch73Start = new Date(genesis + 72 * epochDuration);
    const epoch74Start = new Date(epoch73Start.getTime() + 3 * ONE_DAY); // Thursday after epoch 73's Wednesday

    const epochsSince74 = epochId - 74;
    const startDate = new Date(
      epoch74Start.getTime() + epochsSince74 * epochDuration
    );
    const endDate = new Date(startDate.getTime() + epochDuration - 1);

    return {
      from: startDate,
      to: endDate
    };
  }
};

const elapsedWeeks = Math.floor((Date.now() - genesis) / epochDuration);
const numberOfEpochs = elapsedWeeks + 1;
export const everyEpochs: Epoch[] = [
  ...Array.from({ length: numberOfEpochs + 5 }, (_, i) => {
    // add 5 epochs buffer to avoid issues
    const { from, to } = calculateEpochDates(i);
    return {
      id: i,
      from,
      to
    };
  })
];

// past and current epochs (last 5)
export const epochs = everyEpochs
  .filter((epoch) => new Date() >= epoch.from)
  .slice(-5);

export const currentEpoch =
  epochs.find((epoch) => new Date() >= epoch.from && new Date() <= epoch.to) ||
  epochs[epochs.length - 1];
export const lastEpoch =
  epochs.find((epoch) => epoch.id === currentEpoch.id - 1) ||
  epochs[epochs.length - 2];
export const nextEpoch: Epoch = {
  id: currentEpoch.id + 1,
  from: new Date(currentEpoch.to.getTime() + 1),
  to: new Date(currentEpoch.to.getTime() + epochDuration)
};

// dusa / jelly seasons
export const seasons: Season[] = [
  {
    id: 0,
    from: new Date('2024-12-23T00:00:00Z'),
    to: new Date('2025-07-10T23:59:59Z'),
    claimId: 64
  }
];
export const currentSeason = seasons[seasons.length - 1];

export const roles: Role[] = [
  { name: 'DUSA AMBASSADOR', id: '1110937453658918952', boost: 1.35 },
  { name: 'LEGENDARY DUSER', id: '1023582914564341810', boost: 1.3 },
  { name: 'OG DUSER', id: '1090289346084610150', boost: 1.2 },
  { name: 'EARLY DUSER', id: '1119709035688632360', boost: 1.15 }
];

export const unknownURI = 'https://pngimg.com/d/question_mark_PNG99.png';

// Points
export const MAKER_MULTIPLIER = 4; // swap value multiplier
export const MCAP = 10_000_000;
export const SUPPLY = 100_000_000;
export const JELLY_VALUE = getAirdropMcap() / SUPPLY;

const POINTS_PROGRAM_LAUNCH = new Date('2024-04-12');
const weeksElapsed = Math.round(
  (Date.now() - POINTS_PROGRAM_LAUNCH.getTime()) / (7 * 24 * 60 * 60 * 1000)
);
export const WEEKLY_POINTS = 1_000_000;
export const WEEKLY_JELLY = 50_000;
export const WEEKLY_JELLY_AFTER_50 = 25_000;
export const POINTS_BY_JELLY_BEFORE_37 = 36 / 1.5; // for the 36 first epochs (24)
export const POINTS_BY_JELLY = WEEKLY_POINTS / WEEKLY_JELLY; // (24)
export const POINTS_BY_JELLY_AFTER_50 = WEEKLY_POINTS / WEEKLY_JELLY_AFTER_50;
export const POINT_VALUE = JELLY_VALUE / POINTS_BY_JELLY;
export const POINT_VALUE_AFTER_50 = JELLY_VALUE / POINTS_BY_JELLY_AFTER_50;

export const TOTAL_POINTS = weeksElapsed * WEEKLY_POINTS;

export const BLACKLIST = [
  'AU1Vy3NyCGaZe8r84C4J5bGuCVbcQfaSZMftWWNRZUSTBmLWsxmc',
  'AU1P3VLNRVcT5BT9Gax6ndB1AVvaHtfNnNKfYJx6quRRWPPbh57F',
  'AU1N5omXKidm4YQsiCP9fCw1NgxDKEwNruzcLRSeWfgRWHfXzQob'
  // 'AU12TGkYSv4ompus3yv3hRo5WiJJyoTQRLPmYWm5csRzDuFs9qVF1' removed from blacklist (30% of its points were given back)
];

export const tokenPledgeAddresses = [
  'AU18eePW7qY1rnF82Pxn4rXy1EctWo5bpTUScUyF2xsQJTAGFV6X' // test address
];

export const MAX_LOCK = 52 * 4;

// Lock duration constants for exact calendar calculations
export const MIN_LOCK_DAYS = 7; // exactly 7 days
export const MAX_LOCK_YEARS = 4; // exactly 4 years

export class ProtocolTimeLibrary {
  /// @dev Returns start of epoch based on current timestamp
  static epochStart(timestamp: number = Date.now()): number {
    return timestamp - (timestamp % ONE_WEEK);
  }

  /// @dev Returns start of next epoch / end of current epoch
  static epochNext(timestamp: number = Date.now()): number {
    return timestamp - (timestamp % ONE_WEEK) + ONE_WEEK;
  }

  /// @dev Returns start of voting window
  static epochVoteStart(timestamp: number = Date.now()): number {
    return timestamp - (timestamp % ONE_WEEK) + ONE_HOUR;
  }

  /// @dev Returns end of voting window / beginning of unrestricted voting window
  static epochVoteEnd(timestamp: number = Date.now()): number {
    return timestamp - (timestamp % ONE_WEEK) + ONE_WEEK - ONE_HOUR;
  }
}

export const WEEKLY_EMISSIONS = 38_000 + 1_000; // 38 de chez nous + 1 de fpom

// Hidden governance proposal IDs (duplicates or invalid proposals)
export const HIDDEN_GOVERNANCE_PROPOSALS = [6];
