import Backers from './components/Backers';
import CommunityLinks from './components/CommunityLinks';
import Features from './components/Features';
import Intro from './components/Intro';
import KeyHighlights from './components/KeyHighlights';
import Legal from './components/Legal';
import Roadmap from './components/Roadmap';
import SaleRounds from './components/SaleRounds';
import SaleStructure from './components/SaleStructure';
import Tokenomics from './components/Tokenomics';
import TokenUnlock from './components/TokenUnlock';
import TokenUtility from './components/TokenUtility';

const SaleDetails = () => {
  return (
    <div className='flex max-w-[1150px] flex-col justify-center gap-32 pb-32 pt-24 md:px-8 lg:pt-32'>
      <KeyHighlights />
      <Intro />
      <Features />
      <Roadmap />
      <Backers />
      <SaleStructure />
      <SaleRounds />
      <Tokenomics />
      <TokenUtility />
      <TokenUnlock />
      <CommunityLinks />
      <Legal />
    </div>
  );
};

export default SaleDetails;
