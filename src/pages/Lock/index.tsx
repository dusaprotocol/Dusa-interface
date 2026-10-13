import { useContext, useState } from 'react';
import { TokenAmount } from '@dusalabs/sdk';
import { faLock, faPlus, faVoteYea } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Button from 'components/Button';
import ConnectButton from 'components/ConnectButton';
import LockThumbnail from 'components/LockThumbnail';
import PageHeader from 'components/PageHeader';
import Spinner from 'components/Spinner';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import {
  ExtendLockModal,
  IncreaseLockModal
} from 'pages/Incentivize/components/UpdateLockModals';
import { routeNames } from 'routes';
import { fetchDelegate } from 'utils/datastoreFetcher';
import { printAddress } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import {
  buildDelegateLockTx,
  buildResetTx,
  buildWithdrawTx
} from 'utils/transactionBuilder';
import { Lock as _Lock } from 'utils/types';
import DelegateModal from './components/DelegateModal';
import './index.scss';

interface LockItemProps {
  lock: _Lock;
  votingPower: bigint;
  onIncrease: () => void;
  onExtend: () => void;
  onDelegate: () => void;
  onReset: () => void;
  onWithdraw: () => void;
}

const LockItem = ({
  lock,
  votingPower,
  onIncrease,
  onExtend,
  onDelegate,
  onReset,
  onWithdraw
}: LockItemProps) => {
  const queryClient = useQueryClient();
  const isPermanent = lock.permanent || lock.timestamp === 0;
  const isExpired = lock.timestamp !== 0 && lock.timestamp <= Date.now();

  const delegateQuery = useQuery(
    ['delegate', lock.id],
    () => fetchDelegate(lock.id),
    { enabled: isPermanent, retry: false, staleTime: 30000 }
  );
  const delegatedTo = delegateQuery.data;

  const removeDelegate = useSendTransaction({
    onTxConfirmed: () => {
      queryClient.invalidateQueries(['delegate', lock.id]);
    }
  });

  const handleRemoveDelegate = () => {
    removeDelegate.submitTx(buildDelegateLockTx(BigInt(lock.id), 0n));
  };

  return (
    <div className='lock-card'>
      <div className='lock-thumbnail'>
        <LockThumbnail lock={lock} />
      </div>

      <div className='lock-info'>
        <div className='voting-power'>
          <span className='voting-power-label'>Voting Power</span>
          <span className='voting-power-value'>
            {votingPower !== undefined
              ? new TokenAmount(DUSA_MAIN, votingPower).toSignificant(8)
              : '—'}
          </span>
        </div>

        {delegatedTo && (
          <div className='delegation-info'>
            <span className='delegation-label'>
              Delegated to: {printAddress(delegatedTo)}
            </span>
            <Button
              text='Undelegate'
              variant='outlined'
              onClick={handleRemoveDelegate}
              pending={removeDelegate.pending}
            />
          </div>
        )}
      </div>

      <div className='lock-actions'>
        {!isExpired ? (
          <>
            <Button
              text='Increase'
              variant='outlined'
              onClick={onIncrease}
              stretch={false}
            />
            <Button
              text='Extend'
              variant='outlined'
              onClick={onExtend}
              stretch={false}
            />
            {isPermanent && !delegatedTo && (
              <Button
                text='Delegate'
                variant='outlined'
                onClick={onDelegate}
                stretch={false}
              />
            )}
          </>
        ) : (
          <>
            <Button
              text='Reset before withdrawing'
              variant='outlined'
              onClick={onReset}
            />
            <Button text='Withdraw' variant='contained' onClick={onWithdraw} />
          </>
        )}
      </div>
    </div>
  );
};

const Lock = () => {
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [updateLock, setUpdateLock] = useState<_Lock | undefined>();
  const [showDelegateModal, setShowDelegateModal] = useState(false);

  const { locks, connected } = useContext(AccountWrapperContext);
  // Extract voting powers directly from locks data (no separate queries needed)
  const votingPowers = locks?.map((lock) => lock.votingPower) || [];

  // Removed unused holdings query

  const reset = useSendTransaction({
    data: buildResetTx(BigInt(updateLock?.id || 0))
  });

  const withdraw = useSendTransaction({
    data: buildWithdrawTx(BigInt(updateLock?.id || 0))
  });

  return (
    <div className='Lock'>
      <PageHeader
        title='Manage Locks'
        description='Lock your DUSA tokens to gain voting power and earn rewards. Longer locks provide higher voting weight and greater protocol benefits.'
      />

      <div className='lock-content'>
        <div className='lock-intro'>
          <div className='intro-card'>
            <h3 className='intro-title'>
              <FontAwesomeIcon icon={faLock} />
              Unlock Protocol Benefits
            </h3>
            <p className='intro-description'>
              Gain greater voting power and higher rewards by locking more
              tokens for longer periods.
            </p>
            <Link to={routeNames.createLock} className='create-lock-link'>
              <Button
                text='Create New Lock'
                icon={faPlus}
                variant='contained'
                stretch={false}
                className='flex items-center gap-1'
              />
            </Link>
          </div>
        </div>

        <div className='locks-section'>
          <div className='section-header'>
            <h2 className='section-title'>
              <FontAwesomeIcon icon={faVoteYea} />
              Your Locks
            </h2>
            {locks && locks.length > 0 && (
              <div className='locks-count'>
                {locks.length} lock{locks.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className='locks-grid'>
            {locks ? (
              locks.length ? (
                locks.map((lock, i) => (
                  <LockItem
                    key={lock.id}
                    lock={lock}
                    votingPower={votingPowers[i]}
                    onIncrease={() => {
                      setUpdateLock(lock);
                      setShowIncreaseModal(true);
                    }}
                    onExtend={() => {
                      setUpdateLock(lock);
                      setShowExtendModal(true);
                    }}
                    onDelegate={() => {
                      setUpdateLock(lock);
                      setShowDelegateModal(true);
                    }}
                    onReset={() => {
                      setUpdateLock(lock);
                      reset.submitTx();
                    }}
                    onWithdraw={() => {
                      setUpdateLock(lock);
                      withdraw.submitTx();
                    }}
                  />
                ))
              ) : (
                <div className='empty-state'>
                  <div className='empty-icon'>
                    <FontAwesomeIcon icon={faLock} />
                  </div>
                  <h3 className='empty-title'>No Locks Found</h3>
                  <p className='empty-description'>
                    Create your first lock to start earning voting power and
                    protocol rewards.
                  </p>
                  <Link to={routeNames.createLock}>
                    <Button
                      text='Create Your First Lock'
                      icon={faPlus}
                      variant='contained'
                      className='flex items-center gap-1'
                    />
                  </Link>
                </div>
              )
            ) : connected ? (
              <div className='loading-state'>
                <Spinner />
                <p className='loading-text'>Loading your locks...</p>
              </div>
            ) : (
              <div className='connect-state'>
                <div className='connect-card'>
                  <h3 className='connect-title'>Connect Your Wallet</h3>
                  <p className='connect-description'>
                    Connect your wallet to view and manage your DUSA locks.
                  </p>
                  <ConnectButton stretch={false} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {updateLock ? (
        showExtendModal ? (
          <ExtendLockModal
            lock={updateLock}
            showOtherModal={showIncreaseModal}
            setShowOtherModal={setShowIncreaseModal}
            showModal={showExtendModal}
            setShowModal={setShowExtendModal}
          />
        ) : showIncreaseModal ? (
          <IncreaseLockModal
            lock={updateLock}
            showOtherModal={showExtendModal}
            setShowOtherModal={setShowExtendModal}
            showModal={showIncreaseModal}
            setShowModal={setShowIncreaseModal}
          />
        ) : showDelegateModal ? (
          <DelegateModal
            showModal={showDelegateModal}
            setShowModal={setShowDelegateModal}
            lock={updateLock}
          />
        ) : null
      ) : null}
    </div>
  );
};

// Tokenomics component - can be used later for a dedicated tokenomics page
/*
const Tokenomics = () => {
  return (
    <div className='p-8 md:p-12 max-h-screen overflow-auto'>
      <h1 className='mb-10 font-semibold text-body text-3xl'>Tokenomics</h1>
      <p className='mt-4 mb-4 text-accent-80'>
        Dusa Protocol uses two tokens to manage its utility and governance:
      </p>
      <ul className='mt-4 mb-4 text-accent-80 list-disc list-inside'>
        <li>
          <code>$DUSA</code> — ERC-20 utility token of the protocol
        </li>
        <li>
          <code>$veDUSA</code> — ERC-721 governance token in the form of an NFT
          (non-fungible token)
        </li>
      </ul>
      <p className='mt-4 mb-4 text-accent-80'>
        <code>$DUSA</code> is distributed to liquidity providers through
        emissions.
      </p>
      <p className='mt-4 mb-4 text-accent-80'>
        <code>$veDUSA</code> is used for governance. Any <code>$DUSA</code>{' '}
        holder can vote-escrow their tokens and receive a <code>$veDUSA</code>{' '}
        (also known as Lock or veNFT) in exchange. Additional tokens can be
        added to the <code>$veDUSA</code> NFT at any time.
      </p>
      <p className='mt-4 mb-4 text-accent-80'>
        The lock period (also known as vote-escrowed period, hence the{' '}
        <em>ve</em> prefix) can be up to 4 years, following the linear
        relationship shown below:
      </p>
      <ul className='mt-4 mb-4 text-accent-80 list-disc list-inside'>
        <li>
          100 <code>$DUSA</code> locked for 4 years will become 100{' '}
          <code>$veDUSA</code>
        </li>
        <li>
          100 <code>$DUSA</code> locked for 1 year will become 25{' '}
          <code>$veDUSA</code>
        </li>
      </ul>
      <p className='mt-4 mb-4 text-accent-80'>
        The longer the vesting time, the higher the voting power (voting
        weight).
      </p>
      <p className='mt-4 mb-4 text-accent-80'>
        Additionally, the Lock (veNFT) can be set into a permanent maximum lock
        time. These <em>permalocked</em> Locks (veNFTs) are always treated by
        the protocol as being locked for the maximum duration of 4 years, and
        their voting power does not decay.
      </p>
      <h2 className='mt-10 mb-4 font-semibold text-body text-2xl'>
        Initial Distribution
      </h2>
      <p className='mt-4 mb-4 text-accent-80'>
        The initial distribution of <code>$DUSA</code> and <code>$veDUSA</code>{' '}
        was done for users and protocols likeliest to contribute to protocol
        mission to become the liquidity base layer of the Massa ecosystem.
      </p>
      <div data-testid='table-element' className='relative'>
        <div className='top-0 left-0 -z-10 absolute bg-white dark:bg-black drop-shadow-md rounded-lg w-full h-full'></div>
        <table className='w-full text-sm text-left text-accent-50'>
          <thead className='group/head text-xs uppercase text-accent-70'>
            <tr>
              <th className='bg-primary px-6 py-3 group-first/head:first:rounded-tl-lg group-first/head:last:rounded-tr-lg w-3/4'>
                DUSA
              </th>
              <th className='bg-primary px-6 py-3 group-first/head:first:rounded-tl-lg group-first/head:last:rounded-tr-lg'></th>
              <th className='bg-primary px-6 py-3 group-first/head:first:rounded-tl-lg group-first/head:last:rounded-tr-lg'></th>
            </tr>
          </thead>
          <tbody className='group/body'>
            <tr
              data-testid='table-row-element'
              className='group/row bg-primary even:bg-primary odd:bg-secondary'
            >
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                Community
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                240M
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                60%
              </td>
            </tr>
            <tr
              data-testid='table-row-element'
              className='group/row bg-primary even:bg-primary odd:bg-secondary'
            >
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                Partner Protocols
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                96M
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                24%
              </td>
            </tr>
            <tr
              data-testid='table-row-element'
              className='group/row bg-primary even:bg-primary odd:bg-secondary'
            >
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                Dusa Foundation
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                40M
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                10%
              </td>
            </tr>
            <tr
              data-testid='table-row-element'
              className='group/row bg-primary even:bg-primary odd:bg-secondary'
            >
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                Massa
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                20M
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                5%
              </td>
            </tr>
            <tr
              data-testid='table-row-element'
              className='group/row bg-primary even:bg-primary odd:bg-secondary'
            >
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                Genesis Liquidity Pool
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                4M
              </td>
              <td className='px-6 py-4 group-first/body:group-first/row:first:rounded-tl-lg group-first/body:group-first/row:last:rounded-tr-lg group-last/body:group-last/row:first:rounded-bl-lg group-last/body:group-last/row:last:rounded-br-lg'>
                1%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className='mt-10 mb-4 font-semibold text-xl text-accent-80'>
        Community
      </h3>
      <p className='mt-4 mb-4 text-accent-80'>
        240M (60%) <code>$DUSA</code> tokens were distributed to the people who
        have played the biggest role in incubating Dusa and those likeliest to
        contribute to its long-term success, including:
      </p>
      <ul className='mt-4 mb-4 text-accent-80 list-disc list-inside'>
        <li>
          <code>$WEVE</code> holders (27%, 108M <code>$DUSA</code>)
        </li>
        <li>
          <code>$OP</code> network users (18%, 72M <code>$DUSA</code>)
          <ul className='mt-4 mb-4 text-accent-80 list-disc list-inside'>
            <li>
              3755 <code>$DUSA</code>/wallet — Addresses qualified as{' '}
              <a
                className='text-brand-500 hover:underline underline-offset-2 no-underline'
                href='https://community.optimism.io/docs/governance/airdrop-1/#optimism-early-adopters'
              >
                Repeat Massa Users
              </a>
            </li>
          </ul>
        </li>
        <li>
          Cross-chain DeFi users (15%, 60M <code>$DUSA</code>):
          <ul className='mt-4 mb-4 text-accent-80 list-disc list-inside'>
            <li>
              3500 <code>$DUSA</code>/wallet — Curve Protocol wallets with a
              1450+ days (maximum) <code>$veCRV</code> lock time
            </li>
            <li>
              3000 <code>$DUSA</code>/wallet — Convex Protocol lockers of{' '}
              <code>$vlCVX</code> since new lock contract deployment
            </li>
            <li>
              3000 <code>$DUSA</code>/wallet — Treasure DAO Genesis Mine{' '}
              <code>$MAGIC</code> stakers for 1- and 3-month periods
            </li>
            <li>
              2000 <code>$DUSA</code>/wallet — Platypus Protocol stakers with{' '}
              <code>$vePTP</code> and <code>$PTP</code> balance
            </li>
            <li>
              500 <code>$DUSA</code>/wallet — Redacted Cartel participants in
              genesis Dutch auction who didnt sell their <code>$BTRFLY</code>
            </li>
            <li>
              500 <code>$DUSA</code>/wallet — Eminence Finance wallets affected
              with EMN, eAAVE, eLINK, eYFI, eSNX or eCRV{' '}
              <a
                className='text-brand-500 hover:underline underline-offset-2 no-underline'
                href='https://github.com/banteg/your-eminence/blob/master/shot/01-balances.toml'
              >
                balance
              </a>
            </li>
          </ul>
        </li>
      </ul>
      <h3 className='mt-10 mb-4 font-semibold text-xl text-accent-80'>
        Protocols
      </h3>
      <p className='mt-4 mb-4 text-accent-80'>
        The airdrop of 72M (18%) <code>$veDUSA</code> is aimed at attracting and
        engaging 10-15 protocols most likely to contribute to Dusa and Massa
        long-term success.
      </p>
      <h3 className='mt-10 mb-4 font-semibold text-xl text-accent-80'>
        Grants
      </h3>
      <p className='mt-4 mb-4 text-accent-80'>
        24M (6%) <code>$veDUSA</code> were reserved to distribute to partner
        protocols after the launch. This was used to engage partners in the
        ecosystem through grants.
      </p>
      <h3 className='mt-10 mb-4 font-semibold text-xl text-accent-80'>
        Foundation
      </h3>
      <p className='mt-4 mb-4 text-accent-80'>
        The Foundation received an initial allocation that was used to vote to
        drive emissions to key protocol pairs such as <code>$DUSA-$USDC</code>{' '}
        and support ongoing protocol development. The total Foundation
        allocation was 40M (10%) in <code>$DUSA</code> and <code>$veDUSA</code>.
      </p>
      <p className='mt-4 mb-4 text-accent-80'>
        The Foundation vested 100% of its initial allocation in the form of
        <code>$veDUSA</code> and uses it to vote via the Dusa Protocol in
        perpetuity.
      </p>
      <p className='mt-4 mb-4 text-accent-80'>
        To help cover ongoing expenses and all the upcoming development efforts,
        3% of the emissions are going to the Foundation address. These emissions
        are used to lock and increase the Foundation $veDUSA holdings,
        distribute as incentives via the protocol, or engage in various efforts
        to further the distribution and adoption of the protocol.
      </p>
      <p className='mt-4 mb-4 text-accent-80'>Team compensation breakdown:</p>
      <ul className='mt-4 mb-4 text-accent-80 list-disc list-inside'>
        <li>
          15,520,816 <code>$DUSA</code> was set aside for contributor
          compensation. 0.5% of total emissions, taken from emissions to the
          Foundation described above, will be added to this total for dilution
          control during the 12-month compensation period. All team compensation
          has been distributed as of June 2023 with 15,345,334.2 DUSA bought
          back from team members and the remainder distributed as $DUSA.
        </li>
      </ul>
      <h3 className='mt-10 mb-4 font-semibold text-xl text-accent-80'>Massa</h3>
      <p className='mt-4 mb-4 text-accent-80'>
        Massa has a vested interest in ensuring that Dusa achieves its mission
        of serving as an ecosystem public good. Massa received 20M (5%)
        <code>$veDUSA</code> in the initial distribution, to support that
        interest.
      </p>
      <h3 className='mt-10 mb-4 font-semibold text-xl text-accent-80'>
        Genesis Liquidity Pools
      </h3>
      <p className='mt-4 mb-4 text-accent-80'>
        Genesis Pools distributed 4M (1%) <code>$DUSA</code> to liquidity
        providers of foundational token pairs to provide better liquidity and
        user experience from launch day. Genesis pool emissions were first
        directed to the
        <code>$DUSA</code>-<code>$USDC</code> pool and started a few days before
        the first epoch votes were cast.
      </p>
    </div>
  );
};
*/

export default Lock;
