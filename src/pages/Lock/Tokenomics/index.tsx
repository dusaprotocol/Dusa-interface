import PageHeader from 'components/PageHeader';
import './index.scss';

const Tokenomics = () => {
  return (
    <div className='Tokenomics'>
      <PageHeader
        title='Tokenomics'
        description='Learn about the DUSA protocol token economics and distribution model.'
      />

      <div className='tokenomics-content'>
        <div className='intro-section'>
          <p className='intro-text'>
            Dusa Protocol uses two tokens to manage its utility and governance:
          </p>
          <ul className='token-list'>
            <li>
              <code>$DUSA</code> — ERC-20 utility token of the protocol
            </li>
            <li>
              <code>$veDUSA</code> — ERC-721 governance token in the form of an
              NFT (non-fungible token)
            </li>
          </ul>
        </div>

        <div className='mechanism-section'>
          <h2 className='section-title'>Token Mechanism</h2>
          <div className='mechanism-grid'>
            <div className='mechanism-card'>
              <h3>$DUSA Distribution</h3>
              <p>
                <code>$DUSA</code> is distributed to liquidity providers through
                emissions.
              </p>
            </div>

            <div className='mechanism-card'>
              <h3>$veDUSA Governance</h3>
              <p>
                <code>$veDUSA</code> is used for governance. Any{' '}
                <code>$DUSA</code> holder can vote-escrow their tokens and
                receive a <code>$veDUSA</code> (also known as Lock or veNFT) in
                exchange.
              </p>
            </div>
          </div>
        </div>

        <div className='lock-mechanics-section'>
          <h2 className='section-title'>Lock Mechanics</h2>
          <p className='section-description'>
            The lock period (also known as vote-escrowed period, hence the{' '}
            <em>ve</em> prefix) can be up to 4 years, following the linear
            relationship shown below:
          </p>

          <div className='lock-examples'>
            <div className='lock-example'>
              <div className='example-input'>100 $DUSA × 4 years</div>
              <div className='example-arrow'>→</div>
              <div className='example-output'>100 $veDUSA</div>
            </div>
            <div className='lock-example'>
              <div className='example-input'>100 $DUSA × 1 year</div>
              <div className='example-arrow'>→</div>
              <div className='example-output'>25 $veDUSA</div>
            </div>
          </div>

          <div className='voting-power-info'>
            <p>
              The longer the vesting time, the higher the voting power (voting
              weight).
            </p>
            <p>
              Additionally, the Lock (veNFT) can be set into a permanent maximum
              lock time. These <em>permalocked</em> Locks (veNFTs) are always
              treated by the protocol as being locked for the maximum duration
              of 4 years, and their voting power does not decay.
            </p>
          </div>
        </div>

        <div className='distribution-section'>
          <h2 className='section-title'>Initial Distribution</h2>
          <p className='section-description'>
            The initial distribution of <code>$DUSA</code> and{' '}
            <code>$veDUSA</code> was done for users and protocols likeliest to
            contribute to protocol mission to become the liquidity base layer of
            the Massa ecosystem.
          </p>

          <div className='distribution-table'>
            <div className='table-header'>
              <div className='table-cell'>Category</div>
              <div className='table-cell'>Amount</div>
              <div className='table-cell'>Percentage</div>
            </div>
            <div className='table-row'>
              <div className='table-cell'>Community</div>
              <div className='table-cell'>240M</div>
              <div className='table-cell'>60%</div>
            </div>
            <div className='table-row'>
              <div className='table-cell'>Partner Protocols</div>
              <div className='table-cell'>96M</div>
              <div className='table-cell'>24%</div>
            </div>
            <div className='table-row'>
              <div className='table-cell'>Dusa Foundation</div>
              <div className='table-cell'>40M</div>
              <div className='table-cell'>10%</div>
            </div>
            <div className='table-row'>
              <div className='table-cell'>Massa</div>
              <div className='table-cell'>20M</div>
              <div className='table-cell'>5%</div>
            </div>
            <div className='table-row'>
              <div className='table-cell'>Genesis Liquidity Pool</div>
              <div className='table-cell'>4M</div>
              <div className='table-cell'>1%</div>
            </div>
          </div>
        </div>

        <div className='community-section'>
          <h3 className='subsection-title'>Community</h3>
          <p>
            240M (60%) <code>$DUSA</code> tokens were distributed to the people
            who have played the biggest role in incubating Dusa and those
            likeliest to contribute to its long-term success, including:
          </p>
          <ul className='community-list'>
            <li>
              <code>$WEVE</code> holders (27%, 108M <code>$DUSA</code>)
            </li>
            <li>
              <code>$OP</code> network users (18%, 72M <code>$DUSA</code>)
              <ul className='sub-list'>
                <li>
                  3755 <code>$DUSA</code>/wallet — Addresses qualified as Repeat
                  Massa Users
                </li>
              </ul>
            </li>
            <li>
              Cross-chain DeFi users (15%, 60M <code>$DUSA</code>):
              <ul className='sub-list'>
                <li>
                  3500 <code>$DUSA</code>/wallet — Curve Protocol wallets with a
                  1450+ days (maximum) <code>$veCRV</code> lock time
                </li>
                <li>
                  3000 <code>$DUSA</code>/wallet — Convex Protocol lockers of{' '}
                  <code>$vlCVX</code> since new lock contract deployment
                </li>
                <li>
                  3000 <code>$DUSA</code>/wallet — Treasure DAO Genesis Mine{' '}
                  <code>$MAGIC</code> stakers for 1- and 3-month periods
                </li>
                <li>
                  2000 <code>$DUSA</code>/wallet — Platypus Protocol stakers
                  with <code>$vePTP</code> and <code>$PTP</code> balance
                </li>
                <li>
                  500 <code>$DUSA</code>/wallet — Redacted Cartel participants
                  in genesis Dutch auction who didnt sell their{' '}
                  <code>$BTRFLY</code>
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <div className='foundation-section'>
          <h3 className='subsection-title'>Foundation</h3>
          <p>
            The Foundation received an initial allocation that was used to vote
            to drive emissions to key protocol pairs such as{' '}
            <code>$DUSA-$USDC</code> and support ongoing protocol development.
            The total Foundation allocation was 40M (10%) in <code>$DUSA</code>{' '}
            and <code>$veDUSA</code>.
          </p>
          <p>
            The Foundation vested 100% of its initial allocation in the form of
            <code>$veDUSA</code> and uses it to vote via the Dusa Protocol in
            perpetuity.
          </p>
          <p>
            To help cover ongoing expenses and all the upcoming development
            efforts, 3% of the emissions are going to the Foundation address.
            These emissions are used to lock and increase the Foundation $veDUSA
            holdings, distribute as incentives via the protocol, or engage in
            various efforts to further the distribution and adoption of the
            protocol.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tokenomics;
