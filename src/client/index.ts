import {
  Account,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
} from "@solana/web3.js";
import {
  getUserBalanceAccount,
  createBalanceAccount,
  creditAccount,
  debitAccount,
  BalanceAccount,
  connection,
  programId,
} from "./BalanceManager";
import * as secretKey from "./secretKey.json";
import * as bs58 from "bs58";

async function main() {
  const { secretKey: userSecretKey, publicKey: userPublicKey } =
    Keypair.fromSecretKey(Uint8Array.from(secretKey));

  const payer = new Account(userSecretKey);

  // Console User State
  await getAccountDetails(userPublicKey, payer);

  // Credit the account with 100
  console.log("Credit the account with 100");
  const creditTx = await creditAccount(new PublicKey(userPublicKey ?? ""), 100);
  await sendTransaction(creditTx, [payer]);

  // Console User State
  await getAccountDetails(userPublicKey, payer);

  // Debit the account with 50
  console.log("Debit the account with 50");
  const debitTx = await debitAccount(new PublicKey(userPublicKey ?? ""), 50);
  await sendTransaction(debitTx, [payer]);

  // Console User State
  await getAccountDetails(userPublicKey, payer);
}

async function getAccountDetails(
  userPublicKey: PublicKey,
  payer: Account
): Promise<BalanceAccount | null> {
  var [userBalanceAccount, userBalanceAccountPublicKey] =
    await getUserBalanceAccount(userPublicKey);

  if (userBalanceAccount) {
    printAccountDetails(userBalanceAccountPublicKey, userBalanceAccount);
    return userBalanceAccount;
  }

  const accountCreationTx = await createBalanceAccount(userPublicKey);
  await sendTransaction(accountCreationTx, [payer]);

  var [userBalanceAccount, userBalanceAccountPublicKey] =
    await getUserBalanceAccount(userPublicKey);

  printAccountDetails(userBalanceAccountPublicKey, userBalanceAccount);
  return userBalanceAccount;
}

function printAccountDetails(
  userBalanceAccountPublicKey: PublicKey | null,
  userBalanceAccount: BalanceAccount | null
): void {
  console.log("userBalanceAccount => ", {
    userPublicKey: bs58.encode(userBalanceAccountPublicKey?.toBuffer() ?? []),
    creditAccount: userBalanceAccount?.creditedAmount,
    debitAccount: userBalanceAccount?.debitedAmount,
    balance: userBalanceAccount?.balance,
  });
}

// Helper function to send and confirm a transaction
async function sendTransaction(
  transaction: Transaction,
  signer: Account[]
): Promise<void> {
  const result = await sendAndConfirmTransaction(
    connection,
    transaction,
    signer,
    {
      commitment: "single",
    }
  );
  console.log("Tx hash => ", result);
}

main().then(
  () => process.exit(),
  (err) => {
    console.error(err);
    process.exit(-1);
  }
);
