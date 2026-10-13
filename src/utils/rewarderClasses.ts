import { BigintIsh } from '@dusalabs/sdk/dist/constants';
import { Args, DeserializedResult, Serializable } from '@massalabs/massa-web3';

class Bytes32 implements Serializable<Bytes32> {
  public serialized: Uint8Array = new Uint8Array(32);

  serialize(): Uint8Array {
    return this.serialized;
  }

  deserialize(
    buffer: Uint8Array,
    offset?: number
  ): DeserializedResult<Bytes32> {
    const args = new Args(buffer, offset);

    this.serialized = args.nextUint8Array();
    return { instance: this, offset: args.getOffset() };
  }
}

export class Market implements Serializable<Market> {
  constructor(
    public duration: bigint = 0n,
    public epoch: bigint = 0n,
    public length: number = 0,
    public marketAddress: string = '',
    public root: Bytes32 = new Bytes32(),
    public start: bigint = 0n,
    public rewards: Reward[] = [new Reward()]
  ) {}

  serialize(): Uint8Array {
    const args = new Args()
      .addU64(this.duration)
      .addU64(this.epoch)
      .addString(this.marketAddress)
      .addUint8Array(this.root.serialize())
      .addU64(this.start)
      .addSerializableObjectArray(this.rewards)
      .serialize();
    return Uint8Array.from(args);
  }

  deserialize(buffer: Uint8Array, offset?: number): DeserializedResult<Market> {
    const args = new Args(buffer, offset);

    this.duration = args.nextU64();
    this.epoch = args.nextU64();
    this.marketAddress = args.nextString();
    this.root = args.nextSerializable(Bytes32);
    this.start = args.nextU64();
    this.rewards = args.nextSerializableObjectArray(Reward);
    this.length = this.rewards.length;
    return { instance: this, offset: args.getOffset() };
  }
}

class Reward implements Serializable<Reward> {
  constructor(
    public tokenAddress: string = '',
    public totalRewards: bigint = 0n,
    public length: number = 0,
    public users: User[] = [new User()]
  ) {}

  serialize(): Uint8Array {
    const args = new Args()
      .addString(this.tokenAddress)
      .addU256(this.totalRewards)
      .addSerializableObjectArray(this.users)
      .serialize();
    return Uint8Array.from(args);
  }

  deserialize(buffer: Uint8Array, offset?: number): DeserializedResult<Reward> {
    const args = new Args(buffer, offset);

    this.tokenAddress = args.nextString();
    this.totalRewards = args.nextU256();
    this.users = args.nextSerializableObjectArray(User);
    this.length = this.users.length;
    return { instance: this, offset: args.getOffset() };
  }
}

class User implements Serializable<User> {
  constructor(
    public amount: bigint = 0n,
    public proof: Bytes32[] = [new Bytes32()],
    public address: string = ''
  ) {}

  serialize(): Uint8Array {
    const args = new Args()
      .addU256(this.amount)
      .addI32(BigInt(this.proof.length))
      .addSerializableObjectArray(this.proof)
      .addString(this.address)
      .serialize();
    return Uint8Array.from(args);
  }

  deserialize(buffer: Uint8Array, offset?: number): DeserializedResult<User> {
    const args = new Args(buffer, offset);

    this.amount = args.nextU256();
    const len = args.nextI32();
    const proof: Bytes32[] = [];
    for (let i = 0; i < len; i++) {
      proof.push(args.nextSerializable(Bytes32));
    }
    this.proof = proof;
    this.address = args.nextString();

    return { instance: this, offset: args.getOffset() };
  }
}

export type MarketData = {
  address: string;
  epoch: number;
  start: number;
  duration: number;
  length: number;
  rewards: RewardData[];
};

export type RewardData = {
  address: string;
  totalRewards: BigintIsh;
  length: number;
  users: UserData[];
};

export type UserData = {
  address: string;
  amount: BigintIsh;
};

export type JSONData = {
  length: number;
  markets: MarketData[];
};
