import { useContext, useState } from 'react';
import { parseUnits } from '@dusalabs/sdk';
import {
  faRocket,
  faCoins,
  faPercent,
  faSignature,
  faFileContract,
  faWallet,
  faCheckCircle,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import Button from 'components/Button';
import ConnectButton from 'components/ConnectButton';
import Modal from 'components/Modal';
import PageHeader from 'components/PageHeader';
import { SimpleTooltip } from 'components/Tooltip';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { routeNames } from 'routes';
import { factorySC, factoryV2SC } from 'utils/config';
import {
  blockInvalidChar,
  isAddressValid,
  getIdFromPrice
} from 'utils/methods';
import { WMAS } from 'utils/tokens';
import { buildDeployFloorTx } from 'utils/transactionBuilder';
import './index.scss';

const DeployFloor = () => {
  // Floor token params (tokenY=WMAS and factory=factoryV2SC are constants)
  const [price, setPrice] = useState('');
  // const [binStep, setBinStep] = useState('');
  const binStep = 20;
  const [floorPerBin, setFloorPerBin] = useState('');

  // Transfer tax token params
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [taxRecipient, setTaxRecipient] = useState('');

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deployedFloorAddress, setDeployedFloorAddress] = useState('');

  const { connected } = useContext(AccountWrapperContext);

  // Address validation
  const isRecipientValid = isAddressValid(taxRecipient);

  // Calculate active bin ID from price
  const activeId =
    price && !isNaN(parseFloat(price)) && parseFloat(price) > 0
      ? getIdFromPrice(parseFloat(price) / 10 ** (18 - 9), binStep)
      : undefined;

  const isFormValid =
    price !== '' &&
    !isNaN(parseFloat(price)) &&
    parseFloat(price) > 0 &&
    activeId !== undefined &&
    // binStep !== '' &&
    // !isNaN(parseInt(binStep)) &&
    floorPerBin !== '' &&
    parseFloat(floorPerBin) > 0 &&
    name.trim() !== '' &&
    symbol.trim() !== '' &&
    taxRate !== '' &&
    parseFloat(taxRate) >= 0 &&
    parseFloat(taxRate) <= 100 &&
    initialSupply !== '' &&
    taxRecipient.trim() !== '' &&
    isRecipientValid;

  // Build transaction data only when form is valid
  let txData;
  try {
    if (isFormValid) {
      txData = buildDeployFloorTx(
        WMAS.address, // Quote token (always WMAS)
        factorySC,
        activeId,
        20, //parseInt(binStep),
        parseUnits(floorPerBin, 18).toString(),
        name,
        symbol,
        18, // decimals
        parseUnits(initialSupply, 18).toString(),
        parseFloat(taxRate),
        taxRecipient
      );
    }
  } catch (error) {
    // Transaction builder not yet implemented
    txData = undefined;
  }

  const { submitTx, pending } = useSendTransaction({
    data: txData,
    onTxConfirmed: (events) => {
      // Parse the floor address from the last event (format: NEW_FLOOR:address)
      const eventsMsg = events.map((event) => event.data);
      const lastEvent = eventsMsg[eventsMsg.length - 1];

      if (lastEvent && lastEvent.startsWith('NEW_FLOOR:')) {
        const floorAddress = lastEvent.split(':')[1];
        setDeployedFloorAddress(floorAddress);
        setShowSuccessModal(true);
      }

      // Reset form on success
      setPrice('');
      setFloorPerBin('');
      setName('');
      setSymbol('');
      setTaxRate('');
      setInitialSupply('');
      setTaxRecipient('');
    }
  });

  const handleDeploy = () => {
    if (!isFormValid) return;

    submitTx();
  };

  return (
    <div className='DeployFloor'>
      <PageHeader
        title='Deploy FLOOR Token'
        description='Create your own FLOOR token with Risk-Free Value protection'
      />

      <div className='deploy-container'>
        <div className='deploy-card'>
          <div className='form-container'>
            <h3 className='section-title'>Token Configuration</h3>

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faSignature} />
                <SimpleTooltip
                  title='Token Name'
                  description='The full name of your FLOOR token (e.g., "My Floor Token")'
                  position='top'
                />
              </label>
              <input
                type='text'
                placeholder='Enter token name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faFileContract} />
                <SimpleTooltip
                  title='Token Symbol'
                  description='The ticker symbol for your token (e.g., "FLOOR")'
                  position='top'
                />
              </label>
              <input
                type='text'
                placeholder='Enter token symbol'
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                maxLength={10}
              />
            </div>

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faCoins} />
                <SimpleTooltip
                  title='Initial Supply'
                  description='The initial token supply that will be minted to your address'
                  position='top'
                />
              </label>
              <input
                type='number'
                placeholder='0.0'
                value={initialSupply}
                onChange={(e) => setInitialSupply(e.target.value)}
                onKeyDown={blockInvalidChar}
                min='0'
                step='any'
              />
            </div>

            <h3 className='section-title'>Floor Configuration</h3>

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faCoins} />
                <SimpleTooltip
                  title='Initial Price'
                  description='The initial price for your floor token in WMAS per token'
                  position='top'
                />
              </label>
              <input
                type='number'
                placeholder='Enter initial price (e.g., 1.0)'
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={blockInvalidChar}
                min='0'
                step='any'
              />
              {activeId !== undefined && (
                <span className='helper-text'>Active Bin ID: {activeId}</span>
              )}
            </div>

            {/* <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faCoins} />
                <SimpleTooltip
                  title='Bin Step'
                  description='The bin step determines price precision (e.g., 1, 5, 10, 25)'
                  position='top'
                />
              </label>
              <input
                type='number'
                placeholder='Enter bin step (e.g., 10)'
                value={binStep}
                onChange={(e) => setBinStep(e.target.value)}
                min='1'
                step='1'
              />
            </div> */}

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faCoins} />
                <SimpleTooltip
                  title='FLOOR Per Bin'
                  description='The amount of FLOOR tokens to seed in each bin'
                  position='top'
                />
              </label>
              <input
                type='number'
                placeholder='Enter FLOOR per bin amount'
                value={floorPerBin}
                onChange={(e) => setFloorPerBin(e.target.value)}
                onKeyDown={blockInvalidChar}
                min='0'
                step='any'
              />
            </div>

            <h3 className='section-title'>Tax Configuration</h3>

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faPercent} />
                <SimpleTooltip
                  title='Tax Rate'
                  description='The transaction tax rate percentage (0-100%). This fee can be used for buybacks or other mechanisms.'
                  position='top'
                />
              </label>
              <div className='input-with-suffix'>
                <input
                  type='number'
                  placeholder='0.0'
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  onKeyDown={blockInvalidChar}
                  min='0'
                  max='100'
                  step='0.1'
                />
                <span className='input-suffix'>%</span>
              </div>
            </div>

            <div className='form-group'>
              <label>
                <FontAwesomeIcon icon={faWallet} />
                <SimpleTooltip
                  title='Tax Recipient'
                  description='Recipient address for transfer tax fees. Must be a valid Massa address.'
                  position='top'
                />
              </label>
              <input
                type='text'
                placeholder='Enter Massa address (AU...)'
                value={taxRecipient}
                onChange={(e) => setTaxRecipient(e.target.value)}
                className={
                  taxRecipient.trim() !== '' && !isRecipientValid
                    ? 'invalid-address'
                    : ''
                }
              />
              {taxRecipient.trim() !== '' && !isRecipientValid && (
                <span className='error-message'>Invalid Massa address</span>
              )}
            </div>

            <div className='deploy-button-container'>
              {!connected ? (
                <ConnectButton />
              ) : (
                <Button
                  text='Deploy FLOOR Token'
                  onClick={handleDeploy}
                  pending={pending}
                  disabled={!isFormValid}
                  variant='contained'
                  icon={faRocket}
                />
              )}
            </div>

            {!isFormValid && connected && (
              <div className='validation-hints'>
                <ul>
                  {!price && <li>Initial price is required</li>}
                  {price !== '' &&
                    (isNaN(parseFloat(price)) || parseFloat(price) <= 0) && (
                      <li>Price must be a positive number</li>
                    )}
                  {!floorPerBin ||
                    (parseFloat(floorPerBin) <= 0 && (
                      <li>FLOOR per bin is required</li>
                    ))}
                  {!name.trim() && <li>Token name is required</li>}
                  {!symbol.trim() && <li>Token symbol is required</li>}
                  {taxRate === '' && <li>Tax rate is required</li>}
                  {taxRate !== '' &&
                    (parseFloat(taxRate) < 0 || parseFloat(taxRate) > 100) && (
                      <li>Tax rate must be between 0 and 100</li>
                    )}
                  {initialSupply === '' && <li>Initial supply is required</li>}
                  {!taxRecipient.trim() && (
                    <li>Tax recipient address is required</li>
                  )}
                  {taxRecipient.trim() !== '' && !isRecipientValid && (
                    <li>Tax recipient address is invalid</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className='info-card'>
          <h3>What is a FLOOR Token?</h3>
          <p>
            FLOOR tokens implement a Risk-Free Value (RFV) mechanism that
            provides a guaranteed price floor for token holders through
            concentrated liquidity management.
          </p>
          <div className='info-features'>
            <div className='feature-item'>
              <FontAwesomeIcon icon={faCoins} />
              <div>
                <strong>Price Floor Protection</strong>
                <span>
                  Guaranteed minimum price backed by concentrated liquidity
                </span>
              </div>
            </div>
            <div className='feature-item'>
              <FontAwesomeIcon icon={faPercent} />
              <div>
                <strong>Dynamic Supply</strong>
                <span>
                  Tokens can be minted and burned within the floor-roof range
                </span>
              </div>
            </div>
            <div className='feature-item'>
              <FontAwesomeIcon icon={faRocket} />
              <div>
                <strong>Admin Controls</strong>
                <span>
                  Manage roof price, rebalancing, and liquidity distribution
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        showModal={showSuccessModal}
        setShowModal={setShowSuccessModal}
        title='Floor Token Deployed Successfully!'
        variant='medium'
      >
        <div className='DeploySuccessModal'>
          <div className='success-icon'>
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className='success-message'>
            <p>
              Your FLOOR token has been deployed successfully! You can now
              manage your token through the admin dashboard.
            </p>
          </div>
          <div className='floor-address'>
            <span className='label'>Floor Token Address:</span>
            <span className='address'>{deployedFloorAddress}</span>
          </div>
          <Link
            to={routeNames.floor.replace(':tokenAddress', deployedFloorAddress)}
            className='dashboard-link'
          >
            <Button
              text='Go to Admin Dashboard'
              variant='contained'
              icon={faExternalLinkAlt}
            />
          </Link>
        </div>
      </Modal>
    </div>
  );
};

export default DeployFloor;
