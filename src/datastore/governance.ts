import { IBaseContract } from '@dusalabs/sdk';
import { Args, U32 } from '@massalabs/massa-web3';
import { governanceSC } from 'utils/config';
import { parseSlot } from 'utils/methods';
import { Proposal } from 'utils/types';
import { baseClientSale } from 'utils/w3';

// use `readSmartContract` instead?
export const fetchUserVote = (
  proposalId: number,
  address: string,
  allDatastoreKeys: string[]
): boolean =>
  allDatastoreKeys
    .filter((key) => key.startsWith(`v::${proposalId}`))
    .filter((key) => key.endsWith(address)).length === 1;

const decodeProposal = (data: Uint8Array, id: number): Proposal => {
  const args = new Args(data);
  args.nextString(); // proposer
  const title = args.nextString();
  const description = args.nextString();
  args.nextU64(); // startBlock
  const endBlock = Number(args.nextU64());
  const forVotes = args.nextU256();
  const abstainVotes = args.nextU256();
  const againstVotes = args.nextU256();
  const endTimestamp = parseSlot(0, endBlock);

  const proposal: Proposal = {
    id,
    title,
    description,
    forVotes,
    againstVotes,
    abstainVotes,
    timestamp: endTimestamp,
    status: endTimestamp < Date.now() ? 'ended' : 'active'
  };

  return proposal;
};

export const fetchProposals = async (
  proposalCount: number
): Promise<Proposal[]> => {
  const prefix = 'p::';
  const bs = Array.from(
    { length: proposalCount },
    (_, i) => prefix + i.toString()
  );

  return new IBaseContract(governanceSC, baseClientSale)
    .extract(bs)
    .then((r) => {
      const res: Proposal[] = [];
      r.forEach((item, i) => {
        if (!item?.length) return;

        const proposal = decodeProposal(item, i);
        res.push(proposal);
      });
      return res.reverse();
    })
    .catch(() => []);
};

export const fetchProposalsWithCount = async (): Promise<Proposal[]> => {
  const contract = new IBaseContract(governanceSC, baseClientSale);

  try {
    // First get the proposal count
    const countResult = await contract.extract(['PROPOSAL_COUNT']);
    if (!countResult[0]?.length) return [];

    const proposalCount = Number(U32.fromBytes(countResult[0]));
    if (proposalCount === 0) return [];

    // Then fetch all proposals in one batch
    const prefix = 'p::';
    const keys = Array.from(
      { length: proposalCount },
      (_, i) => prefix + i.toString()
    );

    const results = await contract.extract(keys);
    const proposals: Proposal[] = [];

    results.forEach((item, i) => {
      if (!item?.length) return;
      const proposal = decodeProposal(item, i);
      proposals.push(proposal);
    });

    return proposals.reverse();
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
};

export const fetchProposal = async (propodalId: number): Promise<Proposal> => {
  return new IBaseContract(governanceSC, baseClientSale)
    .extract([`p::${propodalId}`])
    .then((r) => {
      if (!r[0]?.length) throw new Error('No proposal found');

      const proposal = decodeProposal(r[0], propodalId);
      return proposal;
    });
};
