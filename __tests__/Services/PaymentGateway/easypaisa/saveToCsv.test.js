
import fs from "fs"
import path from "path"
import easyPaisaService from "../../../../dist/services/paymentGateway/easypaisa.js";


// Manually define __dirname for CommonJS compatibility
const __dirname = path.resolve();

describe('saveToCsv', () => {
  const record = { id: '1', order_amount: 100, balance: 50, status: 'Completed' };

  let csvFilePath = path.join(__dirname, 'records.csv');

  afterEach(() => {
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
    }
  });

  it('should write a record to the CSV file', async () => {
    await easyPaisaService.saveToCsv(record);
    expect(fs.existsSync(csvFilePath)).toBeTruthy();
    const content = fs.readFileSync(csvFilePath, 'utf8');
    expect(content).toContain('1,100,50,Completed');
  });

  it('should append records to the existing CSV file', async () => {
    // Write first record
    await easyPaisaService.saveToCsv(record);

    // Write second record
    const secondRecord = { id: '2', order_amount: 200, balance: 150, status: 'Pending' };
    await easyPaisaService.saveToCsv(secondRecord);

    // Verify file exists
    expect(fs.existsSync(csvFilePath)).toBeTruthy();

    // Verify both records exist
    const content = fs.readFileSync(csvFilePath, 'utf8');
    expect(content).toContain('1,100,50,Completed');
    expect(content).toContain('2,200,150,Pending');
  });

  it('should handle errors gracefully when writing to the CSV file', async () => {
    // Mock an error in writeRecords
    jest.mock('csv-writer', () => ({
      createObjectCsvWriter: jest.fn().mockReturnValue({
        writeRecords: jest.fn().mockRejectedValue(new Error('File Write Error')),
      }),
    }));

    console.error = jest.fn(); // Mock console.error to suppress error logs

    await expect(easyPaisaService.saveToCsv(record)).resolves.not.toThrow();

    expect(console.error).toHaveBeenCalledWith(
      'Error writing to CSV file:',
      expect.any(Error)
    );
  });

});
