import { useContext, useState } from 'react';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import Modal from 'components/Modal';
import { SettingsContext, interfaceLevels } from 'context/SettingsContext';
import { getShowInterfaceAgain, setShowInterfaceAgain } from 'utils/storage';
import './index.scss';

const PopupTutorial = () => {
  const [showModal, setShowModal] = useState<boolean>(getShowInterfaceAgain());
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  const { interfaceLevel, setInterfaceLevel } = useContext(SettingsContext);

  return (
    <>
      {showModal && (
        <Modal
          showModal={showModal}
          setShowModal={setShowModal}
          title='DApp interface experience'
        >
          <div className='PopupTutorial'>
            <div className='slippage'>
              <span>
                Choose an interface level based on your DeFi experience
              </span>
              <div className='slippage-values'>
                {interfaceLevels.map((level, index) => {
                  return (
                    <button
                      key={index}
                      onClick={() => setInterfaceLevel(level)}
                      className={clsx(interfaceLevel == level && 'active')}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className='dont-show-container'>
              <span>
                You&apos;ll be able to change the interface level after
              </span>
              <div>
                <input
                  type='checkbox'
                  onChange={() => setDontShowAgain(!dontShowAgain)}
                />{' '}
                <span>Don&apos;t show this again</span>
              </div>
            </div>

            <Button
              text='Continue'
              variant='contained'
              onClick={() => {
                setShowModal(false);
                if (dontShowAgain) setShowInterfaceAgain(false);
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
};

export default PopupTutorial;
