import { useContext, useEffect, useState } from 'react';
import clsx from 'clsx/lite';
import { Link } from 'react-router-dom';
import CloseX from 'components/CloseX';
import { SettingsContext } from 'context/SettingsContext';
import { routeNames } from 'routes';
import { IS_BUILDNET } from 'utils/config';

const Headband = () => {
  const { showHeadband, setShowHeadband } = useContext(SettingsContext);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (IS_BUILDNET) setShowHeadband(false);
  }, [setShowHeadband]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setShowHeadband(false), 400);
  };

  if (!showHeadband) return null;

  return (
    <div
      className={clsx(
        'z-[500] flex justify-between items-center bg-gray-600/30 shadow-xl backdrop-blur-md mx-1 mt-1 px-6 py-1 border-white/50 font-semibold text-[0.8rem] text-slate-200 hover:scale-105 transition-transform duration-200',
        closing ? 'animate-slide-out-up' : 'animate-slide-in-down'
      )}
    >
      <div />
      <div>
        Dusa Protocol v2 is live! Read more{' '}
        <a
          href='https://medium.com/@dusalabs/dusa-v2-empowering-token-holders-through-governance-revenue-sharing-and-transparency-f04a656e852b'
          target='_blank'
          rel='noreferrer noopener'
          className='underline underline-offset-2 whitespace-nowrap transition-colors duration-150 hover:no-underline'
        >
          here
        </a>
      </div>
      <CloseX handleClose={handleClose} />
    </div>
  );
};

export default Headband;
