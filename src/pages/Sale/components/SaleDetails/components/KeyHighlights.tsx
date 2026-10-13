import SaleDetailSection from './SaleDetailSection';

const points = [
  {
    title: 'Fully On-Chain Infrastructure on Massa Blockchain',
    description:
      'Dusa Labs has developed a decentralized exchange (DEX) entirely on the Massa blockchain, ensuring that all components from the web interface to trading mechanisms are hosted on-chain. This architecture eliminates single points of failure and enhances censorship resistance.'
  },
  {
    title: 'Autonomous Smart Contracts for Advanced Trading',
    description:
      'Leveraging autonomous smart contracts, Dusa automates complex trading actions such as limit orders, stop-losses, and dollar-cost averaging (DCA). This innovation removes the need for third-party intermediaries, providing users with a trustless and transparent trading experience.'
  },
  {
    title: 'Concentrated Autonomous Liquidity',
    description:
      'Dusa introduces a unique liquidity model that allows providers to concentrate their assets within specific price ranges. Managed dynamically through smart contracts, this approach enhances capital efficiency and reduces slippage for traders.'
  },
  {
    title: '$JELLY Token: Incentivizing Ecosystem Participation',
    description:
      'The non-transferable $JELLY token rewards active users and liquidity providers. Initially convertible to $DUSA tokens, $JELLY serves as a mechanism to encourage ongoing engagement through bi-annual distributions based on user activity.'
  },
  {
    title: 'Strategic Roadmap and Ecosystem Expansion',
    description:
      'Dusa’s roadmap includes deploying additional trading primitives, integrating with other blockchain ecosystems like Starknet, and establishing the Dusa DAO for decentralized governance. These initiatives aim to broaden Dusa’s reach and functionality within the DeFi landscape.'
  }
];

const KeyHighlights = () => {
  return (
    <SaleDetailSection title='Key Highlights'>
      <div className='flex flex-col gap-16'>
        {points.map((point, index) => (
          <div
            key={index}
            className='flex flex-col gap-2 rounded-lg text-center shadow-sm transition-shadow duration-200 hover:shadow-md'
          >
            <span className='text-2xl font-semibold text-[var(--secondary-color)]'>
              {point.title}
            </span>
            <span className='font-light md:text-xl md:leading-relaxed'>
              {point.description}
            </span>
          </div>
        ))}
      </div>
    </SaleDetailSection>
  );
};

export default KeyHighlights;
