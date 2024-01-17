use borsh::{BorshDeserialize, BorshSerialize};
use borsh_derive::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

// Define the type of state stored in accounts
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct BalanceAccount {
    pub credited_amount: u32,
    pub debited_amount: u32,
    pub balance: u32,
}

// Declare and export the program's entrypoint
entrypoint!(process_instruction);

// Program entrypoint's implementation
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("Program entrypoint");

    if instruction_data.len() < 1 {
        return Err(ProgramError::InvalidInstructionData);
    }

    let instruction_type = instruction_data[0];

    match instruction_type {
        1 => {
            let bump: u8 = u8::from_le_bytes(instruction_data[1..].try_into().unwrap());
            process_create_balance_account_instruction(program_id, accounts, bump)?;
        }
        2 => {
            let amount: u32 = u32::from_le_bytes(instruction_data[1..].try_into().unwrap());
            process_credit_instruction(program_id, accounts, amount)?;
        }
        3 => {
            let amount: u32 = u32::from_le_bytes(instruction_data[1..].try_into().unwrap());
            process_debit_instruction(program_id, accounts, amount)?;
        }
        _ => {
            return Err(ProgramError::InvalidInstructionData);
        }
    }

    Ok(())
}

// Helper function to process create balance account instruction
fn process_create_balance_account_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    bump: u8,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();

    let user_account = next_account_info(accounts_iter)?;
    let user_balance_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    let space = 12;
    let lamports = (Rent::get()?).minimum_balance(space);

    // Create the user_balance_account account
    solana_program::program::invoke_signed(
        &solana_program::system_instruction::create_account(
            user_account.key,
            &user_balance_account.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[
            user_account.clone(),
            user_balance_account.clone(),
            system_program.clone(),
        ],
        &[&[b"balance_account", &user_account.key.to_bytes(), &[bump]]],
    )?;

    msg!(
        "user balance account {} successfully created",
        user_balance_account.key.to_string()
    );

    Ok(())
}

// Helper function to process credit instruction
fn process_credit_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u32,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;

    if account.owner != program_id {
        msg!("Account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut balance_account = BalanceAccount::try_from_slice(&account.data.borrow())?;
    balance_account.credited_amount += amount;
    balance_account.balance += amount;
    balance_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!(
        "Credited {} to the balance, new balance: {}",
        amount,
        balance_account.balance
    );

    Ok(())
}

// Helper function to process debit instruction
fn process_debit_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u32,
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;

    if account.owner != program_id {
        msg!("Account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

    let mut balance_account = BalanceAccount::try_from_slice(&account.data.borrow())?;
    balance_account.debited_amount += amount;

    if balance_account.balance < amount {
        msg!("Insufficient funds for debit");
        return Err(ProgramError::InsufficientFunds);
    }

    balance_account.balance -= amount;
    balance_account.serialize(&mut &mut account.data.borrow_mut()[..])?;

    msg!(
        "Debited {} from the balance, new balance: {}",
        amount,
        balance_account.balance
    );

    Ok(())
}
