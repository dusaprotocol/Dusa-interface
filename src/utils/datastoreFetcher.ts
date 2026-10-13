import {
  IERC20,
  IFactory,
  LimitOrder,
  ILBPair,
  FeeParameters,
  IBaseContract,
  LBPairInformation,
  LBPairReservesAndId,
  TokenAmount,
  IMulticall,
  Tx,
  parseUnits,
  Fraction,
  DCA,
  IVotingEscrow
} from '@dusalabs/sdk';
import {
  Args,
  ArrayTypes,
  bytesToStr,
  strToBytes,
  U256,
  U64,
  U8,
  type Provider,
  DeserializedResult,
  Serializable
} from '@massalabs/massa-web3';
import {
  CHAIN_ID,
  datastoreApi,
  dcaManagerSC,
  dcaManagerSCV2,
  factorySC,
  factoryV2SC,
  IS_BUILDNET,
  liquidityHelperSC,
  multicallSC,
  rewarderSC,
  STAKING_SC_ADDRESS,
  vaultManagerSC,
  voterSC,
  votingEscrowSC
} from './config';
import { VESTING_SC_ADDRESS } from './config';
import { AutopoolConfig, ONE_DAY, unknownURI, currentEpoch } from './constants';
import { calculateAmount } from './coreMethods';
import {
  cleanAddress,
  createKey,
  decodeVestingId,
  emptyBin,
  getBinValue,
  getTokenFromAddress,
  isAddressValid,
  printBigintIsh,
  sumBinAmounts
} from './methods';
import { JSONData } from './rewarderClasses';
import { DUSA_MAIN, MASSA, WMAS, tokens as _tokens } from './tokens';
import { toBI } from './transactionBuilder';
import {
  PoolLiquidity,
  Token,
  Bin,
  Deposits,
  ClaimInfo,
  Lock,
  LockSer,
  VestingSession,
  BasePool,
  Version,
  Pool,
  Address,
  Bribe
} from './types';
import { baseClient, baseClientSale, grpcClient, jsonClient } from './w3';

// GetLocksReturn structure from veDUSA contract
class GetLocksReturn implements Serializable<GetLocksReturn> {
  constructor(
    public tokenId: bigint = 0n,
    public votingPower: bigint = 0n
  ) {}

  serialize(): Uint8Array {
    return new Args()
      .addU64(this.tokenId)
      .addU256(this.votingPower)
      .serialize();
  }

  deserialize(
    buffer: Uint8Array,
    offset?: number
  ): DeserializedResult<GetLocksReturn> {
    const args = new Args(buffer, offset);
    this.tokenId = args.nextU64();
    this.votingPower = args.nextU256();
    return { instance: this, offset: args.getOffset() };
  }
}

// ==================================================== //
// ====               USER BALANCE                 ==== //
// ==================================================== //

export const fetchRollBalance = (account: string): Promise<number> =>
  jsonClient.client
    .getAddressInfo(account)
    .then((res) => res.candidate_roll_count);

export const fetchBalance = (account: string): Promise<bigint> =>
  baseClient
    .balanceOf([account], false)
    .then((r) => r[0].balance)
    .catch(() => 0n);

export const fetchAccountsBalance = async (
  accounts: Provider[]
): Promise<number[]> => {
  const addrs = accounts.map((a) => a.address).filter(Boolean);
  if (!addrs.length) return [];

  const uniq = Array.from(new Set(addrs));

  const raws = await Promise.all(
    uniq.map((a) => fetchBalance(a).catch(() => 0n))
  );

  const byAddr = new Map<string, number>(
    uniq.map((a, i) => [a, Number(new TokenAmount(WMAS, raws[i]).toFixed(2))])
  );

  return accounts.map((a) => (a.address ? (byAddr.get(a.address) ?? 0) : 0));
};

export const fetchTokenBalance = async (
  address: string,
  account: string,
  isFetchingForSale = false
): Promise<bigint> => {
  if (address === MASSA.address) return fetchBalance(account);
  else {
    const contract = new IERC20(
      address,
      isFetchingForSale ? baseClientSale : baseClient // to avoid massa node overload (maybe not useful on mainnet)
    );
    const res = contract.balanceOf(account).catch(() => 0n);
    return res;
  }
};

export const fetchAllTokensBalance = async (
  addresses: string[],
  account: string
): Promise<bigint[]> => {
  try {
    if (!addresses.length) return [];

    const promises = addresses.map((addr) => {
      if (!isAddressValid(addr) && addr !== MASSA.address)
        return Promise.resolve(0n);
      return fetchTokenBalance(addr, account).catch(() => 0n);
    });

    return await Promise.all(promises);
  } catch (err) {
    console.log('Failed to fetch all tokens balance:', addresses, err);
    return addresses.map(() => 0n);
  }
};

export const fetchUsersDUSABalance = async (
  accounts: string[]
): Promise<bigint[]> => {
  const contract = new IERC20(DUSA_MAIN.address, baseClient);
  const promises = accounts.map((acc) =>
    contract
      .balanceOf(acc)
      .then((res) => res || 0n)
      .catch(() => 0n)
  );
  return Promise.all(promises);
};

// ==================================================== //
// ====                 TOKEN INFO                 ==== //
// ==================================================== //

export const fetchTokenTotalSupply = async (address: string): Promise<bigint> =>
  new IERC20(address, baseClient).totalSupply();

export const fetchTokenInfo = async (address: string): Promise<Token> => {
  return new IBaseContract(address, baseClient)
    .extract(['NAME', 'SYMBOL', 'DECIMALS'])
    .then((res) => {
      if (!res[0]?.length || !res[1]?.length || !res[2]?.length)
        throw new Error('No token info found');

      const token: Token = {
        isNative: false,
        isToken: true,
        chainId: CHAIN_ID,
        equals: WMAS.equals,
        name: bytesToStr(res[0]),
        symbol: bytesToStr(res[1]),
        decimals: Number(U8.fromBytes(res[2])),
        logoURI: unknownURI,
        address
      };
      return token;
    });
};

export const fetchTokenFromAddress = (address: string): Promise<Token> => {
  try {
    return Promise.resolve(getTokenFromAddress(address));
  } catch {
    return fetchTokenInfo(address);
  }
};

export const getPairAddressTokens = async (pairAddress: string) =>
  new ILBPair(pairAddress, jsonClient) // tmp
    .extract(['TOKEN_X', 'TOKEN_Y'])
    .then((r) => {
      if (!r[0]?.length || !r[1]?.length) throw new Error();
      return [bytesToStr(r[0]), bytesToStr(r[1])];
    });

export const getTokensFromPairAddress = async (
  pairAddress: string
): Promise<Token[]> => {
  const pairAddressTokens = await getPairAddressTokens(pairAddress);
  return Promise.all(pairAddressTokens.map(fetchTokenFromAddress));
};

export const fetchPairFeeParameters = async (
  pairAddress: string
): Promise<FeeParameters> =>
  new ILBPair(pairAddress, baseClient).feeParameters();

export const getTokensSorted = async (
  _tokenA: string,
  _tokenB: string,
  _binStep: number,
  _version: Version
): Promise<{ token0: Token; token1: Token }> => {
  const pairAddress = await fetchPairAddress(
    _tokenA,
    _tokenB,
    _binStep,
    _version
  );
  const tokens = await getTokensFromPairAddress(pairAddress);
  // Verify that _tokenA and _tokenB are the same as the ones in the pair
  if (
    _tokenA !== tokens[0].address ||
    _tokenA !== tokens[1].address ||
    _tokenB !== tokens[0].address ||
    _tokenB !== tokens[1].address
  )
    throw new Error('Tokens do not match the pair');

  return { token0: tokens[0], token1: tokens[1] };
};

// ==================================================== //
// ====                  USER DCA                  ==== //
// ==================================================== //

// TODO: change TokenPath from Token[] to string[] when sdk is updated
export const fetchDCA = async (
  account: string,
  id: number
): Promise<DCA | undefined> => {
  const key = `D::${account}:${id}`;
  return new IBaseContract(id >= 24 ? dcaManagerSCV2 : dcaManagerSC, baseClient)
    .extract([key])
    .then((res) => {
      if (!res[0]) return;
      const args = new Args(res[0]);
      const amountEachDCA = args.nextU256();
      const interval = Number(args.nextU64());
      const nbOfDCA = Number(args.nextU64());
      const tokenPathStr: string[] = args.nextArray(ArrayTypes.STRING);
      const tokenPath: Token[] = tokenPathStr.map((address) =>
        getTokenFromAddress(address)
      );
      const threshold = Number(args.nextU32());
      const startTime = Number(args.nextU64());
      const endTime = Number(args.nextU64());

      return {
        id,
        amountEachDCA,
        interval,
        nbOfDCA,
        tokenPath,
        startTime,
        endTime,
        threshold
      };
    });
};

// ==================================================== //
// ====                 USER ORDERS                ==== //
// ==================================================== //

const fetchEveryOrderId = (
  address: string,
  limiteOrderSC: string
): Promise<number[]> =>
  fetchDatastore(limiteOrderSC, 'A::' + address).then((keys) =>
    keys.map((key) => Number(key.split(address)[1]))
  );

export const fetchActiveOrders = async (
  account: string,
  limiteOrderSC: string
): Promise<LimitOrder[]> => {
  const ids = await fetchEveryOrderId(account, limiteOrderSC);
  const bs = ids.map((id: number) => `A::${account}${id}`);

  return new IBaseContract(limiteOrderSC, baseClient)
    .extract(bs)
    .then((r) => {
      const orderReturned: LimitOrder[] = [];
      r.forEach((item, i) => {
        if (!item?.length) return;
        const order = new LimitOrder().deserialize(item).instance;
        // order. = ids[i];

        orderReturned.push(order);
      });
      return orderReturned;
    })
    .catch(() => []);
};

// ==================================================== //
// ====                  USER LOCKS                ==== //
// ==================================================== //

export const fetchEveryLockId = async (address: string): Promise<number[]> => {
  const votingEscrow = new IBaseContract(votingEscrowSC, baseClientSale);

  const keys = await fetchDatastore(
    votingEscrowSC,
    'ownerToNFTokenIdList::' + address
  );
  // const indexes = keys.map((r) => Number(r.split(address + argsDelimiter)[1]));
  const ids = await votingEscrow
    .extract(keys)
    .then((res) =>
      res.map((r) => (r?.length ? U64.fromBytes(r) : 0n)).filter(Boolean)
    );

  // const count = await votingEscrow
  //   .extract(['ownerToNFTokenCount::' + address])
  //   .then((res) => (res[0] ? U64.fromBytes(res[0]) : 0n));
  // console.log('count', count);
  // if (!count) return [];

  // const keys = Array.from(
  //   { length: Number(count) },
  //   (_, i) => `ownerToNFTokenIdList::${address}${argsDelimiter}${i}`
  // );
  return ids.map(Number);
};

export const fetchLocks = async (account: string): Promise<Lock[]> => {
  // return []; // TEMP - Réactivé pour permettre la récupération des locks

  console.time('fetchLocks');
  try {
    // Use the contract's getLocks function directly
    const res = await new IBaseContract(votingEscrowSC, baseClientSale)
      .read({
        targetFunction: 'getLocks',
        parameter: new Args().addString(account).serialize()
      })
      .then((res) => {
        const args = new Args(res.value);
        const locksData = args.nextSerializableObjectArray(GetLocksReturn);

        // Need to get lock details for amount, timestamp, and permanent status
        const lockIds = locksData.map((lockData) => Number(lockData.tokenId));
        const bs = lockIds.map((id: number) => `locked::${id}`);

        return new IBaseContract(votingEscrowSC, baseClientSale)
          .extract(bs)
          .then((r) => {
            const locks: LockSer[] = [];
            r.forEach((item) => {
              if (!item?.length) return;
              const lock = new LockSer().deserialize(item).instance;
              locks.push(lock);
            });

            const parsedLocks: Lock[] = locks.map((lock, i) => ({
              amount: lock.amount,
              id: Number(locksData[i].tokenId),
              timestamp: Number(lock.end),
              userAddress: account,
              permanent: lock.isPermanent,
              votingPower: locksData[i].votingPower
            }));
            return parsedLocks;
          });
      })
      .catch((err) => {
        console.log(
          'Failed to fetch locks via getLocks, falling back to old method:',
          err
        );
        // Fallback to old method if getLocks fails
        return fetchLocksOldMethod(account);
      });

    console.timeEnd('fetchLocks');
    return res;
  } catch (err) {
    console.log('Failed to fetch locks:', err);
    console.timeEnd('fetchLocks');
    return [];
  }
};

// Fallback method using the old implementation
const fetchLocksOldMethod = async (account: string): Promise<Lock[]> => {
  console.time('locksIds');
  const ids = await fetchEveryLockId(account);
  console.timeEnd('locksIds');
  const bs = ids.map((id: number) => `locked::${id}`);
  console.time('extract');
  const res = await new IBaseContract(votingEscrowSC, baseClientSale)
    .extract(bs)
    .then((r) => {
      const locks: LockSer[] = [];
      r.forEach((item) => {
        if (!item?.length) return;
        const lock = new LockSer().deserialize(item).instance;
        locks.push(lock);
      });
      const parsedLocks: Lock[] = locks.map((lock, i) => ({
        amount: lock.amount,
        id: ids[i],
        timestamp: Number(lock.end),
        userAddress: account,
        permanent: lock.isPermanent,
        votingPower: 0n // Will be fetched separately if needed
      }));
      return parsedLocks;
    })
    .catch((err) => {
      console.log('Failed to fetch locks:', err);
      return [];
    });
  console.timeEnd('extract');
  return res;
};

export const fetchLockVotingPower = async (id: number): Promise<bigint> => {
  const res = await new IVotingEscrow(
    votingEscrowSC,
    baseClientSale
  ).balanceOfNFT(id);
  // console.log('fetchLockVotingPower', id, res);
  return res;
};

export const fetchLocksLastVoted = async (ids: number[]): Promise<number[]> => {
  const bs = ids.map((id: number) => `lastVoted::${id}`);
  return new IBaseContract(voterSC, baseClientSale)
    .extract(bs)
    .then((r) => {
      const lastVoted: number[] = [];
      r.forEach((item) => {
        if (!item?.length) return;
        lastVoted.push(Number(U64.fromBytes(item)));
      });
      return lastVoted;
    })
    .catch((err) => {
      console.log('Failed to fetch locks last voted:', err);
      return [];
    });
};

export const fetchLocksVotingPower = async (
  ids: number[]
): Promise<bigint[]> => {
  const txs: Tx[] = ids.map(
    (id) =>
      new Tx(
        'balanceOfNFT',
        Uint8Array.from(new Args().addU64(BigInt(id)).serialize()),
        votingEscrowSC
      )
  );

  return new IMulticall(multicallSC, baseClientSale)
    .aggregateMulticall(txs)
    .then((res) => {
      const bs = new Args(res.value);
      return Array.from({ length: txs.length }).map((_) =>
        U256.fromBytes(bs.nextUint8Array())
      );
    })
    .catch((err) => {
      console.log('Failed to fetch locks voting power:', err);
      return [];
    });
};

export const fetchTotalVotingPower = async (): Promise<bigint> => {
  return new IVotingEscrow(votingEscrowSC, baseClientSale).totalSupply();
};

export const fetchAllUsersWithLocks = async (): Promise<string[]> => {
  // Fetch the last tokenId (not totalSupply which is veDUSA balance)
  const lastTokenIdRes = await new IBaseContract(votingEscrowSC, baseClientSale)
    .extract(['tokenId'])
    .then((res) => (res[0]?.length ? U64.fromBytes(res[0]) : 0n));

  const lastTokenId = Number(lastTokenIdRes);
  if (lastTokenId === 0) return [];

  // Get all lock owners by fetching NFT owner for each ID (NFT IDs start from 1)
  const keys: string[] = [];
  for (let i = 1; i <= lastTokenId; i++) {
    keys.push(`idToOwner::${i}`);
  }

  const results = await new IBaseContract(votingEscrowSC, baseClientSale)
    .extract(keys)
    .catch(() => []);

  const owners = new Set<string>();
  results.forEach((result) => {
    if (result?.length) {
      const owner = bytesToStr(result).split('\x00\x00\x00')[1];

      if (owner && isAddressValid(owner)) {
        owners.add(owner);
      }
    }
  });

  return Array.from(owners);
};

export const fetchAllUsersLocks = async (): Promise<
  { userAddress: string; locks: Lock[] }[]
> => {
  const users = await fetchAllUsersWithLocks();
  console.log({ users });

  const userLocks = await Promise.all(
    users.map(async (userAddress) => {
      const locks = await fetchLocks(userAddress).catch(() => []);
      return { userAddress, locks };
    })
  );

  return userLocks.filter((item) => item.locks.length > 0);
};

export const fetchAllUsersVotingPower = async (): Promise<
  { userAddress: string; totalVotingPower: bigint; locks: Lock[] }[]
> => {
  const userLocks = await fetchAllUsersLocks();
  console.log({ userLocks });

  const userVotingPowers = await Promise.all(
    userLocks.map(async ({ userAddress, locks }) => {
      const votingPowers = await Promise.all(
        locks.map((lock) => fetchLockVotingPower(lock.id).catch(() => 0n))
      );

      const totalVotingPower = votingPowers.reduce(
        (sum, power) => sum + power,
        0n
      );

      return { userAddress, totalVotingPower, locks };
    })
  );

  return userVotingPowers.sort((a, b) => {
    // Sort by voting power descending
    if (a.totalVotingPower > b.totalVotingPower) return -1;
    if (a.totalVotingPower < b.totalVotingPower) return 1;
    return 0;
  });
};

export const fetchLockVoteDetails = async (
  lockIds: number[]
): Promise<
  {
    lockId: number;
    pools: string[];
    weights: Map<string, bigint>;
    lastVoted: number;
    usedWeight: bigint;
  }[]
> => {
  try {
    const results = [];

    for (const lockId of lockIds) {
      // Fetch poolVote (comma-separated list of pool addresses)
      const poolVoteKey = `poolVote::${lockId}`;
      const poolVoteData = await new IBaseContract(voterSC, baseClientSale)
        .extract([poolVoteKey])
        .then((res) => (res[0] ? new TextDecoder().decode(res[0]) : ''));

      const pools = poolVoteData
        ? poolVoteData.split(',').filter((p) => p.length > 0)
        : [];

      // Fetch vote weights for each pool
      const weights = new Map<string, bigint>();
      for (const pool of pools) {
        const voteKey = `votes::${lockId}${argsDelimiter}${pool}`;
        try {
          const weight = await new IBaseContract(voterSC, baseClientSale)
            .extract([voteKey])
            .then((res) => (res[0] ? U256.fromBytes(res[0]) : 0n));
          weights.set(pool, weight);
        } catch (err) {
          console.log(`Failed to fetch weight for ${lockId}-${pool}:`, err);
          weights.set(pool, 0n);
        }
      }

      // Fetch usedWeights
      const usedWeightKey = `usedWeights::${lockId}`;
      const usedWeight = await new IBaseContract(voterSC, baseClientSale)
        .extract([usedWeightKey])
        .then((res) => (res[0] ? U256.fromBytes(res[0]) : 0n))
        .catch(() => 0n);

      // Fetch lastVoted timestamp
      const lastVotedKey = `lastVoted::${lockId}`;
      const lastVoted = await new IBaseContract(voterSC, baseClientSale)
        .extract([lastVotedKey])
        .then((res) => (res[0] ? Number(U64.fromBytes(res[0])) : 0))
        .catch(() => 0);

      results.push({
        lockId,
        pools,
        weights,
        lastVoted,
        usedWeight
      });
    }

    return results;
  } catch (err) {
    console.log('Failed to fetch lock vote details:', err);
    return [];
  }
};

export const fetchRebaseAPR = async () => {
  const veSupply = await fetchTotalVotingPower();
  const dusaSupply = await fetchTokenTotalSupply(DUSA_MAIN.address);
  const emissions = 15_000_000n;
  return ((veSupply / dusaSupply) ** 3n * emissions) / 2n;
};

export const fetchBribes = async (
  poolAddress: string,
  allDatastoreKeys?: string[],
  epoch = currentEpoch.id
): Promise<Bribe[]> => {
  try {
    const prefix = 'bribes::';
    const allKeys =
      allDatastoreKeys?.filter((key) => key.startsWith(prefix)) ||
      (await fetchDatastore(voterSC, prefix));

    const epochStr = epoch.toString();
    const poolBribeKeys = allKeys.filter((key) => {
      // Remove 'bribes::' prefix and split by delimiter
      const keyWithoutPrefix = key.replace(prefix, '');
      const parts = keyWithoutPrefix.split(argsDelimiter);

      if (parts.length !== 4) return false;

      const [poolAddr, epoch] = parts;
      return poolAddr === poolAddress && epoch === epochStr;
    });

    if (!poolBribeKeys.length) return [];

    // Fetch bribe amounts from voter contract
    const contract = new IBaseContract(voterSC, baseClientSale);
    const bribeData = await contract.extract(poolBribeKeys).catch(() => []);

    // Group bribes by token address and sum amounts
    const bribeMap = new Map<string, bigint>();

    poolBribeKeys.forEach((key, index) => {
      const data = bribeData[index];
      if (!data?.length) return;

      // Parse the U256 amount from storage
      const amount = new Args(data).nextU256();
      if (amount === 0n) return;

      // Extract token address from key
      const keyWithoutPrefix = key.replace(prefix, '');
      const parts = keyWithoutPrefix.split(argsDelimiter);
      if (parts.length !== 4) return;

      const tokenAddress = parts[2];
      const existingAmount = bribeMap.get(tokenAddress) || 0n;
      bribeMap.set(tokenAddress, existingAmount + amount);
    });

    // Convert to Bribe array with token info
    const bribes: Bribe[] = [];
    for (const [tokenAddress, totalAmount] of bribeMap) {
      try {
        const token = await fetchTokenFromAddress(tokenAddress);
        bribes.push({
          token,
          amount: totalAmount
        });
      } catch (err) {
        console.warn(
          'Failed to fetch token info for bribe:',
          tokenAddress,
          err
        );
      }
    }

    return bribes;
  } catch (err) {
    console.error('Failed to fetch bribes:', poolAddress, err);
    return [];
  }
};

export const fetchPoolWeight = async (poolAddress: string): Promise<bigint> => {
  return new IBaseContract(voterSC, baseClientSale)
    .extract(['weights::' + poolAddress])
    .then((res) => {
      if (!res[0]?.length) return 0n;
      return U256.fromBytes(res[0]);
    });
};

export const fetchGlobalWeight = async (): Promise<bigint> => {
  return new IBaseContract(voterSC, baseClientSale)
    .extract(['totalWeight'])
    .then((res) => {
      if (!res[0]?.length) return 0n;
      return U256.fromBytes(res[0]);
    });
};

interface Delegate {
  tokenId: number;
  address: string;
}
export const fetchDelegates = async (
  allDatastoreKeys?: string[]
): Promise<Delegate[]> => {
  const veContract = new IBaseContract(votingEscrowSC, baseClientSale);
  const prefix = '_delegates::';
  const delegateKeys =
    allDatastoreKeys?.filter((key) => key.startsWith(prefix)) ||
    (await fetchDatastore(voterSC, prefix));
  const ids = await veContract
    .extract(delegateKeys)
    .then((res) =>
      res.map((r) => (r ? Number(U64.fromBytes(r)) : 0)).filter((id) => id > 0)
    );
  const ownerKeys = ids.map((id) => `idToOwner::${id}`);
  return veContract.extract(ownerKeys).then((res) =>
    res.map((r, i) => {
      if (!r?.length) throw new Error('No delegate found');
      return {
        tokenId: Number(ids[i]),
        address: new Address().deserialize(r).instance.value
      };
    })
  );
};

export const fetchDelegate = async (tokenId: number): Promise<string> => {
  const delegateId = await new IBaseContract(votingEscrowSC, baseClientSale)
    .extract([`_delegates::${tokenId}`])
    .then((res) => (res[0]?.length ? Number(U64.fromBytes(res[0])) : 0));
  if (!delegateId) throw new Error('No delegate found');
  return new IBaseContract(votingEscrowSC, baseClientSale)
    .extract([`idToOwner::${delegateId}`])
    .then((res) => {
      if (!res[0]?.length) throw new Error('No delegate found');
      return new Address().deserialize(res[0]).instance.value;
    });
};

interface Holding {
  count: number;
  address: string;
  // tokenIds: number[];
}
export const fetchHoldings = async (
  allDatastoreKeys?: string[]
): Promise<Holding[]> => {
  const veContract = new IBaseContract(votingEscrowSC, baseClientSale);
  const prefix = 'ownerToNFTokenCount::';
  const holdingKeys =
    allDatastoreKeys?.filter((key) => key.startsWith(prefix)) ||
    (await fetchDatastore(voterSC, prefix));
  const counts = await veContract
    .extract(holdingKeys)
    .then((res) =>
      res.map((r) => (r ? Number(U64.fromBytes(r)) : 0)).filter((id) => id > 0)
    );

  return holdingKeys.map((key, i) => ({
    count: counts[i],
    address: key.split(prefix)[1]
  }));
};

// ==================================================== //
// ====                   FACTORY                  ==== //
// ==================================================== //

export const fetchPoolVersion = async (
  token0: string,
  token1: string,
  binStep: number
): Promise<Version> => {
  const [tokenA, tokenB] =
    token0 < token1 ? [token0, token1] : [token1, token0];
  const key = 'PAIR_INFORMATION::' + createKey(tokenA, tokenB, binStep);

  try {
    // Try V2 first
    const resV2 = await new IFactory(factoryV2SC, baseClientSale).extract([
      key
    ]);
    if (resV2[0]?.length) return 'V2';
  } catch {
    // Ignore V2 error and try V1
  }

  try {
    // Try V1
    const resV1 = await new IFactory(factorySC, baseClientSale).extract([key]);
    if (resV1[0]?.length) return 'V1';
  } catch {
    // Ignore V1 error
  }

  throw new Error('Pool not found in any factory version');
};

export const fetchPoolAddress = (pool: Omit<Pool, 'pairAddress'>) =>
  fetchPairAddress(
    pool.token0.address,
    pool.token1.address,
    pool.binStep,
    pool.version
  );
export const fetchPairAddress = (
  token0: string,
  token1: string,
  binStep: number,
  version: Version
): Promise<string> =>
  (version === 'V2' ? getLBPairInformationOptiV2 : getLBPairInformationOptiV1)(
    cleanAddress(token0),
    cleanAddress(token1),
    binStep
  ).then((res) => res.LBPair);

type GetLBPairInformation = typeof IFactory.prototype.getLBPairInformation;
const getLBPairInformationOptiV1: GetLBPairInformation = async (...params) => {
  const [token0, token1, binStep] = params;
  if (!token0 || !token1)
    throw new Error('Invalid token address', { cause: { token0, token1 } });
  const [tokenA, tokenB] =
    token0 < token1 ? [token0, token1] : [token1, token0];
  const key = 'PAIR_INFORMATION::' + createKey(tokenA, tokenB, binStep);
  const res = await new IFactory(factorySC, baseClient).extract([key]);
  if (!res[0]?.length)
    throw new Error('No pair information found', { cause: key });
  return new LBPairInformation().deserialize(res[0]).instance;
};
const getLBPairInformationOptiV2: GetLBPairInformation = async (...params) => {
  const [token0, token1, binStep] = params;
  if (!token0 || !token1)
    throw new Error('Invalid token address', { cause: { token0, token1 } });
  const [tokenA, tokenB] =
    token0 < token1 ? [token0, token1] : [token1, token0];
  const key = 'PAIR_INFORMATION::' + createKey(tokenA, tokenB, binStep);
  const res = await new IFactory(factoryV2SC, baseClientSale).extract([key]);
  if (!res[0]?.length)
    throw new Error('No pair information found', { cause: key });
  return new LBPairInformation().deserialize(res[0]).instance;
};

export const fetchPairBinSteps = async (
  token0: string,
  token1: string
): Promise<number[]> => {
  const v1Prom = new IFactory(factorySC, baseClientSale)
    .getAvailableLBPairBinSteps(cleanAddress(token0), cleanAddress(token1))
    .catch(() => []);
  const v2Prom = new IFactory(factoryV2SC, baseClientSale)
    .getAvailableLBPairBinSteps(cleanAddress(token1), cleanAddress(token0))
    .catch(() => []);
  return Promise.all([v1Prom, v2Prom]).then((res) => res.flat());
};

export const fetchPairBinStepsV2Only = async (
  token0: string,
  token1: string
): Promise<number[]> => {
  const v2Prom = new IFactory(factoryV2SC, baseClient)
    .getAvailableLBPairBinSteps(cleanAddress(token1), cleanAddress(token0))
    .catch(() => []);
  return v2Prom;
};

export const fetchPairBinStep = (token0: string, token1: string) =>
  fetchPairBinSteps(token0, token1).then((res) => {
    if (!res.length) return 0;
    let min = res[0];
    for (let i = 1; i < res.length; i++) {
      if (res[i] < min) min = res[i];
    }
    return min;
  });

export const fetchQuoteAssets = (): Promise<Token[]> =>
  new IBaseContract(factoryV2SC, baseClient)
    .extract(['QUOTE_ASSETS'])
    .then((res) => {
      if (!res[0]?.length) return [];
      const addresses = bytesToStr(res[0])
        .split(':')
        .filter((a) => a);
      return Promise.all(addresses.map((a) => fetchTokenFromAddress(a)));
    });

// ==================================================== //
// ====              USER LIQUIDITY                ==== //
// ==================================================== //

/**
 * Fetches the liquidity fees of a given address and pool
 * @param poolAddress
 * @param account
 * @returns
 */
export const fetchUserLiquidityFees = async (
  poolAddress: string,
  account: string,
  bins: number[]
): Promise<Deposits> => {
  const numBins = bins.length;
  const batchSize = 100; // can't fetch all fees at once
  const feesPromises = [];
  for (let i = 0; i < numBins; i += batchSize) {
    const batch = bins.slice(i, i + batchSize);
    const binIds = batch.map((id) => id);
    const promise = fetchPendingFees(poolAddress, account, binIds);
    feesPromises.push(promise);
  }
  const feesResults = await Promise.all(feesPromises);
  const fees = feesResults.reduce(
    (acc, curr) => {
      acc.amount0 += curr.amount0;
      acc.amount1 += curr.amount1;
      return acc;
    },
    { amount0: 0n, amount1: 0n }
  );

  return fees;
};

/**
 * Fetches the bins of a given address and account
 * @param userAddress - The account to fetch the bins from
 * @param poolAddress - The address of the pool
 * @param token0 - The first token
 * @param token1 - The second token
 * @param binStep - The bin step
 * @returns - An array of bins
 */
export const fetchUserLiquidityBins = async (
  userAddress: string,
  poolAddress: string,
  token0: Token,
  token1: Token,
  binStep: number
): Promise<Bin[]> => {
  const ids = await new ILBPair(poolAddress, baseClientSale).getUserBinIds(
    userAddress
  );
  if (!ids.length) return [];

  const entryPromises: Promise<Uint8Array[]>[] = [];
  const batchSize = 1000; // can't fetch all bins at once
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    const bs = batchIds.flatMap((id) => [
      `bin::${id}`,
      `balances::${id}:${userAddress}`,
      `total_supplies::${id}`
    ]);
    if (i + batchSize >= ids.length) {
      bs.push('PAIR_INFORMATION');
    }
    entryPromises.push(
      new IBaseContract(poolAddress, baseClientSale).extract(bs)
    );
  }

  const batchResults = await Promise.all(entryPromises);
  const entries = batchResults.flat();

  const activeIdRes = entries.pop();
  if (!activeIdRes?.length) {
    console.error('No pair information found');
    return [];
  }
  const activeId = Number(new Args(activeIdRes).nextU32());

  const bins: Bin[] = [];
  for (let i = 0; i < entries.length; i += 3) {
    const [resBin, resBalance, resSupply] = [
      entries[i],
      entries[i + 1],
      entries[i + 2]
    ].map((e) => e);

    if (!resBin || !resBalance || !resSupply) {
      bins.push({
        ...emptyBin,
        id: ids[i / 3]
      });
      continue;
    }

    const returnValueBin = new Args(resBin);
    const totalAmount0 = returnValueBin.nextU256();
    const totalAmount1 = returnValueBin.nextU256();
    const accToken0PerShare = returnValueBin.nextU256();
    const accToken1PerShare = returnValueBin.nextU256();

    const lbTokenAmount = new Args(resBalance).nextU256();
    if (lbTokenAmount === 0n) continue; // push empty bin?

    const totalLBT = new Args(resSupply).nextU256();
    const amount0 = (lbTokenAmount * totalAmount0) / totalLBT;
    const amount1 = (lbTokenAmount * totalAmount1) / totalLBT;
    const value = getBinValue(
      token0,
      token1,
      amount0,
      amount1,
      activeId,
      binStep
    );

    bins.push({
      id: ids[i / 3],
      amount0,
      amount1,
      amountLBT: lbTokenAmount,
      accToken0PerShare,
      accToken1PerShare,
      value
    });
  }

  return bins;
};

// ==================================================== //
// ====                     AL                     ==== //
// ==================================================== //

export const fetchVaultSC = async (
  token0Address: string,
  token1Address: string,
  type: AutopoolConfig
): Promise<string> => {
  const key = 'vaults::' + token0Address + token1Address + type.toString();
  return new IBaseContract(vaultManagerSC, baseClient)
    .extract([key])
    .then((res) => {
      const data = res[0];
      if (!data?.length) throw new Error('Address not found');

      return bytesToStr(data);
    });
};

export const fetchStratSC = async (vaultAddress: string): Promise<string> => {
  return new IBaseContract(vaultAddress, baseClient)
    .extract(['STRATEGY'])
    .then((res) => {
      const data = res[0];
      if (!data?.length) throw new Error('Address not found');

      return bytesToStr(data);
    });
};

// ==================================================== //
// ====                    FEES                    ==== //
// ==================================================== //

export const fetchPendingFees = (
  address: string,
  account: string,
  ids: number[]
): Promise<Deposits> =>
  new ILBPair(address, baseClient).pendingFees(account, ids);

export const fetchPendingFeesIds = async (
  address: string,
  account: string,
  bins: Bin[]
): Promise<ClaimInfo[]> => {
  const promises: Promise<(Uint8Array | null)[]>[] = [];
  const batchSize = 1000;

  for (let i = 0; i < bins.length; i += batchSize) {
    const batchIds = bins.slice(i, i + batchSize).map((bin) => bin.id);
    const bs = batchIds.map((id: number) =>
      strToBytes('accrued_debts::' + account + ':' + id)
    );
    promises.push(baseClient.readStorage(address, bs));
  }

  const batches = await Promise.all(promises);

  const results: ClaimInfo[] = [];
  let globalIndex = 0;
  for (const batch of batches) {
    for (let j = 0; j < batch.length; j++, globalIndex++) {
      const entry = batch[j];
      const bin = bins[globalIndex];
      if (!entry?.length || !bin) continue;

      const args = new Args(entry);
      const debtX = args.nextU256();
      const debtY = args.nextU256();

      const amountX = calculateAmount(
        bin.accToken0PerShare,
        bin.amountLBT,
        debtX
      );
      const amountY = calculateAmount(
        bin.accToken1PerShare,
        bin.amountLBT,
        debtY
      );

      if (amountX > 0n || amountY > 0n) {
        results.push({
          id: bin.id,
          amounts: { amountX, amountY }
        });
      }
    }
  }

  return results;
};

// ==================================================== //
// ====               PAIR INFORMATION             ==== //
// ==================================================== //

// new ILBPair(poolAddress, baseClient).getReservesAndId()
export const fetchPairInformationOpti = (
  poolAddress: string
): Promise<LBPairReservesAndId> =>
  new ILBPair(poolAddress, baseClientSale)
    .extract(['PAIR_INFORMATION'])
    .then((res) => {
      if (!res[0]?.length) throw new Error('No pair information found');
      const args = new Args(res[0]);
      const activeId = Number(args.nextU32());
      const reserveX = args.nextU256();
      const reserveY = args.nextU256();
      const feesX = { total: args.nextU256(), protocol: args.nextU256() };
      const feesY = { total: args.nextU256(), protocol: args.nextU256() };
      return { activeId, reserveX, reserveY, feesX, feesY };
    });

export const fetchAllBinsId = async (address: string): Promise<number[]> => {
  const filterPrefix = 'bin::';
  const url = `${datastoreApi}/datastore-keys?address=${address}&prefix=${filterPrefix}`;
  try {
    let res = [];
    if (IS_BUILDNET)
      res = await jsonClient.getStorageKeys(address, filterPrefix);
    else res = await grpcClient.getStorageKeys(address, filterPrefix);
    const keys = res.map((key) => String.fromCharCode(...key));
    return keys.map((key: string) => Number(key.split(filterPrefix)[1]));
  } catch (e) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.map((key: string) => Number(key.split('bin::')[1]));
    } catch (ee) {
      console.log('Failed to fetch all bins id:', address, e, url);
      return [];
    }
  }
};

// ==================================================== //
// ====                  REWARDER                  ==== //
// ==================================================== //

export const fetchClaimedAmount = async (
  marketAddress: string,
  epoch: bigint,
  userAddress: string,
  tokenAddress: string
): Promise<bigint> => {
  const contract = new IBaseContract(rewarderSC, baseClient);
  const args = new Args()
    .addString(marketAddress)
    .addU64(epoch)
    .addString(userAddress)
    .addString(tokenAddress);
  const res = await contract.read({
    targetFunction: 'getReleasedId',
    parameter: args.serialize()
  });
  const releasedId = res.value;
  return contract.extract(['RELEASED::' + releasedId]).then((r) => {
    const data = r[0];
    if (!data?.length) return 0n;

    const amount = new Args(data).nextU256();
    return amount;
  });
};

export const fetchClaimedAmountJSON = async (
  marketAddress: string,
  epoch: bigint,
  userAddress: string,
  tokenAddress: string,
  jsonUrl: string
): Promise<bigint> => {
  try {
    // Fetch JSON data
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }
    const jsonData: JSONData = await response.json();

    const tt = getTokenFromAddress(tokenAddress);
    console.log(marketAddress.replace('vote-', ''), tt.address);

    const markets = jsonData.markets.filter(
      (m) => m.address === marketAddress && BigInt(m.epoch) === epoch
    );
    if (!markets.length) return 0n;

    // only one entry per market/token
    const reward = markets.find((m) => m.rewards[0].address === tokenAddress)
      ?.rewards[0];
    if (!reward) return 0n;

    const user = reward.users.find((u) => u.address === userAddress);
    if (!user) console.log('User not found');
    if (!user) return 0n;

    console.log(printBigintIsh(tt, user.amount), tt.symbol);

    return BigInt(user.amount);
  } catch (err) {
    console.error('Failed to fetch claimed amount from JSON:', err);
    return 0n;
  }
};

// ==================================================== //
// ====                     MISC                   ==== //
// ==================================================== //

export const fetchDatastore = (
  address: string,
  filterPrefix?: string
): Promise<string[]> =>
  baseClient.getStorageKeys(address, filterPrefix, false).then((res) => {
    const keys = res.map((key) => String.fromCharCode(...key));
    return keys.filter((key) =>
      filterPrefix ? key.startsWith(filterPrefix) : true
    );
  });

export const fetchStorageDatas = async (
  address: string,
  storageName: string[],
  typesStorage: string[]
) => {
  new IBaseContract(address, baseClient).extract(storageName).then((res) => {
    storageName.forEach((name, i) => {
      if (!res[i]?.length) {
        console.error(`No data found for ${name}`);
        return;
      }
      if (typesStorage[i] === 'string') {
        const data = bytesToStr(res[i]);
        console.log(`${name}:`, data);
        return;
      }
      if (typesStorage[i] === 'u256') {
        const data = new Args(res[i]).nextU256();
        console.log(`${name}:`, data);
        return;
      }
      if (typesStorage[i] === 'u64') {
        const data = new Args(res[i]).nextU64();
        console.log(`${name}:`, data);
        return;
      }
    });
  });
};

export const argsDelimiter = ';?!';

// ==================================================== //

/**
 *
 * @param token0 - The first token
 * @param token1 - The second token
 * @param address - The address of the pool
 * @returns - An array of bins
 */
export const fetchBins = async (
  token0: Token,
  token1: Token,
  address: string,
  _ids?: number[]
): Promise<Bin[]> => {
  console.time('fetchBins');
  const ids = _ids || (await fetchAllBinsId(address));
  const bs = ids.flatMap((id) => [`bin::${id}`, `total_supplies::${id}`]);
  bs.push('FEES_PARAMETERS');
  bs.push('PAIR_INFORMATION');

  const result = await new IBaseContract(address, baseClient)
    .extract(bs)
    .then((entries) => {
      const activeIdRes = entries.pop();
      const binStepRes = entries.pop();
      const errorSuffix = `${token0.symbol}-${token1.symbol}`;
      if (!activeIdRes?.length || !binStepRes?.length)
        throw new Error('No pair information found', { cause: errorSuffix });
      const activeId = Number(new Args(activeIdRes).nextU32());
      const binStep = Number(new Args(binStepRes).nextU32());

      const res: Bin[] = [];

      entries.forEach((entry, i) => {
        if (i % 2 !== 0) return; // skip total_supplies::id
        if (!entry?.length) {
          res.push({
            ...emptyBin,
            id: ids[i / 2]
          });
          return;
        }

        const returnValueBin = new Args(entry);
        const amount0 = returnValueBin.nextU256();
        const amount1 = returnValueBin.nextU256();
        const accToken0PerShare = returnValueBin.nextU256();
        const accToken1PerShare = returnValueBin.nextU256();
        if (!amount0 && !amount1) return;

        const resSupply = entries[i + 1];
        if (!resSupply) return;

        const returnValueSupply = new Args(resSupply);
        const amountLBT = returnValueSupply.nextU256();

        const value = getBinValue(
          token0,
          token1,
          amount0,
          amount1,
          activeId,
          binStep
        );
        res.push({
          amount0,
          amount1,
          amountLBT,
          id: ids[i / 2],
          accToken0PerShare,
          accToken1PerShare,
          value
        });
      });

      return res;
    });
  console.timeEnd('fetchBins');
  return result;
};

export const fetchDepth = async (
  poolAddress: string,
  binStep: number,
  activeBin: number,
  depth: number
) => {
  const binsToMovePrice = Math.ceil(depth / binStep);
  const startBin = activeBin - binsToMovePrice + 1;
  const endBin = activeBin + binsToMovePrice;

  const reserves = await new IBaseContract(liquidityHelperSC, baseClient)
    .read({
      targetFunction: 'getDepth',
      parameter: new Args()
        .addU32(toBI(startBin))
        .addU32(toBI(endBin))
        .addString(poolAddress)
        .serialize()
    })
    .then((r) => {
      const args = new Args(r.value);
      const rawX = args.nextU256();
      const rawY = args.nextU256();
      return {
        reservesX: rawX ?? 0n,
        reservesY: rawY ?? 0n
      };
    });

  return reserves;
};

// ==================================================== //
// ====                 SALE METHODS               ==== //
// ==================================================== //

export const fetchSaleDatastore = (
  address: string,
  filterPrefix?: string
): Promise<string[]> =>
  baseClientSale.getStorageKeys(address, filterPrefix, false).then((res) => {
    const keys = res.map((key) => String.fromCharCode(...key));
    return keys.filter((key) =>
      filterPrefix ? key.startsWith(filterPrefix) : true
    );
  });

export const fetchSaleDatastoreEntries = (
  address: string,
  keys: string[]
): Promise<Uint8Array[]> =>
  baseClientSale
    .readStorage(
      address,
      keys.map((key) => strToBytes(key))
    )
    .then((res) =>
      res.filter(
        (entry): entry is Uint8Array<ArrayBufferLike> => entry !== null
      )
    );

// ==================================================== //
// ====                    VESTING                  ==== //
// ==================================================== //

export const fetchVestingSession = async (
  account: string
): Promise<VestingSession[]> => {
  const prefixInfo3 = '\u00023\u0000\u0000\u0000' + account;
  const prefixInfo4 = '\u00024\u0000\u0000\u0000' + account;
  const prefixInfo5 = '\u00025\u0000\u0000\u0000' + account;
  const prefixClaimedAmount3 = '\u00033\u0000\u0000\u0000' + account;
  const prefixClaimedAmount4 = '\u00034\u0000\u0000\u0000' + account;
  const prefixClaimedAmount5 = '\u00035\u0000\u0000\u0000' + account;

  const keys = await fetchDatastore(VESTING_SC_ADDRESS);
  const keysInfo = keys.filter(
    (key) =>
      key.startsWith(prefixInfo3) ||
      key.startsWith(prefixClaimedAmount3) ||
      key.startsWith(prefixInfo4) ||
      key.startsWith(prefixClaimedAmount4) ||
      key.startsWith(prefixInfo5) ||
      key.startsWith(prefixClaimedAmount5)
  );
  console.log({ keysInfo });

  // console.log(
  //   keys.filter(
  //     (key) =>
  //       !key.startsWith('\u00023\u0000\u0000\u0000') &&
  //       !key.startsWith('\u00024\u0000\u0000\u0000') &&
  //       !key.startsWith('\u00025\u0000\u0000\u0000') &&
  //       !key.startsWith('\u00033\u0000\u0000\u0000') &&
  //       !key.startsWith('\u00034\u0000\u0000\u0000') &&
  //       !key.startsWith('\u00035\u0000\u0000\u0000')
  //   )
  // );

  if (!keysInfo.length) return [];

  const res = await new IBaseContract(VESTING_SC_ADDRESS, baseClient)
    .extract(keysInfo)
    .catch(() => []);

  const sessions = new Map<number, VestingSession>();

  res.forEach((item, idx) => {
    if (!item?.length) return;

    const rawId = keysInfo[idx].split(account)[1];
    const id = decodeVestingId(rawId);
    const args = new Args(item);

    if (
      keysInfo[idx].startsWith(prefixInfo3) ||
      keysInfo[idx].startsWith(prefixInfo4) ||
      keysInfo[idx].startsWith(prefixInfo5)
    ) {
      args.nextString(); // _toAddress
      const tokenAddress = args.nextString();
      const totalAmount = args.nextU256();
      const startTimestamp = args.nextU64();
      const initialReleaseAmount = args.nextU256();
      const cliffDuration = args.nextU64();
      const linearDuration = args.nextU64();
      args.nextString(); // _tag

      const existing = sessions.get(id);
      if (existing) {
        existing.totalAmount = totalAmount;
        existing.startTimestamp = startTimestamp;
        existing.initialReleaseAmount = initialReleaseAmount;
        existing.cliffDuration = cliffDuration;
        existing.linearDuration = linearDuration;
        existing.tokenAddress = tokenAddress;
      } else {
        sessions.set(id, {
          id,
          totalAmount,
          startTimestamp,
          initialReleaseAmount,
          cliffDuration,
          linearDuration,
          claimedAmount: 0n,
          tokenAddress
        });
      }
    } else {
      const claimedAmount = args.nextU256();
      const existing = sessions.get(id);
      if (existing) {
        existing.claimedAmount = claimedAmount;
      } else {
        sessions.set(id, {
          id,
          totalAmount: 0n,
          startTimestamp: 0n,
          initialReleaseAmount: 0n,
          cliffDuration: 0n,
          linearDuration: 0n,
          claimedAmount,
          tokenAddress: ''
        });
      }
    }
  });

  return Array.from(sessions.values());
};

// ==================================================== //
// ====                    STAKING                 ==== //
// ==================================================== //

/**
 * Fetches the total amount of tokens staked by a user in the staking contract.
 * @param account Address of the user
 * @returns The total amount of tokens staked (in token units)
 */
export const fetchUserStakedAmount = async (
  account: string
): Promise<bigint> => {
  const contract = new IBaseContract(STAKING_SC_ADDRESS, baseClient);
  const args = new Args().addString(account).serialize();
  const res = await contract.read({
    targetFunction: 'getUserStakedAmount',
    parameter: args
  });
  return U256.fromBytes(res.value);
};

/**
 * Fetches the pending rewards for a user in the staking contract.
 * @param account Address of the user
 * @returns Le montant de récompenses accumulées (en token units)
 */
export const fetchUserPendingRewards = async (
  account: string
): Promise<bigint> => {
  const contract = new IBaseContract(STAKING_SC_ADDRESS, baseClient);
  const args = new Args().addString(account).serialize();
  const res = await contract.read({
    targetFunction: 'getPendingRewards',
    parameter: args
  });
  return U256.fromBytes(res.value);
};

/**
 * Fetches the total amount of tokens staked in the staking contract.
 * @returns The total amount of tokens staked in the staking contract
 */
export const fetchTotalStaked = async (): Promise<bigint> => {
  const contract = new IBaseContract(STAKING_SC_ADDRESS, baseClient);
  const args = new Args().serialize();
  const res = await contract.read({
    targetFunction: 'getTotalStakedAmount',
    parameter: args
  });
  return U256.fromBytes(res.value);
};

/**
 * Calculates the Annual Percentage Rate (APR) for staking.
 * The result is formatted as a string with two decimal places.
 */
export const fetchStakingAPR = async (): Promise<string> => {
  const contract = new IBaseContract(STAKING_SC_ADDRESS, baseClient);

  const [/*rateBytes,*/ stakedBytes] = await contract.extract([
    // 'rewardRate',
    'totalStakedAmount'
  ]);
  // const rewardRate = U256.fromBytes(rateBytes);
  const totalStaked = U256.fromBytes(stakedBytes);

  // console.log('rewardRate', rewardRate.toString());

  if (totalStaked === 0n) {
    return '0.00';
  }

  const secondsPerYear = 365n * BigInt(ONE_DAY);
  const secondsInPeriod = 60n * BigInt(ONE_DAY);
  // const rewardsPerYear = rewardRate * secondsPerYear;
  // const rewardsPerPeriod = rewardRate * secondsInPeriod;
  // console.log('rewardsPerYear', rewardsPerYear.toString());
  // console.log('rewardsPerPeriod', rewardsPerPeriod.toString());

  const toBeDistributed = parseUnits('500000', 18);
  const aprBP = new Fraction(toBeDistributed, totalStaked)
    .multiply(secondsPerYear / secondsInPeriod)
    .multiply(100n);
  console.log('aprBP', aprBP.toSignificant(6));

  return aprBP.toSignificant(6).toString();
};
