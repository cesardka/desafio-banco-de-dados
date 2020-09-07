import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const findTransactions = await this.find();

    const incomeTransactions = this.totalBalanceByType(
      findTransactions,
      'income',
    );
    const outcomeTransactions = this.totalBalanceByType(
      findTransactions,
      'outcome',
    );
    const totalTransactions = incomeTransactions - outcomeTransactions;

    const currentBalance: Balance = {
      income: incomeTransactions,
      outcome: outcomeTransactions,
      total: totalTransactions,
    };

    return currentBalance;
  }

  private totalBalanceByType(
    transactions: Transaction[],
    type: 'income' | 'outcome',
  ): number {
    const transactionsOfType = transactions.filter(
      transaction => transaction.type === type,
    );
    if (transactionsOfType.length < 1) {
      return 0;
    }

    const transactionsValues = transactionsOfType.map(
      transaction => transaction.value,
    );
    const transactionsSum = transactionsValues.reduce(
      (sum, transactionValue) => sum + transactionValue,
    );

    return transactionsSum;
  }
}

export default TransactionsRepository;
