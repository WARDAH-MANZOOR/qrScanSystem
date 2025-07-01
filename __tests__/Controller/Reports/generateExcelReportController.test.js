import { reportService } from "../../../dist/services/index.js";
import ReportController from "../../../dist/controller/reports/excel.js";
import path from "path";

jest.mock("../../../dist/services/index.js", () => ({
    reportService: {
        generateExcelReportService: jest.fn(),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

const mockRequest = () => ({});
const mockResponse = () => {
    const res = {};
    res.download = jest.fn((filePath, filename, callback) => {
        if (callback) callback(null); // Simulating successful download
    });
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
beforeEach(() => {
    jest.clearAllMocks(); // Reset mock state before each test
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.error
});

  afterEach(() => {
    console.error.mockRestore(); // Restore console.error after tests
  });
describe("generateExcelReportController", () => {
    let req, res, next;

    beforeEach(() => {
        req = mockRequest();
        res = mockResponse();
        next = jest.fn();
    });

    it("should successfully generate and download an Excel report", async () => {
        const mockReportPath = path.join(__dirname, "merchant_report.xlsx");
        reportService.generateExcelReportService.mockResolvedValue(mockReportPath);

        await ReportController.generateExcelReportController(req, res, next);

        expect(reportService.generateExcelReportService).toHaveBeenCalled();
        expect(res.download).toHaveBeenCalledWith(mockReportPath, "merchant_report.xlsx", expect.any(Function));
    });

    it("should handle errors when file download fails", async () => {
        const mockReportPath = path.join(__dirname, "merchant_report.xlsx");
        reportService.generateExcelReportService.mockResolvedValue(mockReportPath);

        res.download = jest.fn((filePath, filename, callback) => {
            callback(new Error("Download failed"));
        });

        await ReportController.generateExcelReportController(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Error downloading the file." });
    });

    it("should handle unexpected errors", async () => {
        const error = new Error("Service error");
        reportService.generateExcelReportService.mockRejectedValue(error);

        await ReportController.generateExcelReportController(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});
