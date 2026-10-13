import { faLock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import TokenLogo from 'components/TokenLogo';
import { printBigintIsh } from 'utils/methods';
import { DUSA_MAIN } from 'utils/tokens';
import { Lock } from 'utils/types';
dayjs.extend(relativeTime);
import { TokenAmount } from '@dusalabs/sdk';
import './index.scss';

interface LockThumbnailProps {
  lock: Lock;
  isManagedVote?: boolean;
}

const LockThumbnail = ({ lock, isManagedVote = false }: LockThumbnailProps) => {
  // Use voting power directly from lock object
  const votingPower = lock.votingPower;

  return (
    <div className='LockThumbnail'>
      <Thumbnail />
      <div>
        <div className='lockId'>
          <span>Lock #{lock.id}</span>
          <FontAwesomeIcon icon={faLock} />
        </div>
        <div className='lockInfo'>
          {isManagedVote ? (
            <>
              <span>{printBigintIsh(DUSA_MAIN, votingPower)}</span>
              <span> voting power</span>
            </>
          ) : (
            <>
              <span>
                {new TokenAmount(DUSA_MAIN, lock.amount).toSignificant(8)}
              </span>
              <span>
                {' '}
                DUSA{' '}
                {lock.timestamp === 0
                  ? 'permanently locked'
                  : lock.timestamp > Date.now()
                    ? 'locked for'
                    : 'unlocked'}{' '}
              </span>
              <span>
                {lock.timestamp === 0
                  ? ''
                  : dayjs(lock.timestamp).fromNow(lock.timestamp > Date.now())}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Thumbnail = () => {
  return <TokenLogo logoURI={DUSA_MAIN.logoURI} />;
};

export default LockThumbnail;
