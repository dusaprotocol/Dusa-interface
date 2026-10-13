import { useContext, useState } from 'react';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import useFetchAllowance from 'hooks/useFetchAllowance';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import { vaultManagerSC } from 'utils/config';
import {
  AutopoolConfig,
  U256_MAX,
  autopoolConfigs,
  autopoolDescriptions
} from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import { printBigintIsh, sumBinAmounts } from 'utils/methods';
import { defaultDeposit } from 'utils/placeholders';
import { MASSA } from 'utils/tokens';
import {
  buildAutonomousWithdrawAll,
  buildIncreaseAllowanceTx
} from 'utils/transactionBuilder';
import { Vault } from 'utils/types';
import './index.scss';

interface WithdrawItemProps {
  vault: Vault;
}

const WithdrawItem = ({ vault }: WithdrawItemProps) => {
  const [type, setType] = useState<AutopoolConfig>();

  const { token0, token1, fetchAutonomousLiquidity, fetchBalances } =
    useContext(PoolContext);

  const methodForWithdrawAll =
    token0.equals(MASSA) || token1.equals(MASSA)
      ? 'withdrawAllMAS'
      : 'withdrawAll';

  const { data: allowance } = useFetchAllowance({
    spenderAddress: vaultManagerSC,
    tokenAddress: vault.address
  });

  const idk = vault === vault;
  const needAllowance = allowance === 0n;
  const { amount0, amount1 } = sumBinAmounts(vault.bins) ?? defaultDeposit;

  const { pending, submitTx } = useSendTransaction({
    data: buildAutonomousWithdrawAll(
      getWmasIfMas(token0).address,
      getWmasIfMas(token1).address,
      type ?? 11,
      methodForWithdrawAll
    ),
    onTxConfirmed: () => {
      fetchAutonomousLiquidity();
      fetchBalances();
    }
  });

  const { pending: pendingApprove, submitTx: approveTx } = useSendTransaction({
    data: buildIncreaseAllowanceTx(vault.address, vaultManagerSC, U256_MAX),
    onTxConfirmed: () => {
      fetchAutonomousLiquidity();
      fetchBalances();
      // fetchAllowance();
    }
  });

  if (!vault || amount0 + amount1 === 0n) return null;

  const index = autopoolConfigs.indexOf(vault.type as AutopoolConfig);

  return (
    <div
      className={clsx('different-customizable', idk && 'active')}
      onClick={() => {
        setType(autopoolConfigs[index]);
      }}
    >
      <div className='different-customizable-name'>
        <div className='customizable-type'>
          <span>Number of bins</span>
          <span>{autopoolDescriptions[index].nbBins}</span>
        </div>
        <div className='customizable-type'>
          <span>Frequency</span>
          <span>{autopoolDescriptions[index].frequency}</span>
        </div>
      </div>
      <div className='different-customizable-amount'>
        <span>Amounts deposited in this customizable AL</span>
        <span>
          {printBigintIsh(token0, amount0)} {token0.symbol}
        </span>
        <span>
          {printBigintIsh(token1, amount1)} {token1.symbol}
        </span>
      </div>
      {idk ? (
        <div className='container-buttons-remove-AL'>
          {needAllowance && (
            <Button
              text='Approve Autonomous Liquidity'
              variant='contained'
              onClick={approveTx}
              pending={pendingApprove}
            />
          )}
          <Button
            text='Withdraw Autonomous Liquidity'
            disabled={needAllowance}
            disabledText={
              needAllowance ? 'Approve Autonomous Liquidity first' : undefined
            }
            variant='contained'
            onClick={submitTx}
            pending={pending}
          />
        </div>
      ) : null}
    </div>
  );
};

const Withdraw = () => {
  const { pairAddress, depositALBalance, vaults } = useContext(PoolContext);

  if (!pairAddress) throw new Error('Pair address not found');

  return (
    <div className='Withdraw'>
      {depositALBalance.amount0 > 0n || depositALBalance.amount1 > 0n ? (
        <>
          <div className='withdraw-container'>
            <span>Select the autonomous liquidity you want to withdraw</span>
            <div className='different-customizable-container'>
              {vaults.map((vault, index) => (
                <WithdrawItem key={index} vault={vault} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <span>You don&apos;t have any Autonomous Liquidity to withdraw.</span>
      )}
    </div>
  );
};

export default Withdraw;
