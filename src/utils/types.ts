import { Token as _Token } from '@dusalabs/sdk';
import {
  Args,
  CallSCParams,
  DeserializedResult,
  Serializable
} from '@massalabs/massa-web3';

export class Token extends _Token {
  constructor(
    chainId: number,
    address: string,
    decimals: number,
    public readonly logoURI: string,
    public readonly symbol: string,
    public readonly name: string
  ) {
    super(chainId, address, decimals, symbol, name);
  }
}

export type TokenInfo = {
  token: Token;
  balance: bigint;
  price: number;
};

export type Bribe = {
  token: Token;
  amount: bigint;
};

export type Version = 'V1' | 'V2';

export interface Pool {
  token0: Token;
  token1: Token;
  binStep: number;
  pairAddress: string;
  version: Version;
}
export type BasePool = Omit<Pool, 'pairAddress' | 'version'>;
export type PoolWithAddress = Pool;

export interface PoolV2WithLO extends Pool {
  loSC: string;
}

export type PoolLiquidity = Pool & {
  amount0: bigint;
  amount1: bigint;
  fees0: bigint;
  fees1: bigint;
};

export interface Deposits {
  amount0: bigint;
  amount1: bigint;
}

export interface Bin {
  id: number;
  amount0: bigint;
  amount1: bigint;
  amountLBT: bigint;
  accToken0PerShare: bigint;
  accToken1PerShare: bigint;
  value: number;
}

export interface ClaimInfo {
  id: number;
  amounts: { amountX: bigint; amountY: bigint };
}

export interface Vault {
  address: string;
  bins: Bin[];
  type: number;
}

export enum LiquidityShape {
  // AUTONOMOUS,
  SPOT,
  CURVE,
  BID_ASK
  // WIDE
}

export interface Transaction {
  targetFunction: string;
  status: 'confirmed' | 'failed' | 'pending' | 'cancelled' | 'unknown';
  from: string;
  to: string;
  hash: string;
  timestamp: number;
  description: string;
}

export enum TimeWindow {
  Day = 1,
  Week = 7,
  Month = 30
}

export enum DayWindow {
  WEEK = 7,
  MONTH = 30,
  QUARTER = 90,
  HALF_YEAR = 180,
  YEAR = 365
}

export enum WeekWindow {
  QUARTER = 13,
  HALF_YEAR = 26,
  YEAR = 52
}

export enum NumberWindow {
  BASE = 20,
  MID = 50,
  ALL = 'ALL'
}

export type TWindow = TimeWindow | DayWindow | WeekWindow | NumberWindow;

export type Position =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top left'
  | 'top right'
  | 'bottom left'
  | 'bottom right'
  | 'left top'
  | 'left bottom'
  | 'right top'
  | 'right bottom';

// ensure `parameter` is of type `Args` and not `Array<number>`
export type ICallData = Omit<CallSCParams, 'func' | 'target'> & {
  targetFunction: string;
  targetAddress: string;
  parameter: Args;
};

export type Allowance = 'increase' | 'increaseMax';

export interface Proposal {
  id: number;
  title: string;
  description: string;
  forVotes: bigint;
  againstVotes: bigint;
  abstainVotes: bigint;
  timestamp: number;
  status:
    | 'active'
    | 'ended'
    | 'defeated'
    | 'succeeded'
    | 'queued'
    | 'expired'
    | 'executed';
}

export interface Epoch {
  id: number;
  from: Date;
  to: Date;
}

export interface Season extends Epoch {
  claimId: number;
}

export interface Role {
  id: string;
  name: string;
  boost: number;
}
export interface DiscordUser {
  id: string;
  username: string;
  role: string;
  avatar: string;
  global_name: string;
}

export interface GlobalLeaderboardItem {
  userAddress: string;
  points: number;
}

export const MassaUnits = {
  uMassa: 1n,
  mMassa: 1_000_000n,
  oneMassa: 1_000_000_000n
};

export type RefetchDrawerElement =
  | 'balances'
  | 'poolsOwn'
  | 'autoPoolsOwn'
  | 'dcas'
  | 'orders'
  | 'rolls'
  | 'locks';

export type VestingSession = {
  id: number;
  totalAmount: bigint;
  startTimestamp: bigint;
  claimedAmount: bigint;
  initialReleaseAmount: bigint;
  cliffDuration: bigint;
  linearDuration: bigint;
  tokenAddress: string;
};

export interface Lock {
  id: number;
  userAddress: string;
  amount: bigint;
  timestamp: number;
  permanent: boolean;
  votingPower: bigint;
}

export class LockSer implements Serializable<LockSer> {
  constructor(
    public amount: bigint = 0n,
    public end: bigint = 0n,
    public isPermanent: boolean = false
  ) {}

  serialize(): Uint8Array {
    const args = new Args()
      .addI128(this.amount)
      .addU64(this.end)
      .addBool(this.isPermanent)
      .serialize();
    return Uint8Array.from(args);
  }

  deserialize(
    buffer: Uint8Array,
    offset?: number
  ): DeserializedResult<LockSer> {
    const args = new Args(buffer, offset);
    this.amount = args.nextI128();
    this.end = args.nextU64();
    this.isPermanent = args.nextBool();
    return { instance: this, offset: args.getOffset() };
  }
}

export class Address implements Serializable<Address> {
  constructor(public value: string = '') {}

  serialize(): Uint8Array {
    const args = new Args().addString(this.value).serialize();
    return Uint8Array.from(args);
  }

  deserialize(
    buffer: Uint8Array,
    offset?: number
  ): DeserializedResult<Address> {
    const args = new Args(buffer, offset);
    this.value = args.nextString();
    return { instance: this, offset: args.offset };
  }
}
