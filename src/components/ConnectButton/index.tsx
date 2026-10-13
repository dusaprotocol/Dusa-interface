import { useContext } from 'react';
import Button, { ButtonProps } from 'components/Button';
import { AccountWrapperContext } from 'context/AccountWrapperContext';

const ConnectButton = (props: Partial<ButtonProps>) => {
  const { setShowDrawer } = useContext(AccountWrapperContext);

  return (
    <Button
      text='Connect Wallet'
      onClick={() => {
        setShowDrawer((prev) => !prev);
      }}
      variant='contained'
      {...props}
    />
  );
};

export default ConnectButton;
