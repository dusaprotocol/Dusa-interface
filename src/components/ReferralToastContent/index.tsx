import {
  faUsers,
  faInfoCircle,
  faWallet,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { toast } from 'react-toastify';

interface ReferralCodeDisplayProps {
  code: string;
  className?: string;
}

const ReferralCodeDisplay: React.FC<ReferralCodeDisplayProps> = ({
  code,
  className = ''
}) => {
  return (
    <span
      className={`font-bold text-blue-600 ${className}`}
      title={`Referral code: ${code}`}
    >
      {code}
    </span>
  );
};

interface ReferralToastContentProps {
  type: 'success' | 'warning' | 'info' | 'self-referral';
  code: string;
}

const ReferralToastContent = ({ type, code }: ReferralToastContentProps) => {
  const isWarning = type === 'warning';
  const isInfo = type === 'info';
  const isSelfReferral = type === 'self-referral';

  return (
    <div className='flex items-center gap-3'>
      <span>
        {isSelfReferral ? (
          <>
            You cannot use your own referral code{' '}
            <ReferralCodeDisplay code={code} />. Please share this code with
            others instead.
          </>
        ) : isWarning ? (
          <>
            Referral code <ReferralCodeDisplay code={code} /> detected, but you
            already have a referral. This code cannot be used.
          </>
        ) : isInfo ? (
          <>
            Referral code <ReferralCodeDisplay code={code} /> detected! Please
            connect your wallet to use it.
          </>
        ) : (
          <>
            Referral code <ReferralCodeDisplay code={code} /> detected! Go to
            JELLY page to use it.
          </>
        )}
      </span>
    </div>
  );
};

// Toast helper functions
export const showReferralSuccessToast = (code: string) => {
  toast.success(<ReferralToastContent type='success' code={code} />);
};

export const showReferralWarningToast = (code: string) => {
  toast.warning(<ReferralToastContent type='warning' code={code} />);
};

export const showReferralInfoToast = (code: string) => {
  toast.info(<ReferralToastContent type='info' code={code} />);
};

export const showSelfReferralWarningToast = (code: string) => {
  toast.warning(<ReferralToastContent type='self-referral' code={code} />);
};

export { ReferralCodeDisplay };
export default ReferralToastContent;
