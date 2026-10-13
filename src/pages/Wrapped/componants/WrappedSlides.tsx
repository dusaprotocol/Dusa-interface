import React, { useRef, useState } from 'react';
import { faXTwitter } from '@fortawesome/free-brands-svg-icons';
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { toPng } from 'html-to-image';
import { AnimatePresence } from 'motion/react';
import CountUp from 'react-countup';
import './WrappedSlides.scss';
import PoolName from 'components/PoolName';
import Tooltip from 'components/Tooltip';
import useClipboard from 'hooks/useClipboard';
import { getTokenFromAddress } from 'utils/methods';
import Slide from './Slide';
import Summary from './Summary';

export interface UserData {
  volume: number;
  fees: number;
  masRewards: number;
  nbTxs: number;
  ref: string;
  rank: number;
  totalUsers: number;
  volumePerc: number;
  feesPerc: number;
  biggestStreak: number;
  favPool?: {
    token0: { address: string; symbol: string };
    token1: { address: string; symbol: string };
    binStep: number;
    version: string;
    whitelisted: boolean;
  };
}

const WrappedSlides = ({ userData }: { userData: UserData }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const lastSlideRef = useRef<HTMLDivElement>(null);
  const { copy, copied } = useClipboard('');

  const isRanked = userData.rank !== undefined;
  const hasFavPool = userData.favPool !== undefined;
  const token0 = hasFavPool
    ? getTokenFromAddress(userData.favPool!.token0.address)
    : undefined;
  const token1 = hasFavPool
    ? getTokenFromAddress(userData.favPool!.token1.address)
    : undefined;
  const binStep = hasFavPool ? userData.favPool!.binStep : 0;
  const version = hasFavPool ? userData.favPool!.version : 'V1';

  const slidesContent = [
    {
      id: 'Slide0',
      title: '2024 Dusa Wrapped',
      content: <></>,
      subtitle: 'Unveil your 2024 highlights!'
    },
    {
      id: 'Slide1',
      title: 'Trade Volume',
      content: (
        <CountUp
          start={0}
          end={userData.volume}
          decimals={2}
          prefix='$'
          duration={3}
        />
      ),
      subtitle: `Top ${userData.volumePerc}% of users${
        userData.volumePerc <= 15 ? ', wow you are a big trader!' : ''
      }`
    },
    {
      id: 'Slide2',
      title: 'Generated Fees',
      content: (
        <CountUp
          start={0}
          end={userData.fees}
          decimals={2}
          prefix='$'
          duration={3}
        />
      ),
      subtitle: `Top ${userData.feesPerc}% of users${
        userData.volumePerc <= 15 ? ', this is a lot of fees!' : ''
      }`
    },
    {
      id: 'Slide3',
      title: 'Incentives Rewards',
      content: (
        <CountUp
          start={0}
          end={userData.masRewards}
          decimals={2}
          suffix=' $MAS'
          duration={3}
        />
      ),
      subtitle:
        userData.masRewards > 0
          ? userData.masRewards > 1000
            ? 'You are doing pretty well with rewards!'
            : 'Good job!'
          : 'Try to provide liquidity on rewarded pools'
    },
    {
      id: 'Slide4',
      title: 'Biggest Txs Daily Streak',
      content: (
        <>
          <CountUp start={0} end={userData.biggestStreak} duration={3} />{' '}
          <span>consecutive day{userData.biggestStreak > 1 && 's'}</span>
        </>
      ),
      subtitle:
        userData.biggestStreak > 0
          ? userData.biggestStreak > 2
            ? 'You are unstoppable!'
            : 'You are doing great!'
          : 'Try to trade daily!'
    },
    {
      id: 'Slide5',
      title: 'Fav Pool',
      content: hasFavPool ? (
        <PoolName
          token0={token0!}
          token1={token1!}
          binStep={binStep}
          version='V1'
        />
      ) : (
        'No favorite pool :/'
      ),
      subtitle: userData.favPool
        ? `Whitelisted ? ${userData.favPool.whitelisted ? 'Yes' : 'No'}`
        : 'Try to find one!'
    },
    {
      id: 'Slide6',
      title: 'Your Rank',
      content: isRanked ? (
        <>
          <CountUp start={0} end={userData.rank} duration={3} /> /{' '}
          {userData.totalUsers}
        </>
      ) : (
        <span>Not ranked yet :/</span>
      ),
      subtitle: isRanked
        ? userData.rank === 1
          ? 'You are the best!'
          : 'On your way to the top!'
        : 'We would love to see you on Dusa!'
    },
    {
      id: 'Slide7',
      title: '',
      content: <Summary userData={userData} />,
      subtitle: ''
    }
  ];

  const lastSlideIndex = slidesContent.length - 1;

  const goNextSlide = () => {
    setCurrentSlide((prev) =>
      prev < slidesContent.length - 1 ? prev + 1 : prev
    );
  };

  const goPrevSlide = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleShareTwitter = () => {
    const tweetText = encodeURIComponent(
      'Discover your 2024 wrapped on @DusaLabs at app.dusa.io/wrapped'
    );

    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl, '_blank');
  };

  const captureLastSlide = async () => {
    if (!lastSlideRef.current) return;
    try {
      const dataURL = await toPng(lastSlideRef.current);
      const link = document.createElement('a');
      link.download = 'wrapped_screenshot.png';
      link.href = dataURL;
      link.click();
    } catch (error) {
      console.error('Erreur lors de la capture d’écran :', error);
    }
  };
  const copyLastSlide = async () => {
    if (!lastSlideRef.current) return;
    try {
      copy();
      const dataURL = await toPng(lastSlideRef.current);
      // Convert data URL to a Blob
      const blob = await (await fetch(dataURL)).blob();
      // Write the blob to the clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setIsCopied(true);
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error);
    }
  };

  return (
    <div className='WrappedSlides'>
      <AnimatePresence mode='wait'>
        <Slide key={slidesContent[currentSlide].id}>
          {currentSlide === lastSlideIndex ? (
            <div className='slide-container'>
              <h1 className='slide-title'>
                {slidesContent[currentSlide].title}
              </h1>
              <div className='slide-content' ref={lastSlideRef}>
                {slidesContent[currentSlide].content}
              </div>
              <p className='slide-subtitle'>
                {slidesContent[currentSlide].subtitle}
              </p>
            </div>
          ) : (
            <>
              <h1 className='slide-title'>
                {slidesContent[currentSlide].title}
              </h1>
              <div className='slide-content'>
                {slidesContent[currentSlide].content}
              </div>
              <p className='slide-subtitle'>
                {slidesContent[currentSlide].subtitle}
              </p>
            </>
          )}

          {currentSlide === lastSlideIndex && (
            <div className='share-buttons'>
              <button onClick={captureLastSlide} className='share-button'>
                Download
              </button>
              <button onClick={copyLastSlide} className='share-button'>
                Copy <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              </button>
              <Tooltip
                trigger={
                  <button
                    onClick={handleShareTwitter}
                    className={clsx('share-button', !isCopied && 'disabled')}
                    disabled={!isCopied}
                  >
                    Open a <FontAwesomeIcon icon={faXTwitter} /> post
                  </button>
                }
                position='top'
              >
                <span>
                  Tip: copy the image and paste it into{' '}
                  <FontAwesomeIcon icon={faXTwitter} /> for better engagement!
                </span>
              </Tooltip>
            </div>
          )}

          <div className='navigation-buttons'>
            <button
              onClick={goPrevSlide}
              className='nav-button'
              disabled={currentSlide === 0}
            >
              Previous
            </button>
            <button
              onClick={goNextSlide}
              className='nav-button'
              disabled={currentSlide === slidesContent.length - 1}
            >
              Next
            </button>
          </div>
          <div className='page-number'>
            {currentSlide + 1} / {slidesContent.length}
          </div>
        </Slide>
      </AnimatePresence>
    </div>
  );
};

export default WrappedSlides;
