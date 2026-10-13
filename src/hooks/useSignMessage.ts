import { useState, useContext } from 'react';
import { Web3Provider } from '@massalabs/massa-web3';
import { AccountWrapperContext } from 'context/AccountWrapperContext';

export const useSignMessage = () => {
  const [success, setSuccess] = useState(false);
  const [isConfirmPending, setIsConfirmPending] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [signature, setSignature] = useState('');
  const { client } = useContext(AccountWrapperContext);

  const sign = async (
    data: Parameters<typeof Web3Provider.prototype.sign>[0]
  ) => {
    if (!client) return;

    setIsConfirmPending(true);
    setSuccess(false);

    return client
      .sign(data)
      .then(async (res) => {
        setSuccess(true);
        setPublicKey(res.publicKey);
        setSignature(res.signature);
        return res;
      })
      .catch((err) => console.log(err))
      .finally(() => setIsConfirmPending(false));
  };

  return {
    isConfirmPending,
    success,
    sign,
    publicKey,
    signature
  };
};
