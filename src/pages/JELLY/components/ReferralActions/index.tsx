import React, { useState } from 'react';
import { faCheck, faTimes, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from 'components/Button';
import { ReferralCodeDisplay } from 'components/ReferralToastContent';
import useReferralProcessing from 'hooks/useReferralProcessing';
import useReferralToast from 'hooks/useReferralToast';
import { clearReferralCode } from 'utils/storage';
import './index.scss';

const ReferralActions = () => {
  const { getStoredReferralCode, hasValidReferralCode } = useReferralToast();
  const { processReferralIfAvailable } = useReferralProcessing();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const referralCode = getStoredReferralCode();

  const handleAddReferral = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const processedCode = await processReferralIfAvailable();
      if (processedCode) {
        setMessage({
          type: 'success',
          text: `Referral code ${processedCode} has been successfully added!`
        });
        // After successful processing, the component will disappear due to hasValidReferralCode becoming false
        // The success message will be shown briefly before the component unmounts
      } else {
        setMessage({
          type: 'error',
          text: 'No referral code to process'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to process referral code. Please try again.'
      });
      console.error('Error processing referral:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineReferral = () => {
    clearReferralCode();
    setMessage({
      type: 'success',
      text: 'Referral code declined and removed.'
    });
  };

  // Clear message after 3 seconds to allow time for UI state transitions
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!hasValidReferralCode || !referralCode) {
    return null;
  }

  return (
    <div className='ReferralActions'>
      <div className='referral-actions-content'>
        <div className='referral-header'>
          <FontAwesomeIcon icon={faUsers} className='referral-icon' />
          <span className='referral-title'>Pending Referral</span>
        </div>

        <div className='referral-code-display'>
          <span>
            You have a referral code:{' '}
            <ReferralCodeDisplay code={referralCode} />
          </span>
        </div>

        {message && (
          <div className={`referral-message ${message.type}`}>
            <FontAwesomeIcon
              icon={message.type === 'success' ? faCheck : faTimes}
              className='message-icon'
            />
            <span>{message.text}</span>
          </div>
        )}

        <div className='referral-buttons'>
          <Button
            text=''
            variant='contained'
            onClick={handleAddReferral}
            pending={isProcessing}
            disabled={isProcessing || !!message}
          >
            <span className='whitespace-nowrap'>Add Referral</span>
          </Button>
          <Button
            text='Decline'
            variant='outlined'
            onClick={handleDeclineReferral}
            disabled={isProcessing || !!message}
          />
        </div>
      </div>
    </div>
  );
};

export default ReferralActions;
