import { useContext, useEffect, useState } from 'react';
import { parseUnits, TokenAmount } from '@dusalabs/sdk';
import { faWarning } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import Button from 'components/Button';
import ButtonAllowance from 'components/ButtonAllowance';
import Info, { Warning } from 'components/Info';
import Skeleton from 'components/Skeleton';
import NumberInput from 'components/TokenInput/NumberInput';
import TokenLogo from 'components/TokenLogo';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import useFetchBalance from 'hooks/useFetchBalance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { IS_BUILDNET, STAKING_SC_ADDRESS } from 'utils/config';
import { U256_MAX } from 'utils/constants';
import {
  fetchStakingAPR,
  fetchTotalStaked,
  fetchUserPendingRewards,
  fetchUserStakedAmount
} from 'utils/datastoreFetcher';
import { printBigintIsh, tokenAmountToSignificant } from 'utils/methods';
import { DUSA_MAIN, JELLY } from 'utils/tokens';
import {
  buildIncreaseAllowanceTx,
  buildStakingTx
} from 'utils/transactionBuilder';
import { Allowance } from 'utils/types';

const StakingCard = () => {
  const [quantity, setQuantity] = useState<string>();
  const [allowanceType, setAllowanceType] = useState<Allowance>('increase');
  const [apr, setApr] = useState<string>();
  const [loadingApr, setLoadingApr] = useState(true);
  const { connectedAddress } = useContext(AccountWrapperContext);

  const token = IS_BUILDNET ? JELLY : DUSA_MAIN;

  const dusaBalanceQuery = useFetchBalance(token.address, connectedAddress);
  const dusaBalance = dusaBalanceQuery.data || 0n;

  const amount = quantity ? parseUnits(quantity, token.decimals) : undefined;

  const fetchApr = async () => {
    try {
      const fetchedApr = await fetchStakingAPR();
      setApr(fetchedApr);
    } catch (error) {
      console.error('Error fetching APR:', error);
      setApr('NaN');
    } finally {
      setLoadingApr(false);
    }
  };

  const stakeAmountQuery = useQuery(
    ['user stake amount', connectedAddress],

    () => fetchUserStakedAmount(connectedAddress),
    { enabled: !!connectedAddress }
  );
  const stakedAmount = stakeAmountQuery.data || 0n;
  const saLoading = stakeAmountQuery.isLoading;

  const stakeEarnAmountQuery = useQuery(
    ['user stake earn amount', connectedAddress],

    () => fetchUserPendingRewards(connectedAddress),
    { enabled: !!connectedAddress }
  );
  const earnedAmount = stakeEarnAmountQuery.data || 0n;

  const totalStakedAmountQuery = useQuery(
    ['total staked amount', connectedAddress],

    () => fetchTotalStaked(),
    { enabled: !!connectedAddress }
  );
  const totalStakedAmount = totalStakedAmountQuery.data || 0n;
  const tsaLoading = totalStakedAmountQuery.isLoading;

  const allowanceQuery = useFetchAllowance({
    tokenAddress: token.address,
    spenderAddress: STAKING_SC_ADDRESS
  });
  const allowance = allowanceQuery.data || 0n;
  const fetchingAllowance = allowanceQuery.isLoading;

  const amountToIncreaseAllowance =
    allowanceType === 'increaseMax' ? U256_MAX : (amount ?? 0n) - allowance;

  const onTxConfirmed = () => {
    fetchApr();
    dusaBalanceQuery.refetch();
    stakeAmountQuery.refetch();
    stakeEarnAmountQuery.refetch();
  };

  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(
        token.address,
        STAKING_SC_ADDRESS,
        amountToIncreaseAllowance
      ),
      onTxConfirmed: () => {
        allowanceQuery.refetch();
      }
    });

  const { pending: pendingDeposit, submitTx: deposit } = useSendTransaction({
    data: buildStakingTx(amount ?? 0n, true),
    onTxConfirmed: () => {
      onTxConfirmed();
      setQuantity('');
    }
  });
  const { pending: pendingWithdraw, submitTx: withdraw } = useSendTransaction({
    data: buildStakingTx(amount ?? 0n, false),
    onTxConfirmed
  });

  useEffect(() => {
    fetchApr();
  }, []);

  useEffect(() => {
    if (!connectedAddress) return;
    stakeAmountQuery.refetch();
    stakeEarnAmountQuery.refetch();
    allowanceQuery.refetch();
  }, [connectedAddress]);

  return (
    <div className='flex flex-col gap-2 grow bg-[var(--hover-bg)] rounded-lg'>
      <div className='p-4 flex flex-col'>
        <span className='text-[1.1rem] font-semibold'>Stake your $DUSA</span>
        <span className='text-[0.85rem] opacity-70'>
          Earn more $DUSA while waiting for new protocol uses
        </span>
      </div>
      <div className='px-4 pb-4 flex flex-col gap-4 justify-between items-center'>
        <div className='border border-[var(--secondary-color-transp)] rounded-lg w-full'>
          <div className='relative flex-1'>
            <NumberInput
              headerText='From'
              token={token}
              quantity={quantity}
              changeQuantity={(q?: string) => setQuantity(q)}
              balance={dusaBalance}
              className='w-full rounded-lg bg-[var(--hover-bg)] py-3 pl-3 pr-16 font-semibold brightness-125 focus:outline-none'
              placeholder='Amount to stake'
            />
            <button
              onClick={() =>
                setQuantity(
                  tokenAmountToSignificant(new TokenAmount(token, dusaBalance))
                )
              }
              className='absolute right-0 top-1/2 -translate-y-1/2 transform p-3 text-sm text-[var(--secondary-color)] hover:brightness-125'
            >
              Max
            </button>
          </div>
        </div>
        <div className='flex justify-around gap-4 grow w-full flex-wrap sm:flex-nowrap'>
          <div className='flex flex-col gap-1 grow'>
            <span className='whitespace-nowrap font-light opacity-75'>
              My Staked DUSA
            </span>
            {saLoading ? (
              <Skeleton style={{ width: '10ch' }} />
            ) : (
              <div className='flex items-center gap-1'>
                <span className='text-[1.1rem] font-semibold'>
                  {printBigintIsh(token, stakedAmount)}
                </span>
                <TokenLogo logoURI={token.logoURI} />
              </div>
            )}
          </div>
          <div className='flex flex-col gap-1 grow'>
            <span className='font-light opacity-75'>APR</span>
            {loadingApr ? (
              <Skeleton style={{ width: '10ch' }} />
            ) : (
              <span className='text-[1.1rem] font-semibold'>{apr}%</span>
            )}
          </div>

          {/* <div className='flex flex-col gap-1 grow'>
            <span className='whitespace-nowrap font-light opacity-75'>
              My Earned DUSA
            </span>
            <div className='flex items-center gap-1'>
              <span>{printBigintIsh(token, earnedAmount)}</span>
              <TokenLogo logoURI={token.logoURI} />
            </div>
          </div> */}
          <div className='flex flex-col gap-1 grow'>
            <span className='whitespace-nowrap font-light opacity-75'>
              Total Staked DUSA
            </span>
            {tsaLoading ? (
              <Skeleton style={{ width: '10ch' }} />
            ) : (
              <div className='flex items-center gap-1'>
                <span className='text-[1.1rem] font-semibold'>
                  {printBigintIsh(token, totalStakedAmount)}
                </span>
                <TokenLogo logoURI={token.logoURI} />
              </div>
            )}
          </div>
        </div>
        <Info>
          <div>
            <FontAwesomeIcon
              icon={faWarning}
              className='text-[var(--white)] mr-2'
            />
            <span className='text-[var(--white)]'>
              The DUSA deposited will be locked until governance deployment on
              11th september 2025.
            </span>
          </div>
        </Info>
        <div className='flex flex-col gap-2 sm:flex-row grow w-full'>
          {amount !== undefined && amount > allowance && !fetchingAllowance && (
            <ButtonAllowance
              onClick={increaseAllowance}
              pending={pendingAllowance}
              allowanceType={allowanceType}
              setAllowanceType={setAllowanceType}
              token={token}
              stretch
            />
          )}
          <Button
            text='Stake'
            variant='contained'
            disabled={!quantity || Number(quantity) <= 0 || fetchingAllowance}
            onClick={deposit}
            pending={pendingDeposit}
          />
          {/* <div>
            <Button
              text='Unstake'
              variant='outlined'
              onClick={withdraw}
              pending={pendingWithdraw}
              disabled={stakedAmount === 0n}
            />
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default StakingCard;
