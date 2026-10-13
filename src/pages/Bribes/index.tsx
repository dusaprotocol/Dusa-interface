import { useContext, useState, useMemo } from 'react';
import { TokenAmount, parseUnits } from '@dusalabs/sdk';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativetime from 'dayjs/plugin/relativeTime';
import Button from 'components/Button';
import { Warning } from 'components/Info';
import PageHeader from 'components/PageHeader';
import TokenInput from 'components/TokenInput';
import SimpleTokenInput from 'components/TokenInput/SimpleTokenInput';
import { SimpleTooltip } from 'components/Tooltip';
import WizardStepper, { WizardStep } from 'components/WizardStepper';
import { AccountWrapperContext } from 'context/AccountWrapperContext';
import useFetchAllowance from 'hooks/useFetchAllowance';
import useFetchAllPools from 'hooks/useFetchAllPools';
import usePairInformation from 'hooks/useFetchData/pairInformation';
import { useTokenValues } from 'hooks/useFetchData/tokenValue';
import useFetchDatastore from 'hooks/useFetchDatastore';
import usePairManager from 'hooks/usePairManager';
import { useSendTransaction } from 'hooks/useSendTransaction';
import { PoolTitle } from 'pages/Pools';
import { voterSC } from 'utils/config';
import { fetchBribes } from 'utils/datastoreFetcher';
import {
  formatNumber,
  printBigintIsh,
  printUSD,
  toFraction
} from 'utils/methods';
import { MASSA, tokens, WMAS } from 'utils/tokens';
import {
  buildIncreaseAllowanceTx,
  buildDepositBribesTx
} from 'utils/transactionBuilder';
import { Pool, Token } from 'utils/types';

dayjs.extend(relativetime);
import './index.scss';
import { getMasIfWmas } from 'utils/coreMethods';
import React from 'react';

enum WizardStepId {
  SELECT_POOL = 'select-pool',
  CONFIGURE_INCENTIVE = 'configure-incentive',
  CONFIRM = 'confirm'
}

const Bribes = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [token0Filter, setToken0Filter] = useState<Token | undefined>();
  const [token1Filter, setToken1Filter] = useState<Token | undefined>();
  const [bribeToken, setBribeToken] = useState(WMAS);
  const [quantity, setQuantity] = useState<string>();
  const [pool, setPool] = useState<Pool>();
  const [understood, setUnderstood] = useState(false);

  // Fetch all V2 pools
  const allPoolsV2Query = useFetchAllPools(false);
  const allV2Pools = allPoolsV2Query.data || [];

  // const allowanceQuery = useFetchAllowance({
  //     tokenAddress: bribeToken.address,
  //     spenderAddress: dcaManagerSC
  //   });
  //   const allowance = allowanceQuery.data || 0n;

  //   const approve = useSendTransaction({})

  const selectPool = (selectedPool: Pool) => {
    setPool(selectedPool);
    setCurrentStep(1); // Move to configure incentive step
  };

  // Filter pools based on token filters
  const filteredPools = allV2Pools.filter((pool) => {
    const t0 = getMasIfWmas(pool.token0);
    const t1 = getMasIfWmas(pool.token1);
    if (token0Filter && !t0.equals(token0Filter) && !t1.equals(token0Filter)) {
      return false;
    }
    if (token1Filter && !t0.equals(token1Filter) && !t1.equals(token1Filter)) {
      return false;
    }
    return true;
  });

  const { tokensInfo, connectedAddress } = useContext(AccountWrapperContext);
  const bribeTokenIndex = tokensInfo?.findIndex(
    ({ token }) => token.address === bribeToken.address
  );
  const balance =
    tokensInfo && bribeTokenIndex !== undefined && bribeTokenIndex !== -1
      ? tokensInfo[bribeTokenIndex].balance
      : undefined;

  // Parse bribe amount
  const bribeAmount = quantity ? parseUnits(quantity, bribeToken.decimals) : 0n;

  // Check allowance for the bribe token
  const allowanceQuery = useFetchAllowance({
    tokenAddress: bribeToken.address,
    spenderAddress: voterSC
  });
  const allowance = allowanceQuery.data || 0n;
  const needsApproval = bribeAmount > 0n && allowance < bribeAmount;

  const pm = usePairManager({
    token0: pool?.token0,
    setToken0: () => {
      // Intentionally empty - pool tokens are read-only in this context
    },
    token1: pool?.token1,
    setToken1: () => {
      // Intentionally empty - pool tokens are read-only in this context
    },
    binStep: pool?.binStep || 0
  });
  const poolAddress = pm.pairAddress || '';
  const tvlQuery = usePairInformation(poolAddress);
  const tokenReserves: [bigint, bigint] = [
    tvlQuery.data?.reserveX || 0n,
    tvlQuery.data?.reserveY || 0n
  ];

  const tokenValues = useTokenValues();

  const bribeTokenIndexForValue = tokens.findIndex(
    (t) => t.address === bribeToken.address
  );
  const bribeTokenValue = tokenValues[bribeTokenIndexForValue];

  const datastoreQuery = useFetchDatastore(voterSC);
  const datastoreKeys = datastoreQuery.data || [];

  const bribesQuery = useQuery(
    ['bribes', poolAddress],
    () => fetchBribes(poolAddress, datastoreKeys),
    { enabled: !!poolAddress }
  );
  const existingBribes = bribesQuery.data || [];

  // Transaction handlers
  const { pending: pendingAllowance, submitTx: increaseAllowance } =
    useSendTransaction({
      data: buildIncreaseAllowanceTx(bribeToken.address, voterSC, bribeAmount),
      onTxConfirmed: () => allowanceQuery.refetch()
    });

  const { pending: pendingBribe, submitTx: submitBribe } = useSendTransaction({
    data:
      poolAddress && bribeAmount > 0n
        ? buildDepositBribesTx(poolAddress, bribeToken.address, bribeAmount)
        : undefined,
    onTxConfirmed: () => {
      // Reset form and go back to step 0
      setQuantity(undefined);
      setCurrentStep(0);
      // Refetch bribes to show the new one
      bribesQuery.refetch();
    }
  });

  const wizardSteps: WizardStep[] = useMemo(
    () => [
      {
        id: WizardStepId.SELECT_POOL,
        title: 'Select Pool',
        description: 'Choose the pool you want to incentivize',
        isComplete: !!pool,
        isActive: currentStep === 0,
        isDisabled: false
      },
      {
        id: WizardStepId.CONFIGURE_INCENTIVE,
        title: 'Configure Incentive',
        description: 'Set your incentive amount and token',
        isComplete:
          !!quantity &&
          !!bribeToken &&
          understood &&
          bribeAmount <= (balance || 0n),
        isActive: currentStep === 1,
        isDisabled: !pool
      },
      {
        id: WizardStepId.CONFIRM,
        title: 'Review & Confirm',
        description: 'Review and submit your incentive',
        isComplete: false,
        isActive: currentStep === 2,
        isDisabled:
          !quantity ||
          !bribeToken ||
          !understood ||
          bribeAmount > (balance || 0n)
      }
    ],
    [currentStep, pool, quantity, bribeToken, understood, bribeAmount, balance]
  );

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || !wizardSteps[stepIndex].isDisabled) {
      setCurrentStep(stepIndex);
    }
  };

  const nextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render configuration step (step 1) with pool information
  const renderConfigurationStep = () => {
    if (!pool) return null;

    const token0Index = tokens.findIndex(
      (t) => t.address === pool.token0.address
    );
    const token1Index = tokens.findIndex(
      (t) => t.address === pool.token1.address
    );
    const token0Value = tokenValues[token0Index];
    const token1Value = tokenValues[token1Index];
    const v = (is0: boolean) =>
      Number(
        new TokenAmount(
          is0 ? pool.token0 : pool.token1,
          is0 ? tokenReserves[0] : tokenReserves[1]
        )
          .multiply(toFraction(is0 ? token0Value : token1Value))
          .toSignificant(2)
      );
    const reserves0Value = v(true);
    const reserves1Value = v(false);

    return (
      <div className='step-content configuration'>
        <h2 className='step-title'>Configure Your Incentive</h2>

        <div className='configuration-grid'>
          <div className='main-form-section'>
            <div className='incentive-form-card'>
              <h3 className='card-title'>
                <SimpleTooltip
                  title='Set Your Incentive'
                  description='Native MAS cannot be used directly. Please use WMAS (Wrapped MAS) for incentives.'
                />
              </h3>

              <div className='form-section'>
                <label className='form-label'>Incentive Token & Amount</label>
                <div className='token-input-wrapper'>
                  <TokenInput
                    quantity={quantity}
                    token={bribeToken}
                    balance={balance}
                    changeQuantity={(q) => setQuantity(q)}
                    changeToken={(t) => setBribeToken(t)}
                    headerText={'From'}
                    removedTokens={[MASSA]}
                    dollarValue={bribeTokenValue}
                    isError={bribeAmount > (balance || 0n)}
                  />
                </div>
              </div>
              <div className='form-section'>
                <div className='quick-amounts'>
                  <div className='quick-amounts-title'>Quick Amounts</div>
                  <div className='amounts-grid'>
                    {[10, 50, 100, 500].map((usdAmount) => {
                      const tokenAmount =
                        bribeTokenValue && bribeTokenValue > 0
                          ? usdAmount / bribeTokenValue
                          : undefined;

                      return (
                        <button
                          key={usdAmount}
                          className='quick-amount'
                          onClick={() =>
                            tokenAmount && setQuantity(tokenAmount.toString())
                          }
                          disabled={!tokenAmount}
                        >
                          <span className='usd-amount'>${usdAmount}</span>
                          {tokenAmount && (
                            <span className='token-equivalent'>
                              (~{formatNumber(tokenAmount)} {bribeToken.symbol})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className='form-section'>
                <label className='form-label'>Understanding Required</label>
                <div className='checkbox-wrapper'>
                  <input
                    type='checkbox'
                    id='understood'
                    checked={understood}
                    onChange={() => setUnderstood((u) => !u)}
                    className='styled-checkbox'
                  />
                  <label htmlFor='understood' className='checkbox-label'>
                    I understand I will NOT be able to withdraw incentives once
                    submitted
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className='info-sidebar'>
            <div className='pool-info-card'>
              <h3 className='card-title'>Pool Information</h3>
              <div className='pool-summary'>
                <PoolTitle pool={pool} />
                <div className='pool-metrics'>
                  <div className='metric-item'>
                    <span className='metric-label'>TVL</span>
                    <span className='metric-value'>
                      ~${printUSD(reserves0Value + reserves1Value)}
                    </span>
                  </div>
                  <div className='metric-item'>
                    <span className='metric-label'>Fee Tier</span>
                    <span className='metric-value'>{pool.binStep} bps</span>
                  </div>
                  {existingBribes.length > 0 && (
                    <div className='metric-item'>
                      <span className='metric-label'>Active Incentives</span>
                      <span className='metric-value'>
                        {existingBribes.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='live-preview'>
              <div className='preview-title'>Your Incentive Preview</div>
              <div className='preview-content'>
                <div className='preview-item highlight'>
                  <span className='preview-label'>Your Incentive</span>
                  <span className='preview-value'>
                    {quantity || '0'} {bribeToken.symbol}
                  </span>
                </div>
                <div className='preview-item'>
                  <span className='preview-label'>Total After Yours</span>
                  <span className='preview-value'>
                    {existingBribes.length + (quantity ? 1 : 0)} active
                  </span>
                </div>
              </div>

              {existingBribes.length > 0 && (
                <div className='existing-incentives'>
                  <h4 className='subsection-title'>Current Incentives</h4>
                  <div className='incentive-list'>
                    {existingBribes.map((bribe, j) => (
                      <div key={j} className='incentive-item'>
                        <span className='incentive-amount'>
                          {printBigintIsh(bribe.token, bribe.amount)}{' '}
                          {bribe.token.symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className='step-content pool-selection'>
            <h2 className='step-title'>Select Pool to Incentivize</h2>

            <div className='pool-selection-header'>
              <div className='selection-stats'>
                <div className='stat-item'>
                  <span className='stat-label'>Available Pools:</span>
                  <span className='stat-value'>{filteredPools.length}</span>
                </div>
                <div className='stat-item'>
                  <span className='stat-label'>Total V2 Pools:</span>
                  <span className='stat-value'>{allV2Pools.length}</span>
                </div>
              </div>

              <div className='token-filters'>
                <div className='filter-group'>
                  <label className='filter-label'>Filter by Token</label>
                  <div className='filter-inputs'>
                    <SimpleTokenInput
                      token={token0Filter}
                      changeToken={(t) => setToken0Filter(t)}
                      variant='fullWidth'
                      removedTokens={[WMAS]}
                    />
                    <SimpleTokenInput
                      token={token1Filter}
                      changeToken={(t) => setToken1Filter(t)}
                      variant='fullWidth'
                      removedTokens={[WMAS]}
                    />
                    {(token0Filter || token1Filter) && (
                      <Button
                        text='Clear'
                        variant='text'
                        onClick={() => {
                          setToken0Filter(undefined);
                          setToken1Filter(undefined);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {filteredPools.length > 0 ? (
              <div className='pools-grid'>
                {filteredPools.map((pool) => (
                  <div
                    key={`${pool.token0.address}-${pool.token1.address}-${pool.binStep}`}
                    className='pool-option'
                    onClick={() => selectPool(pool)}
                  >
                    <div className='pool-header'>
                      <PoolTitle pool={pool} />
                      <Button
                        text='Select'
                        variant='outlined'
                        onClick={(e) => {
                          e.stopPropagation();
                          selectPool(pool);
                        }}
                      />
                    </div>

                    <div className='pool-stats'>
                      <div className='stat-item'>
                        <div className='stat-label'>Fee Tier</div>
                        <div className='stat-value'>{pool.binStep} bps</div>
                      </div>
                      <div className='stat-item'>
                        <div className='stat-label'>Version</div>
                        <div className='stat-value'>V2</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : allPoolsV2Query.isLoading ? (
              <div className='loading-state'>
                <div className='loading-text'>Loading V2 pools...</div>
              </div>
            ) : (
              <div className='no-pools'>
                <p>No V2 pools match your current filters.</p>
                <Button
                  text='Clear Filters'
                  variant='outlined'
                  onClick={() => {
                    setToken0Filter(undefined);
                    setToken1Filter(undefined);
                  }}
                />
              </div>
            )}

            <Warning text='The incentivize feature is mainly used by protocols. Please make sure you understand how it works before using it as any transaction is final and cannot be reverted.' />
          </div>
        );

      case 1:
        return renderConfigurationStep();

      case 2:
        return (
          <div className='step-content review-confirm'>
            <h2 className='step-title'>Review & Confirm Your Incentive</h2>

            <div className='review-content'>
              <div className='review-main'>
                <div className='review-section'>
                  <h3 className='section-title'>Transaction Summary</h3>
                  <div className='summary-grid'>
                    <div className='summary-item'>
                      <span className='summary-label'>Pool:</span>
                      <span className='summary-value'>
                        {pool.token0.symbol}/{pool.token1.symbol} (
                        {pool.binStep} bps)
                      </span>
                    </div>
                    <div className='summary-item'>
                      <span className='summary-label'>Incentive Token:</span>
                      <span className='summary-value'>{bribeToken.symbol}</span>
                    </div>
                    <div className='summary-item highlight'>
                      <span className='summary-label'>Amount:</span>
                      <span className='summary-value'>
                        {quantity || '0'} {bribeToken.symbol}
                      </span>
                    </div>
                    <div className='summary-item'>
                      <span className='summary-label'>USD Value:</span>
                      <span className='summary-value'>
                        ~${(Number(quantity || 0) * bribeTokenValue).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='review-section warnings'>
                  <h3 className='section-title'>Important Warnings</h3>
                  <div className='warning-list'>
                    <div className='warning-item'>
                      <span className='warning-icon'>⚠️</span>
                      <span>Incentives cannot be withdrawn once submitted</span>
                    </div>
                    <div className='warning-item'>
                      <span className='warning-icon'>⏰</span>
                      <span>This incentive is for the current epoch only</span>
                    </div>
                    <div className='warning-item'>
                      <span className='warning-icon'>🎯</span>
                      <span>Results depend on actual voter participation</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='review-sidebar'>
                <div className='final-check'>
                  <h4 className='check-title'>Final Checklist</h4>
                  <div className='checklist'>
                    <div className='check-item'>
                      <span className='check-icon'>✅</span>
                      <span>Pool selected</span>
                    </div>
                    <div className='check-item'>
                      <span className='check-icon'>✅</span>
                      <span>Amount configured</span>
                    </div>
                    <div className='check-item'>
                      <span className='check-icon'>✅</span>
                      <span>Terms understood</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='confirm-actions'>
              {needsApproval ? (
                // TODO: use ButtonAllowance?
                <Button
                  text={`Approve ${bribeToken.symbol}`}
                  variant='contained'
                  onClick={() => increaseAllowance()}
                  disabled={
                    pendingAllowance || !connectedAddress || bribeAmount === 0n
                  }
                  pending={pendingAllowance}
                  className='submit-button'
                />
              ) : (
                <Button
                  text='Submit Incentive'
                  variant='contained'
                  onClick={() => submitBribe()}
                  disabled={
                    pendingBribe ||
                    !connectedAddress ||
                    bribeAmount === 0n ||
                    needsApproval
                  }
                  pending={pendingBribe}
                  className='submit-button'
                />
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render contextual sidebar content
  const renderSidebar = () => {
    const progress = ((currentStep + 1) / wizardSteps.length) * 100;
    const isStep0Completed = !!pool;
    const isStep1Completed = !!pool && !!quantity && parseFloat(quantity) > 0;

    return (
      <div className='contextual-sidebar'>
        <div className='sidebar-header'>
          <span className='sidebar-icon'>💡</span>
          <span className='sidebar-title'>Guide</span>
        </div>

        <div className='sidebar-content'>
          {/* Step 1: Pool Selection - Always visible */}
          <div
            className={`sidebar-section ${isStep0Completed ? 'completed' : currentStep === 0 ? 'active' : ''}`}
          >
            <div className='section-header'>
              {isStep0Completed ? (
                <span className='check-icon'>✅</span>
              ) : (
                <span className='step-number'>1</span>
              )}
              <div className='section-title'>Pool Selection</div>
            </div>
            <div className='section-description'>
              Browse all available V2 pools and select one to incentivize. Use
              filters to narrow down options.
            </div>
            {!isStep0Completed && (
              <>
                <div className='section-tip'>
                  <div className='section-title'>Tip</div>
                  <div className='section-description'>
                    Look for pools with high TVL and trading volume for better
                    results.
                  </div>
                </div>
                <div className='section-stats'>
                  <div className='section-title'>Available Pools</div>
                  <div className='section-value'>
                    {allV2Pools.length} V2 pools
                  </div>
                </div>
              </>
            )}
            {isStep0Completed && pool && (
              <div className='section-result'>
                <div className='section-value'>
                  Selected: {pool.token0.symbol}/{pool.token1.symbol}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Incentive Configuration - Visible after step 0 or if current */}
          {(currentStep >= 1 || isStep0Completed) && (
            <div
              className={`sidebar-section ${isStep1Completed ? 'completed' : currentStep === 1 ? 'active' : ''}`}
            >
              <div className='section-header'>
                {isStep1Completed ? (
                  <span className='check-icon'>✅</span>
                ) : (
                  <span className='step-number'>2</span>
                )}
                <div className='section-title'>Incentive Strategy</div>
              </div>
              <div className='section-description'>
                Higher incentives attract more votes, which means more DUSA
                emissions for the pool.
              </div>
              {existingBribes.length > 0 && !isStep1Completed && (
                <div className='section-tip'>
                  <div className='section-title'>Competition</div>
                  <div className='section-value'>
                    {existingBribes.length} existing incentives
                  </div>
                  <div className='section-description'>
                    Other protocols are also incentivizing this pool.
                  </div>
                </div>
              )}
              {isStep1Completed && (
                <div className='section-result'>
                  <div className='section-value'>
                    {quantity} {bribeToken.symbol}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation - Only visible when reached */}
          {currentStep >= 2 && (
            <div
              className={`sidebar-section ${currentStep === 2 ? 'active' : ''}`}
            >
              <div className='section-header'>
                <span className='step-number'>3</span>
                <div className='section-title'>Review & Confirm</div>
              </div>
              <div className='section-description'>
                Review your incentive details and confirm the transaction.
              </div>
            </div>
          )}
        </div>

        <div className='progress-indicator'>
          <div className='progress-title'>Progress</div>
          <div className='progress-bar'>
            <div className='progress-fill' style={{ width: `${progress}%` }} />
          </div>
          <div className='progress-text'>
            Step {currentStep + 1} of {wizardSteps.length}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='Bribes'>
      <PageHeader
        title='Bribes'
        description='Add incentives to liquidity pools to attract more votes'
      />

      <WizardStepper
        steps={wizardSteps}
        currentStepIndex={currentStep}
        onStepClick={handleStepClick}
      />

      <div className='bribes-main-content'>
        <div className='content-area'>
          <div className='wizard-content'>
            {renderStepContent()}

            {currentStep < 2 && (
              <div className='step-navigation'>
                <div className='nav-group left'>
                  {currentStep > 0 && (
                    <Button
                      variant='text'
                      text='Previous'
                      icon={faArrowLeft}
                      onClick={prevStep}
                      className='prev-button'
                    />
                  )}
                </div>

                <div className='progress-steps'>
                  {wizardSteps.map((_, index) => (
                    <React.Fragment key={'prog-step-' + index}>
                      <div
                        key={index}
                        className={`step-dot ${
                          index < currentStep
                            ? 'completed'
                            : index === currentStep
                              ? 'active'
                              : ''
                        }`}
                      />
                      {index < wizardSteps.length - 1 && (
                        <div
                          className={`step-separator ${index < currentStep ? 'completed' : ''}`}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className='nav-group right'>
                  <Button
                    text={
                      currentStep === 0
                        ? 'Configure Incentive'
                        : currentStep === 1
                          ? 'Review & Confirm'
                          : 'Next'
                    }
                    variant='contained'
                    disabled={
                      (currentStep === 0 && !pool) ||
                      (currentStep === 1 &&
                        (!quantity ||
                          !bribeToken ||
                          !understood ||
                          bribeAmount > (balance || 0n)))
                    }
                    onClick={nextStep}
                    className='next-button'
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='sidebar-area'>{renderSidebar()}</div>
      </div>
    </div>
  );
};

export default Bribes;
