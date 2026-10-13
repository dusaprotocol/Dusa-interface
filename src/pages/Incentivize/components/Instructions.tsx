const Instructions = () => {
  return (
    <>
      <h1 className='text-foreground mb-10 text-3xl font-semibold'>Voting</h1>
      <p className='text-accent-80 mb-4 mt-4'>
        $veDUSA holders decide which liquidity pools receive $DUSA emissions. In
        return, voters receive 100% of the trading fees and bribes collected
        from the liquidity pool they vote for.
      </p>
      <h2 className='text-foreground mb-4 mt-10 text-2xl font-semibold'>
        Instructions
      </h2>
      <p className='text-accent-80 mb-4 mt-4'>
        Distribute 100% of your Lock’s (veNFT) vote-power among your preferred
        pools and Cast your vote. Repeat for each of your Locks (veNFTs).
        Unallocated vote-power (if &lt; 100%) will be split proportionally among
        the selected pools. Each Lock (veNFT) can only cast votes once per
        epoch.
      </p>
      <p className='text-accent-80 mb-4 mt-4'>
        If you increased your Lock’s (veNFT) balance during the epoch, recast
        your vote to allocate your vote-power in full. Unchanged votes carry
        over into the next epoch.
      </p>
      <h2 className='text-foreground mb-4 mt-10 text-2xl font-semibold'>
        Timeline
      </h2>
      <p className='text-accent-80 mb-4 mt-4'>
        Votes for the next epoch, are due by Wednesday at 23:00 UTC, 1 hour
        before next epoch begins. During the following two hours, no voting
        operations will take place as this time is reserved for protocol
        operations/automations.
      </p>
      <h2 className='text-foreground mb-4 mt-10 text-2xl font-semibold'>
        Rewards
      </h2>
      <p className='text-accent-80 mb-4 mt-4'>
        Voting rewards for a given epoch will appear in your Dashboard after the
        epoch change on Thursday at 00:00 UTC. Rebase rewards for new locks will
        appear after the second epoch change.
      </p>
    </>
  );
};

export default Instructions;
