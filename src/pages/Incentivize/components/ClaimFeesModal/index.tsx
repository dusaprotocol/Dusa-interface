import { useState, useMemo, useContext } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { useQueries } from '@tanstack/react-query';
import Button from 'components/Button';
import Dropdown from 'components/Dropdown';
import Modal, { ModalProps } from 'components/Modal';
import Spinner from 'components/Spinner';
import TokenLogo from 'components/TokenLogo';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useTokenValues } from 'hooks/useFetchData/tokenValue';
import useFetchDatastore from 'hooks/useFetchDatastore';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { voterSC } from 'utils/config';
import { everyEpochs } from 'utils/constants';
import {
  fetchBribes,
  fetchClaimedAmount,
  fetchClaimedAmountJSON,
  getTokensFromPairAddress
} from 'utils/datastoreFetcher';
import {
  cleanAddress,
  formatNumberWithSubscriptZeros,
  printBigintIsh,
  toFraction
} from 'utils/methods';
import { transformToken } from 'utils/storage';
import { tokens } from 'utils/tokens';
import { buildClaimRewardTx } from 'utils/transactionBuilder';
import { queryKeys } from 'utils/trpc';
import { Token } from 'utils/types';
import './index.scss';

interface ClaimData {
  poolAddress: string;
  token: Token;
  claimedAmount: bigint;
}

type Pool = {
  pairAddress: string;
  token0: Token;
  token1: Token;
};

interface ClaimFeesModalProps extends ModalProps {
  pools: Pool[];
}

// 25 events per Massa operation / 2 events per rewarded entry, rounded down.
const CLAIM_ENTRIES_PER_TX = 12;

const ClaimFeesModal = ({
  showModal,
  setShowModal,
  pools
}: ClaimFeesModalProps) => {
  const tokenValues = useTokenValues();
  const { connectedAddress } = useContext(AccountWrapperContext);

  const availableEpochs = useMemo(() => {
    return everyEpochs
      .filter((epoch) => new Date() > epoch.to) // Only past epochs
      .slice(-4) // Last 4 epochs
      .map((epoch) => epoch.id)
      .sort((a, b) => b - a); // Most recent first
  }, []);

  const [selectedEpoch, setSelectedEpoch] = useState(availableEpochs[0] || 77);
  const [isEpochDropdownOpen, setIsEpochDropdownOpen] = useState(false);

  const epochOptions = availableEpochs.filter((epoch) => epoch >= 74);

  // Query tokens for each pool
  const poolTokensQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: [queryKeys.tokensSorted, pool.pairAddress],
      queryFn: async () => {
        const tokens = await getTokensFromPairAddress(pool.pairAddress);
        return tokens.map(transformToken);
      },
      enabled: !!pool.pairAddress
    }))
  });

  // Fetch datastore keys for bribes lookup
  const datastoreQuery = useFetchDatastore(voterSC);
  const datastoreKeys = datastoreQuery.data || [];

  // Query bribes for each pool to get all possible reward tokens
  const poolBribesQueries = useQueries({
    queries: pools.map((pool) => ({
      queryKey: ['bribes', pool.pairAddress, selectedEpoch],
      queryFn: () =>
        fetchBribes(pool.pairAddress, datastoreKeys, selectedEpoch),
      enabled: !!pool.pairAddress && datastoreKeys.length > 0
    }))
  });

  // Build arrays for claim transaction based on selected epoch and each pool's tokens + bribes
  const { claimMarketAddresses, claimEpochs, claimTokenAddresses } =
    useMemo(() => {
      // Ensure all dependencies are available
      if (!pools || !poolTokensQueries || !selectedEpoch) {
        return {
          claimMarketAddresses: [],
          claimEpochs: [],
          claimTokenAddresses: []
        };
      }

      const claimData = pools.flatMap((pool, index) => {
        const poolTokens = poolTokensQueries[index]?.data || [];
        const poolBribes = poolBribesQueries[index]?.data || [];

        // Combine pool trading pair tokens with bribe tokens
        const bribeTokens = poolBribes.map((bribe) => bribe.token);
        const allTokens = [...poolTokens, ...bribeTokens];

        // Remove duplicates by address (case-insensitive)
        const uniqueTokensMap = new Map<string, Token>();
        allTokens.forEach((token) => {
          if (!token.address) return;
          const key = token.address.toLowerCase();
          if (!uniqueTokensMap.has(key)) uniqueTokensMap.set(key, token);
        });

        return Array.from(uniqueTokensMap.values()).map((token) => ({
          marketAddress: 'vote-' + pool.pairAddress,
          epoch: BigInt(selectedEpoch),
          // MASSA carries WMAS's address with a '_' suffix so the UI can tell
          // the two apart; the rewarder only ever pays WMAS, so strip it.
          tokenAddress: cleanAddress(token.address)
        }));
      });

      return {
        claimMarketAddresses: claimData.map((d) => d.marketAddress),
        claimEpochs: claimData.map((d) => d.epoch),
        claimTokenAddresses: claimData.map((d) => d.tokenAddress)
      };
    }, [pools, poolTokensQueries, poolBribesQueries, selectedEpoch]);

  // Query claimed amounts for all pool-token combinations
  const epochsClaimedAmountsQuery = useQueries({
    queries: claimMarketAddresses.map((marketAddress, i) => ({
      queryKey: [
        'voteClaimedAmounts',
        selectedEpoch,
        connectedAddress,
        marketAddress,
        claimTokenAddresses[i]
      ],
      queryFn: () =>
        fetchClaimedAmount(
          marketAddress,
          BigInt(selectedEpoch),
          connectedAddress,
          claimTokenAddresses[i]
        ),
      enabled:
        !!connectedAddress &&
        !!marketAddress &&
        claimTokenAddresses[i] !== undefined
    }))
  });

  // Prepare claim data for display
  const claimData = useMemo(() => {
    const data: ClaimData[] = [];

    let index = 0;
    pools.forEach((pool, poolIndex) => {
      const poolTokens = poolTokensQueries[poolIndex]?.data || [];
      const poolBribes = poolBribesQueries[poolIndex]?.data || [];

      // Combine pool trading pair tokens with bribe tokens (same as above)
      const bribeTokens = poolBribes.map((bribe) => bribe.token);
      const allTokens = [...poolTokens, ...bribeTokens];

      // Remove duplicates by address (case-insensitive)
      const uniqueTokensMap = new Map<string, Token>();
      allTokens.forEach((token) => {
        if (!token.address) return;
        const key = token.address.toLowerCase();
        if (!uniqueTokensMap.has(key)) uniqueTokensMap.set(key, token);
      });

      Array.from(uniqueTokensMap.values()).forEach((token) => {
        const claimedAmount = epochsClaimedAmountsQuery[index]?.data || 0n;
        // Only add if token is valid and has a claimable amount
        if (token && claimedAmount) {
          data.push({
            poolAddress: pool.pairAddress,
            token,
            claimedAmount
          });
        }
        index++;
      });
    });

    return data.filter((item) => item.claimedAmount);
  }, [pools, poolTokensQueries, poolBribesQueries, epochsClaimedAmountsQuery]);

  // Group claims by token
  const tokenClaims = useMemo(() => {
    const grouped = new Map<
      string,
      { token: Token; totalAmount: bigint; pools: string[] }
    >();

    claimData.forEach(({ poolAddress, token, claimedAmount }) => {
      const key = token.address.toLowerCase();
      const existing = grouped.get(key);

      if (existing) {
        existing.totalAmount = existing.totalAmount + claimedAmount;
        existing.pools.push(poolAddress);
      } else {
        grouped.set(key, {
          token,
          totalAmount: claimedAmount,
          pools: [poolAddress]
        });
      }
    });

    return Array.from(grouped.values()).filter((item) => item.totalAmount > 0n);
  }, [claimData]);

  // Helper function to validate arrays before transaction
  const areArraysValid = (
    marketAddrs: string[],
    epochs: bigint[],
    tokenAddrs: string[]
  ) => {
    return (
      marketAddrs.length > 0 &&
      epochs.length > 0 &&
      tokenAddrs.length > 0 &&
      marketAddrs.length === epochs.length &&
      marketAddrs.length === tokenAddrs.length &&
      marketAddrs.every(
        (addr) =>
          addr !== undefined && addr !== null && typeof addr === 'string'
      ) &&
      epochs.every((e) => e !== undefined && e !== null) &&
      tokenAddrs.every(
        (addr) =>
          addr !== undefined && addr !== null && typeof addr === 'string'
      )
    );
  };

  // Only the (pool, token) pairs with a non-zero reward make it into the
  // transaction: sending every combination of every pool blows up the payload
  // and the gas needed, which is enough to make the claim fail on-chain.
  const { txMarketAddresses, txEpochs, txTokenAddresses } = useMemo(() => {
    const entries = claimMarketAddresses
      .map((marketAddress, i) => ({
        marketAddress,
        epoch: claimEpochs[i],
        tokenAddress: claimTokenAddresses[i],
        amount: epochsClaimedAmountsQuery[i]?.data || 0n
      }))
      .filter((entry) => entry.amount > 0n);

    return {
      txMarketAddresses: entries.map((e) => e.marketAddress),
      txEpochs: entries.map((e) => e.epoch),
      txTokenAddresses: entries.map((e) => e.tokenAddress)
    };
  }, [
    claimMarketAddresses,
    claimEpochs,
    claimTokenAddresses,
    epochsClaimedAmountsQuery
  ]);

  // A rewarded (pool, token) pair emits two events on claim (Claim + the ERC20
  // transfer) and Massa allows 25 events per operation, so a batchClaim reverts
  // with "Too many event for this operation" from the 13th entry on. Split the
  // claim into one transaction per chunk rather than losing the overflow.
  const claimChunks = useMemo(() => {
    const chunks: {
      markets: string[];
      epochs: bigint[];
      tokenAddresses: string[];
    }[] = [];

    for (let i = 0; i < txMarketAddresses.length; i += CLAIM_ENTRIES_PER_TX) {
      const markets = txMarketAddresses.slice(i, i + CLAIM_ENTRIES_PER_TX);
      const epochs = txEpochs.slice(i, i + CLAIM_ENTRIES_PER_TX);
      const tokenAddresses = txTokenAddresses.slice(
        i,
        i + CLAIM_ENTRIES_PER_TX
      );
      if (areArraysValid(markets, epochs, tokenAddresses))
        chunks.push({ markets, epochs, tokenAddresses });
    }

    return chunks;
  }, [txMarketAddresses, txEpochs, txTokenAddresses]);

  const canClaim = claimChunks.length > 0;
  // Snapshot of the run in progress: `claimChunks` shrinks as each chunk lands
  // and gets refetched, so the progress total has to be captured up front.
  const [claimRun, setClaimRun] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const { submitTx: claim, pending: pendingClaim } = useSendTransaction({
    onTxConfirmed: () => {
      epochsClaimedAmountsQuery.forEach((query) => query.refetch());
    }
  });

  // Sequential, not parallel: the wallet prompts once per transaction and a
  // failed chunk must stop the run instead of queuing more prompts behind it.
  const claimAll = async () => {
    const chunks = claimChunks;
    setClaimRun({ done: 0, total: chunks.length });

    for (const [i, chunk] of chunks.entries()) {
      const confirmed = await claim(
        buildClaimRewardTx(chunk.markets, chunk.epochs, chunk.tokenAddresses)
      );
      // A rejected or reverted chunk stops the run: the remaining rewards stay
      // claimable, and the user is not queued behind more wallet prompts.
      if (!confirmed) {
        setClaimRun(null);
        return;
      }
      setClaimRun({ done: i + 1, total: chunks.length });
    }

    setClaimRun(null);
    setShowModal(false);
  };

  const hasClaimableRewards = tokenClaims.length > 0;
  const isClaimPending = pendingClaim || claimRun !== null;

  // Check if data is loading
  const isLoadingEpochData =
    poolTokensQueries.some((q) => q.isLoading) ||
    poolBribesQueries.some((q) => q.isLoading) ||
    datastoreQuery.isLoading ||
    epochsClaimedAmountsQuery.some((q) => q.isLoading);

  const claimButtonText = () => {
    if (isLoadingEpochData) return 'Loading...';
    if (!hasClaimableRewards) return 'Close';
    if (claimRun && claimRun.total > 1)
      return `Claiming ${Math.min(claimRun.done + 1, claimRun.total)}/${
        claimRun.total
      }`;
    return claimChunks.length > 1
      ? `Claim Rewards (${claimChunks.length} txs)`
      : 'Claim Rewards';
  };

  // Calculate total USD value
  const totalUSDValue = useMemo(() => {
    return tokenClaims.reduce((total, { token, totalAmount }) => {
      const tokenIndex = tokens.findIndex((t) => t.address === token.address);
      const tokenValue = tokenValues[tokenIndex] || 0;
      const usdValue = Number(
        new TokenAmount(token, totalAmount)
          .multiply(toFraction(tokenValue))
          .toFixed(token.decimals)
      );
      return total + usdValue;
    }, 0);
  }, [tokenClaims, tokenValues]);

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      title='Claim Voting Rewards'
    >
      <div className='claim-fees-modal'>
        <div className='epoch-selector'>
          <label htmlFor='epoch-select'>Select Epoch:</label>
          <Dropdown
            isOpen={isEpochDropdownOpen}
            setIsOpen={setIsEpochDropdownOpen}
            className='epoch-dropdown'
            triggerButton={
              <div className='epoch-trigger'>
                <span>Epoch {selectedEpoch}</span>
                <svg
                  width='12'
                  height='8'
                  viewBox='0 0 12 8'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className={isEpochDropdownOpen ? 'rotated' : ''}
                >
                  <path
                    d='M1 1.5L6 6.5L11 1.5'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
            }
          >
            <div className='epoch-options'>
              {epochOptions.map((epoch) => (
                <button
                  key={epoch}
                  className={`epoch-option ${selectedEpoch === epoch ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedEpoch(epoch);
                    setIsEpochDropdownOpen(false);
                  }}
                >
                  Epoch {epoch}
                </button>
              ))}
            </div>
          </Dropdown>
        </div>
        <div className='modal-description'>
          {isLoadingEpochData ? (
            <div className='flex justify-center items-center gap-2'>
              <Spinner size={26} />
              <p>Loading rewards for Epoch {selectedEpoch}...</p>
            </div>
          ) : hasClaimableRewards ? (
            <>
              <p>
                You have unclaimed rewards from your votes for Epoch{' '}
                {selectedEpoch}.
              </p>
              <p className='pools-count'>
                Rewards from {new Set(claimData.map((d) => d.poolAddress)).size}{' '}
                pool(s)
              </p>
            </>
          ) : (
            <p>No rewards to claim for Epoch {selectedEpoch}.</p>
          )}
        </div>

        {!isLoadingEpochData && hasClaimableRewards && (
          <div className='rewards-list'>
            <div className='rewards-header'>
              <span>Token</span>
              <span>Amount</span>
            </div>

            {tokenClaims.map(({ token, totalAmount }) => {
              const tokenIndex = tokens.findIndex(
                (t) => t.address === token.address
              );
              const tokenValue = tokenValues[tokenIndex] || 0;
              const usdValue = Number(
                new TokenAmount(token, totalAmount)
                  .multiply(toFraction(tokenValue))
                  .toFixed(token.decimals)
              );

              return (
                <div key={token.address} className='reward-item'>
                  <div className='token-info'>
                    <TokenLogo logoURI={token.logoURI} />
                    <span className='token-symbol'>{token.symbol}</span>
                  </div>
                  <div className='amount-info'>
                    <span className='token-amount'>
                      {formatNumberWithSubscriptZeros(
                        printBigintIsh(token, totalAmount, 4)
                      )}{' '}
                    </span>
                    <span className='usd-value'>
                      $
                      {usdValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className='total-value'>
              <span>Total Value</span>
              <span className='total-amount'>
                $
                {totalUSDValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        )}

        <div className='modal-actions'>
          <Button
            variant='outlined'
            text='Cancel'
            onClick={() => setShowModal(false)}
            disabled={isClaimPending || isLoadingEpochData}
          />
          <Button
            variant='contained'
            text={claimButtonText()}
            onClick={hasClaimableRewards ? claimAll : () => setShowModal(false)}
            pending={isClaimPending}
            disabled={
              isLoadingEpochData ||
              isClaimPending ||
              (!hasClaimableRewards && !isLoadingEpochData) ||
              (hasClaimableRewards && !canClaim)
            }
          />
        </div>
      </div>
    </Modal>
  );
};

export default ClaimFeesModal;
