import React, { useContext, useEffect, useState, useRef } from 'react';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Web3Provider } from '@massalabs/massa-web3';
import Button from 'components/Button';
import Dropdown from 'components/Dropdown';
import Info, { Warning } from 'components/Info';
import SwitchButton from 'components/SwitchButton';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { SettingsContext } from 'context/SettingsContext';
import { FEATURE_FLAGS, MASSA_CHAIN_ID } from 'utils/config';
import { MCAP } from 'utils/constants';
import { formatNumber, printUSD, withTimeoutRejection } from 'utils/methods';
import './index.scss';
import { getRPCURL, setRPCURL } from 'utils/storage';

const GlobalSettings = () => {
  const [showDropDown, setShowDropDown] = useState(false);
  const initialRPCRef = useRef(getRPCURL());

  const [rpcInput, setRpcInput] = useState(initialRPCRef.current);
  const [savedRPC, setSavedRPC] = useState(initialRPCRef.current);
  const [isSavingRPC, setIsSavingRPC] = useState(false);

  const [textNotif, setTextNotif] = useState<string>();
  const [showNotif, setShowNotif] = useState(false);

  const {
    interfaceTheme,
    setInterfaceTheme,
    isOverlay,
    setIsOverlay,
    airdropMcap,
    setAirdropMcap,
    simulateTx,
    setSimulateTx
  } = useContext(SettingsContext);

  const [airdropMcapValue, setAirdropMcapValue] = useState(
    formatNumber(airdropMcap)
  );
  const { selectedProvider } = useContext(AccountWrapperContext);

  useEffect(() => {
    selectedProvider?.networkInfos().then(console.log);
  }, [selectedProvider]);

  const isUnsyncedRPC = savedRPC !== initialRPCRef.current;

  const minMcap = 1;
  const maxMcap = 1_000_000_000;
  const handleAirdropMcapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? minMcap : parseFloat(e.target.value);
    if (value < minMcap) setMCAP(minMcap);
    else if (value > maxMcap) setMCAP(maxMcap);
    else setMCAP(value);
  };

  const setMCAP = (value: number) => {
    setAirdropMcap(value);
    setAirdropMcapValue(value.toString());
  };

  const toggleTheme = (style: string) => {
    if (interfaceTheme === style) {
      if (style === 'Dusa') setInterfaceTheme('Halloween');
      else setInterfaceTheme('Dusa');
      return;
    }
    setInterfaceTheme(style);
  };

  const handleSaveRPC = async () => {
    const trimmed = rpcInput.trim();

    if (trimmed === '') {
      setRPCURL('');
      setSavedRPC('');
      setRpcInput('');
      setTextNotif('Custom RPC removed. Default RPC used instead.');
      setShowNotif(true);
      setIsSavingRPC(false);
      return;
    }

    try {
      if (!trimmed.startsWith('https://')) {
        setTextNotif(
          'RPC URL must start with "https://". Please check the URL and try again.'
        );
        setShowNotif(true);
        setIsSavingRPC(false);
        return;
      }
      const client = Web3Provider.fromRPCUrl(trimmed);
      await new Promise((resolve) => setTimeout(resolve, 3_000));

      const nodeStatus = await withTimeoutRejection(
        client.getNodeStatus(),
        1_000
      );

      if (nodeStatus.chainId === Number(MASSA_CHAIN_ID)) {
        setRPCURL(trimmed);
        setSavedRPC(trimmed);
        setTextNotif(`Custom RPC (${trimmed}) saved.`);
      } else {
        setTextNotif('Invalid RPC URL. Please check the URL and try again.');
      }
    } catch {
      setTextNotif('Invalid RPC URL. Please check the URL and try again.');
    } finally {
      setShowNotif(true);
      setIsSavingRPC(false);
    }
  };

  return (
    <Dropdown
      isOpen={showDropDown}
      setIsOpen={setShowDropDown}
      triggerButton={
        <div className='text-base'>
          <FontAwesomeIcon icon={faGear} />
        </div>
      }
      position='bottom left'
    >
      <div className='settings-container'>
        {/* {FEATURE_FLAGS.POINTS_V2 && (
          <div className='global-setting'>
            <div className='dusa-fdv-container'>
              <h3>JELLY Settings</h3>
              <div className='dusa-fdv-content'>
                <span style={{ fontStyle: 'italic' }}>
                  JELLY is currently non-transferable.
                </span>
                <span>
                  Set & save a fully diluted valuation below to update the net
                  APR.
                </span>
                <div className='dusa-fdv-values'>
                  <span>$</span>
                  <div className='custom-fdv'>
                    <input
                      type='text'
                      inputMode='decimal'
                      min={minMcap}
                      max={maxMcap}
                      value={airdropMcapValue}
                      placeholder={printUSD(MCAP, false)}
                      onChange={handleAirdropMcapChange}
                      onFocus={() =>
                        setAirdropMcapValue(
                          airdropMcapValue.replace(/[,.]/g, '')
                        )
                      }
                      onBlur={() =>
                        setAirdropMcapValue(formatNumber(airdropMcap))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )} */}
        <div className='global-setting'>
          <h3>Interface Settings</h3>
          <div className='settings-content'>
            {[
              { theme: 'Dusa 🪼' },
              { theme: 'Halloween 🎃' },
              { theme: 'Winter ❄️', sub: 'Snowflakes' }
            ].map((item) => {
              const theme = item.theme.split(' ')[0];
              const sub = item.sub;
              return (
                <div className='settings-theme' key={theme}>
                  <div className='settings-theme-item'>
                    <span>{item.theme}</span>
                    <SwitchButton
                      isActive={interfaceTheme === theme}
                      onClick={() => toggleTheme(theme)}
                    />
                  </div>
                  {sub === 'Snowflakes' && interfaceTheme === 'Winter' && (
                    <div className='settings-theme-item'>
                      <span className='tabulation'>{sub}</span>
                      <SwitchButton
                        isActive={isOverlay}
                        onClick={() => setIsOverlay(!isOverlay)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className='global-setting'>
          <h3>Transaction Settings</h3>
          <div className='settings-content'>
            <div className='settings-theme'>
              <div className='settings-theme-item'>
                <span>Simulate transactions</span>
                <SwitchButton
                  isActive={simulateTx}
                  onClick={() => setSimulateTx(!simulateTx)}
                />
              </div>
            </div>
            <span className='text-left text-sm text-[rgb(118,158,173)]'>
              When enabled, transactions are simulated before being sent to
              detect potential errors. Disable if you experience issues.
            </span>
          </div>
        </div>
        <div className='global-setting'>
          <h3>RPC Settings</h3>
          <div className='settings-content'>
            <span className='text-left text-sm'>
              Add your personal RPC URL here (must use https). When saved,
              reload the page to apply changes. Saved locally in your browser.
            </span>
            <div className='flex flex-wrap gap-2'>
              <input
                type='text'
                value={rpcInput}
                placeholder='Default RPC'
                onChange={(e) => setRpcInput(e.target.value)}
                className='flex-1 rounded-lg bg-[var(--hover-bg)] p-2 focus-within:outline-none'
              />
              <Button
                text='Save'
                variant='outlined'
                stretch
                onClick={async () => {
                  await new Promise((resolve) => {
                    setIsSavingRPC(true);
                    setTimeout(resolve, 500);
                  });
                  handleSaveRPC();
                }}
                disabled={rpcInput === savedRPC}
                pending={isSavingRPC}
              />
              {showNotif && (
                <Notif
                  text={textNotif}
                  show={showNotif}
                  setShow={setShowNotif}
                />
              )}
            </div>

            {isUnsyncedRPC && (
              <Button
                text='Refresh page to enable new RPC'
                variant='outlined'
                onClick={() => {
                  window.location.reload();
                }}
              />
            )}

            <Warning text='Leave blank if you want to use the default RPC' />

            <span className='text-[0.5rem] text-[rgb(118,158,173)]'>
              {import.meta.env.VITE_COMMIT_HASH || 'dev'}
            </span>
          </div>
        </div>
      </div>
    </Dropdown>
  );
};

export default GlobalSettings;

interface NotifProps {
  text: string | undefined;
  show: boolean;
  setShow: (show: boolean) => void;
}

const Notif = ({ text, show, setShow }: NotifProps) => {
  useEffect(() => {
    if (!text) return;

    const timer = setTimeout(() => {
      setShow(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [show, text]);

  return (
    <Info className='w-full' icon={faQuestionCircle}>
      <span>{text}</span>
    </Info>
  );
};
