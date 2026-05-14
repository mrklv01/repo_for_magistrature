import Papa from "papaparse";

/** Parse a CSV File object, return array of row objects keyed by header names. */
export function parseCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0]?.message ?? "CSV parse error"));
        } else {
          resolve(results.data);
        }
      },
      error: (err: { message: string }) => reject(new Error(err.message)),
    });
  });
}
