import React, { useState } from 'react';
import { faAngleDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx/lite';
import Modal from 'components/Modal';
import Spinner from 'components/Spinner';
import { Allowance, Token } from 'utils/types';
import './index.scss';

interface ButtonAllowanceProps {
  onClick:
    | React.ButtonHTMLAttributes<HTMLButtonElement>['onClick']
    | (() => void);
  allowanceType: Allowance;
  setAllowanceType: React.Dispatch<React.SetStateAction<Allowance>>;
  token: Token;
  pending?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  stretch?: boolean;
}

const ButtonAllowance = ({
  onClick,
  allowanceType,
  setAllowanceType,
  token,
  pending,
  disabled,
  children,
  stretch
}: ButtonAllowanceProps) => {
  const permanent = allowanceType === 'increaseMax';
  const [showModal, setShowModal] = useState(false);

  const onButtonClick = () => {
    setShowModal(false);
    return true; // chainable
  };

  return (
    <>
      <div className={clsx('ButtonAllowance', stretch && 'w-full')}>
        <button disabled={disabled || pending} onClick={onClick}>
          {pending && <Spinner size={25} />}
          <span>
            Increase {token.symbol} allowance {permanent ? 'permanently' : ''}
          </span>
          {children}
        </button>
        <button
          onClick={() => {
            setShowModal(true);
            document.body.style.overflow = 'hidden';
          }}
        >
          <FontAwesomeIcon icon={faAngleDown} />
        </button>
      </div>
      {showModal && (
        <Modal
          showModal={showModal}
          setShowModal={setShowModal}
          title='Approval method'
        >
          <div className='Modal-body'>
            <button
              className={clsx(
                'Modal-body-container',
                !permanent && 'active-body-container'
              )}
              onClick={() => onButtonClick() && setAllowanceType('increase')}
            >
              <span>Approve one-time only</span>
              <span>
                You&apos;ll increase your allowance only by the desired amount
                of {token.symbol}
              </span>
            </button>
            <button
              className={clsx(
                'Modal-body-container',
                permanent && 'active-body-container'
              )}
              onClick={() => onButtonClick() && setAllowanceType('increaseMax')}
            >
              <span>Approve unlimited amount</span>
              <span>
                You won&apos;t need to increase your allowance again next time
                you want to spend {token.symbol}
              </span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ButtonAllowance;
