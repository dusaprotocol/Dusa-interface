import SaleDetailSection from './SaleDetailSection';

const Intro = () => {
  return (
    <SaleDetailSection title='Introduction'>
      <div className='flex flex-col gap-12 text-center font-light md:text-xl'>
        <span>
          Decentralization is essential to blockchain technology, distinguishing
          it from traditional data storage methods. Blockchain applications
          measure decentralization by comparing &quot;on-chain&quot; versus
          &quot;off-chain&quot; activities. &ldquo;On-chain&ldquo; apps store
          all relevant data directly on the blockchain, whereas
          &ldquo;off-chain&ldquo; apps store some data externally.
        </span>
        <span>
          Traditional centralized systems, such as banks or social media
          platforms, rely on a single authority, requiring users to trust this
          central entity. These systems are prone to vulnerabilities like
          hacking, corruption, or unauthorized access. Decentralization solves
          these problems by distributing data and control across multiple nodes,
          significantly increasing security and reliability.
        </span>
        <span>
          Decentralized applications utilize blockchain and smart contracts to
          automate processes and eliminate intermediaries such as insurers or
          legal systems. Users can transact directly and efficiently, bypassing
          slow and complicated workflows typical of traditional systems.
        </span>
        <span>
          Dusa embraces decentralization by offering innovative blockchain-based
          solutions. It focuses on secure, transparent, and automated processes,
          empowering users with direct control over their data and interactions.
          By integrating smart contracts and decentralized technology, Dusa
          enables reliable, fast, and user-friendly applications that redefine
          traditional workflows.
        </span>
      </div>
    </SaleDetailSection>
  );
};

export default Intro;
