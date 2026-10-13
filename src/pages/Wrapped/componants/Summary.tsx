import dusa from 'assets/img/dusa_mid_transp.png';
import { UserData } from './WrappedSlides';
import './Summary.scss';
import { formatNumber } from 'utils/methods';

interface SummaryProps {
  userData: UserData;
}

const Summary = ({ userData }: SummaryProps) => {
  return (
    <div className='WrappedSummary'>
      <div className='header'>My 2024 Dusa Wrapped</div>
      <div className='wrapper'>
        <div className='decorative-shape1' />
        <div className='decorative-shape2' />

        <div className='left-column'>
          <div className='big-stat-container'>
            <div className='big-stat-label'>I swapped</div>
            <div className='big-stat-infos'>
              <div className='big-stat-number'>
                ${formatNumber(userData.volume)}
              </div>
              <div className='big-stat-perc'>(top {userData.volumePerc}%)</div>
            </div>
          </div>

          <div className='section-container'>
            <div className='section-title'>My stats</div>
            <ul className='top-list'>
              <li>
                <span>Generated Fees:</span>
                <span>
                  ${formatNumber(userData.fees)} (top {userData.feesPerc}
                  %)
                </span>
              </li>
              <li>
                <span>Incentives Rewards:</span>{' '}
                <span>{formatNumber(userData.masRewards)} $MAS</span>
              </li>
              <li>
                {' '}
                <span>Total Txs:</span> <span>{userData.nbTxs}</span>
              </li>
              <li>
                {' '}
                <span>Best Txs Daily Streak:</span>{' '}
                <span>{userData.biggestStreak}</span>
              </li>
              <li>
                <span>Rank:</span>
                <span>
                  {' '}
                  {userData.rank
                    ? `${userData.rank} / ${userData.totalUsers}`
                    : 'Not ranked'}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className='right-column'>
          <div className='summary-img-container'>
            <img src={dusa} alt='Placeholder' className='summary-img' />
          </div>
        </div>
      </div>
      <div className='footer'>
        <div className='footer-note'>app.dusa.io/wrapped</div>
        <div className='footer-note'>Thanks for using Dusa!</div>
        {userData.ref?.referralCode && (
          <div className='footer-note'>
            referral code: {userData.ref?.referralCode}
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
