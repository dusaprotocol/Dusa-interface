import { useContext, useEffect, useRef, useState } from 'react';
import { parseUnits } from '@massalabs/massa-web3';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import Modal, { ModalProps } from 'components/Modal';
import SingleSlider from 'components/SingleSlide';
import './index.scss';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolContext } from 'pages/Pool';
import { tokenPledgeAddresses } from 'utils/constants';
import { getWmasIfMas } from 'utils/coreMethods';
import { printBigintIsh, roundTokenAmount } from 'utils/methods';
import { getClaimedFeesToDonate, setClaimedFeesToDonate } from 'utils/storage';
import { buildTransferTokenTx } from 'utils/transactionBuilder';
import { Token } from 'utils/types';

interface TokenPledgeModalProps extends ModalProps {
  token0: Token;
  token1: Token;
  amounts: {
    amount0: bigint;
    amount1: bigint;
  };
  setAmounts: (amounts: { amount0: bigint; amount1: bigint }) => void;
}

const TokenPledgeModal = ({
  showModal,
  setShowModal,
  token0,
  token1,
  amounts,
  setAmounts
}: TokenPledgeModalProps) => {
  const { connectedAddress } = useContext(AccountWrapperContext);
  const { pairAddress } = useContext(PoolContext);
  const [sliderValue, setSliderValue] = useState(60);
  const [campaignIndex, setCampaignIndex] = useState(0);
  const [amount0, setAmount0] = useState(amounts.amount0);
  const [amount1, setAmount1] = useState(amounts.amount1);

  const amount0Ref = useRef(amount0);
  const amount1Ref = useRef(amount1);

  useEffect(() => {
    amount0Ref.current = amount0;
  }, [amount0]);
  useEffect(() => {
    amount1Ref.current = amount1;
  }, [amount1]);

  const amount0Percentaged = parseUnits(
    ((roundTokenAmount(token0, amount0) * sliderValue) / 100).toFixed(
      token0.decimals
    ),
    token0.decimals
  );
  const amount1Percentaged = parseUnits(
    ((roundTokenAmount(token1, amount1) * sliderValue) / 100).toFixed(
      token1.decimals
    ),
    token1.decimals
  );

  const handleStorageFeesToDonate = (sentAmount: bigint, isToken0: boolean) => {
    const claimableFeesStorage = getClaimedFeesToDonate(
      connectedAddress,
      pairAddress
    );
    setClaimedFeesToDonate(connectedAddress, pairAddress, {
      amount0: claimableFeesStorage.amount0 - (isToken0 ? sentAmount : 0n),
      amount1: claimableFeesStorage.amount1 - (!isToken0 ? sentAmount : 0n)
    });
    isToken0
      ? setAmount0(amount0Ref.current - sentAmount)
      : setAmount1(amount1Ref.current - sentAmount);
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      title='Donate to'
      onClose={() => setAmounts({ amount0, amount1 })}
    >
      <div className='TokenPledgeModal'>
        <h4>
          Choose the campaign that will benefit from your generous contribution:
        </h4>
        <div className='campaign-container'>
          {[
            {
              title: 'Myanmar earthquake',
              link: 'https://i.abcnewsfe.com/a/fe4632c1-c166-4f85-82e4-65f63eb3a31f/Maynmar-damage-250403_1743668994720_hpMain.jpg',
              description:
                'Myanmar earthquake death toll tops 3,000 with hundreds still missing',
              more: 'https://abcnews.go.com/International/wireStory/myanmar-earthquake-death-toll-tops-3000-hundreds-missing-98212382'
            },
            {
              title: 'Myanmar earthquake',
              link: 'https://i.abcnewsfe.com/a/fe4632c1-c166-4f85-82e4-65f63eb3a31f/Maynmar-damage-250403_1743668994720_hpMain.jpg',
              description:
                'Myanmar earthquake death toll tops 3,000 with hundreds still missing',
              more: 'https://abcnews.go.com/International/wireStory/myanmar-earthquake-death-toll-tops-3000-hundreds-missing-98212382'
            }
          ].map((campaign, index) => {
            return (
              <div
                key={index}
                className={clsx(
                  'campaign',

                  campaignIndex === index && 'selected'
                )}
                onClick={() => setCampaignIndex(index)}
              >
                <h4>{campaign.title}</h4>
                <div
                  className={clsx(
                    'campaign-content',
                    index % 2 === 0 && 'invert-description'
                  )}
                >
                  <div className='description-container'>
                    <div className='description'>{campaign.description}</div>
                    <div className='more'>
                      <a
                        href={campaign.more}
                        target='_blank'
                        rel='noreferrer noopener'
                        onClick={(e) => e.stopPropagation()}
                      >
                        More info
                      </a>
                    </div>
                  </div>
                  <img src={campaign.link} alt={`Campaign ${index}`} />
                </div>
              </div>
            );
          })}
        </div>

        <SingleSlider value={sliderValue} setValue={setSliderValue} />
        {amount0 > 0n && (
          <SendTokenButton
            token={token0}
            amount={amount0Percentaged}
            updateParentAmount={(sentAmount: bigint) =>
              handleStorageFeesToDonate(sentAmount, true)
            }
            disabled={amount0Percentaged === 0n}
          />
        )}
        {amount1 > 0n && (
          <SendTokenButton
            token={token1}
            amount={amount1Percentaged}
            updateParentAmount={(sentAmount: bigint) =>
              handleStorageFeesToDonate(sentAmount, false)
            }
            disabled={amount1Percentaged === 0n}
          />
        )}
        {amount0 === 0n && amount1 === 0n && (
          <Button
            text='Close'
            variant='contained'
            onClick={() => setShowModal(false)}
          />
        )}
      </div>
    </Modal>
  );
};

export default TokenPledgeModal;

interface SendTokenButtonProps {
  token: Token;
  amount: bigint;
  updateParentAmount: (sentAmount: bigint) => void;
  disabled: boolean;
}

const SendTokenButton = ({
  token,
  amount,
  updateParentAmount,
  disabled
}: SendTokenButtonProps) => {
  const amountSentRef = useRef(0n);

  const handleAmountSent = (value: bigint) => {
    amountSentRef.current += value;
  };

  const { submitTx, pending } = useSendTransaction({
    data: buildTransferTokenTx(
      getWmasIfMas(token).address,
      tokenPledgeAddresses[0],
      amount
    ),
    onTxConfirmed: () => updateParentAmount(amount)
  });

  return (
    <Button
      text={`Send ${printBigintIsh(token, amount, 3)} ${getWmasIfMas(token).symbol}`}
      pending={pending}
      disabled={disabled}
      variant='contained'
      onClick={() => {
        submitTx();
        handleAmountSent(amount);
      }}
    />
  );
};
