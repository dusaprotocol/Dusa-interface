import { useState, useContext, useEffect } from 'react';
import { faInfoCircle, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Mas } from '@massalabs/massa-web3';
import clsx from 'clsx/lite';
import Button from 'components/Button';
import { SimpleInfo } from 'components/Info';
import Modal, { ModalProps } from 'components/Modal';
import TokenInput from 'components/TokenInput';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendMas } from 'hooks/useSendMas';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { isAddressValid, printAddress } from 'utils/methods';
import {
  getRecentSendAddresses,
  addRecentSendAddress,
  removeRecentSendAddress,
  RecentSendAddress
} from 'utils/storage';
import { MASSA, WMAS } from 'utils/tokens';
import { buildTransferTokenTx } from 'utils/transactionBuilder';
import { trpc } from 'utils/trpc';
import { Token, TokenInfo } from 'utils/types';
import './SendTokenModal.scss';

interface SendTokenModalProps extends ModalProps {
  tokensInfo: TokenInfo[] | undefined;
}

const SendTokenModal = ({
  showModal,
  setShowModal,
  tokensInfo
}: SendTokenModalProps) => {
  const [selectedTokenInfo, setSelectedTokenInfo] = useState<TokenInfo>();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [recentAddresses, setRecentAddresses] = useState<RecentSendAddress[]>(
    []
  );
  const selectedToken = selectedTokenInfo?.token;

  const { connectedAddress } = useContext(AccountWrapperContext);

  const valueQuery = trpc.getTokenValue.useQuery(
    {
      tokenAddress: selectedToken?.address || '',
      tokenDecimals: selectedToken?.decimals || 0
    },
    { enabled: !!selectedToken?.address }
  );
  const dollarValue = valueQuery.data || 0;

  useEffect(() => {
    if (!showModal || !connectedAddress) return;

    const recent = getRecentSendAddresses(connectedAddress);
    setRecentAddresses(recent);

    if (selectedToken || !tokensInfo) return;
    const massaInfo = tokensInfo.find(
      (ti) => ti.token.address === MASSA.address
    );
    if (massaInfo) setSelectedTokenInfo(massaInfo);
  }, [showModal, connectedAddress, selectedToken, tokensInfo]);

  const handleTokenSelect = (token: Token) => {
    const tokenInfo = tokensInfo?.find(
      (t) => t.token.address === token.address
    );
    setSelectedTokenInfo(tokenInfo);
  };

  const handleAddressSelect = (address: string) => {
    setRecipientAddress(address);
    setError('');
  };

  const handleRemoveRecentAddress = (address: string) => {
    if (!connectedAddress) return;
    removeRecentSendAddress(connectedAddress, address);
    const updated = getRecentSendAddresses(connectedAddress);
    setRecentAddresses(updated);
  };

  const allTokens = tokensInfo?.map((ti) => ti.token) || [];

  const isNativeMassa = selectedToken?.address === MASSA.address;

  const data =
    selectedToken && selectedTokenInfo && !isNativeMassa
      ? buildTransferTokenTx(
          selectedToken.address,
          recipientAddress,
          BigInt(
            Math.floor(parseFloat(amount || '0') * 10 ** selectedToken.decimals)
          )
        )
      : undefined;

  const transferMasData =
    selectedToken && isNativeMassa && amount && recipientAddress
      ? {
          amount: Mas.fromString(amount),
          recipient: recipientAddress
        }
      : undefined;

  const { pending: pendingToken, submitTx: submitTokenTx } = useSendTransaction(
    {
      data,
      onTxConfirmed: () => {
        if (connectedAddress && recipientAddress) {
          addRecentSendAddress(connectedAddress, recipientAddress);
        }
        handleClose();
      }
    }
  );

  const { pending: pendingMas, submitTx: submitMasTx } = useSendMas({
    transferMasData,
    onTxConfirmed: () => {
      if (connectedAddress && recipientAddress) {
        addRecentSendAddress(connectedAddress, recipientAddress);
      }
      handleClose();
    }
  });

  const pending = isNativeMassa ? pendingMas : pendingToken;

  const resetForm = () => {
    setSelectedTokenInfo(undefined);
    setRecipientAddress('');
    setAmount('');
    setError('');
  };

  const validateForm = (): boolean => {
    setError('');

    if (!selectedToken || !selectedTokenInfo) {
      setError('Please select a token');
      return false;
    }

    if (!recipientAddress.trim()) {
      setError('Please enter a recipient address');
      return false;
    }

    if (!isAddressValid(recipientAddress)) {
      setError('Invalid recipient address');
      return false;
    }

    if (recipientAddress === connectedAddress) {
      setError('Cannot send tokens to yourself');
      return false;
    }

    if (!amount.trim()) {
      setError('Please enter an amount');
      return false;
    }

    const parsedAmount = Number(amount) * 10 ** selectedToken.decimals;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Invalid amount');
      return false;
    }

    const maxAmount = selectedTokenInfo.balance;

    if (parsedAmount > maxAmount) {
      setError(
        `Insufficient balance. Maximum: ${maxAmount} ${selectedToken.symbol}`
      );
      return false;
    }

    return true;
  };

  const handleSend = () => {
    if (!validateForm()) return;
    if (isNativeMassa) {
      submitMasTx();
    } else {
      submitTokenTx();
    }
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <Modal
      title='Send Tokens'
      showModal={showModal}
      setShowModal={setShowModal}
      variant='medium'
      onClose={resetForm}
    >
      <div className='SendTokenModal'>
        <SimpleInfo
          text='Send tokens to another address. Make sure to double-check the recipient as it cannot be reverted.'
          icon={faInfoCircle}
        />

        <div className='form-group'>
          <TokenInput
            headerText='From'
            token={selectedToken}
            quantity={amount}
            changeQuantity={(q?: string) => setAmount(q || '')}
            changeToken={handleTokenSelect}
            balance={selectedTokenInfo?.balance}
            quoteAssets={allTokens}
            isError={!!error && error.includes('Insufficient balance')}
            placeholder='0.0'
            preventScrollRestore={true}
            dollarValue={dollarValue}
          />
        </div>

        <div className='form-group'>
          <label>Recipient Address</label>

          {recentAddresses.length > 0 && (
            <div className='recent-addresses'>
              <span className='recent-addresses-label'>Recent addresses:</span>
              <div className='recent-addresses-list'>
                {recentAddresses.map((recent) => (
                  <div
                    key={recent.address}
                    className={clsx(
                      'recent-address-chip',
                      recipientAddress === recent.address && 'selected'
                    )}
                    onClick={() => handleAddressSelect(recent.address)}
                  >
                    <span className='address-text'>
                      {printAddress(recent.address)}
                    </span>
                    <button
                      type='button'
                      className='remove-address-btn'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRecentAddress(recent.address);
                      }}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            type='text'
            placeholder='Enter wallet address'
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className='address-input'
          />
        </div>

        {error && <div className='error-message'>{error}</div>}

        <Button
          text='Send'
          variant='contained'
          onClick={handleSend}
          pending={pending}
          disabled={!selectedToken || !recipientAddress || !amount}
          stretch={false}
        />
      </div>
    </Modal>
  );
};

export default SendTokenModal;
