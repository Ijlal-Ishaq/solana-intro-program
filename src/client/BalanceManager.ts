import { publicKey } from "@project-serum/borsh";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";
import * as borsh from "borsh";

// Replace with the deployed program ID
export const programId = new PublicKey(
  "DDPNybfLY7hrwWeatxc7wxnq1iG4bb7jMCCJt1v54HHR"
);

// Connect to the local Solana cluster
export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Define the instruction types
enum InstructionType {
  Create = 1,
  Credit = 2,
  Debit = 3,
}

// Define the structure of the BalanceAccount
export class BalanceAccount {
  readonly creditedAmount: number;
  readonly debitedAmount: number;
  readonly balance: number;

  constructor(fields: any | undefined = undefined) {
    this.creditedAmount = fields?.creditedAmount ?? 0;
    this.debitedAmount = fields?.debitedAmount ?? 0;
    this.balance = fields?.balance ?? 0;
  }
}

const BalanceAccountSchema = new Map([
  [
    BalanceAccount,
    {
      kind: "struct",
      fields: [
        ["creditedAmount", "u32"],
        ["debitedAmount", "u32"],
        ["balance", "u32"],
      ],
    },
  ],
]);

const BalanceAccountSize = borsh.serialize(
  BalanceAccountSchema,
  new BalanceAccount()
).length;

// Function to fetch the state of the BalanceAccount
export async function getUserBalanceAccount(
  userPublicKey: PublicKey
): Promise<[BalanceAccount | null, PublicKey | null]> {
  try {
    const [userBalanceAccountPublicKey] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance_account"), userPublicKey.toBuffer()],
      programId
    );

    const userBalanceAccount = await connection.getAccountInfo(
      userBalanceAccountPublicKey
    );

    return userBalanceAccount?.data
      ? [
          borsh.deserialize(
            BalanceAccountSchema,
            BalanceAccount,
            userBalanceAccount?.data
          ),
          userBalanceAccountPublicKey,
        ]
      : [null, null];
  } catch (error) {
    console.error(
      `Error fetching user balance account ${userPublicKey}:`,
      error
    );
    throw error;
  }
}

// Helper function to create a BalanceAccount
export async function createBalanceAccount(
  userPublicKey: PublicKey
): Promise<Transaction> {
  try {
    const [userBalanceAccount, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance_account"), userPublicKey.toBuffer()],
      programId
    );

    const instructionTypeBuffer = Buffer.alloc(1);
    instructionTypeBuffer.writeUInt8(InstructionType.Create, 0);

    const bumpBuffer = Buffer.alloc(1);
    bumpBuffer.writeUInt8(bump, 0);

    const instructionData = Buffer.concat([instructionTypeBuffer, bumpBuffer]);

    const createBalanceAccountnstruction = new TransactionInstruction({
      keys: [
        { pubkey: userPublicKey, isSigner: true, isWritable: true },
        { pubkey: userBalanceAccount, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: programId,
      data: instructionData,
    });

    return new Transaction().add(createBalanceAccountnstruction);
  } catch (error) {
    console.error(
      `Error creating balance account for ${userPublicKey}:`,
      error
    );
    throw error;
  }
}

// Function to credit the account
export async function creditAccount(
  userPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
    const [userBalanceAccount, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance_account"), userPublicKey.toBuffer()],
      programId
    );

    const instructionTypeBuffer = Buffer.alloc(1);
    instructionTypeBuffer.writeUInt8(InstructionType.Credit, 0);

    const amountBuffer = Buffer.alloc(4);
    amountBuffer.writeUInt32LE(amount, 0);

    const instructionData = Buffer.concat([
      instructionTypeBuffer,
      amountBuffer,
    ]);

    const creditInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: userBalanceAccount,
          isSigner: false,
          isWritable: true,
        },
      ],
      programId: programId,
      data: instructionData,
    });

    return new Transaction().add(creditInstruction);
  } catch (error) {
    console.error(`Error crediting account ${userPublicKey}:`, error);
    throw error;
  }
}

// Function to debit the account
export async function debitAccount(
  userPublicKey: PublicKey,
  amount: number
): Promise<Transaction> {
  try {
    const [userBalanceAccount, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("balance_account"), userPublicKey.toBuffer()],
      programId
    );

    const instructionTypeBuffer = Buffer.alloc(1);
    instructionTypeBuffer.writeUInt8(InstructionType.Debit, 0);

    const amountBuffer = Buffer.alloc(4);
    amountBuffer.writeUInt32LE(amount, 0);

    const instructionData = Buffer.concat([
      instructionTypeBuffer,
      amountBuffer,
    ]);

    const debitInstruction = new TransactionInstruction({
      keys: [
        {
          pubkey: userBalanceAccount,
          isSigner: false,
          isWritable: true,
        },
      ],
      programId: programId,
      data: instructionData,
    });

    return new Transaction().add(debitInstruction);
  } catch (error) {
    console.error(`Error debiting account ${userPublicKey}:`, error);
    throw error;
  }
}
