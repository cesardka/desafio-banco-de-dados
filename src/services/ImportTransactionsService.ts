import csvParse from 'csv-parse';
import { getRepository, getCustomRepository, In } from 'typeorm';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface CSVParsedData {
  transactions: CSVTransaction[];
  categories: string[];
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[] | null> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { transactions, categories } = await this.parseCSVData(filePath);
    const allCategories = await this.filterAndSortCategories(categories);

    const newTransactionsWithCategories = transactions.map(transaction => ({
      title: transaction.title,
      type: transaction.type,
      value: transaction.value,
      category: allCategories.find(
        category => category.title === transaction.category,
      ),
    }));

    const createdTransactions = transactionsRepository.create(
      newTransactionsWithCategories,
    );

    await transactionsRepository.save(createdTransactions);

    return createdTransactions;
  }

  private async parseCSVData(filePath: string): Promise<CSVParsedData> {
    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));
    await fs.promises.unlink(filePath);

    return {
      transactions,
      categories,
    };
  }

  private async filterAndSortCategories(
    categories: string[],
  ): Promise<Category[]> {
    const categoriesRepository = getRepository(Category);

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const newCategoriesTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((title, index, self) => self.indexOf(title) === index);

    const newCategories = await categoriesRepository.create(
      newCategoriesTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    return [...newCategories, ...existentCategories];
  }
}

export default ImportTransactionsService;
