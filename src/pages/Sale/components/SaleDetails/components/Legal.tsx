import SaleDetailSection from './SaleDetailSection';

const Legal = () => {
  return (
    <SaleDetailSection title='Legal Disclaimer'>
      <div className='text-center text-lg italic opacity-80 md:text-left md:text-xl'>
        This content, provided by Dusa Labs, is for informational purposes only.
        Dusa Labs makes no guarantees regarding its accuracy, completeness, or
        timeliness, nor endorses any products or services mentioned. Nothing
        here constitutes financial, investment, legal, or professional advice.
        The utility, future value, and market of digital assets described are
        speculative and subject to change without assurance. Consult independent
        advisors before acting on this information. Not available in the United
        States (and its territories), China, Canada, the United Kingdom, and
        certain other jurisdictions.
      </div>
    </SaleDetailSection>
  );
};

export default Legal;
