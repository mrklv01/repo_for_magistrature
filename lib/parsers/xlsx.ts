import * as XLSX from "xlsx";

/** Parse an XLSX/XLS File object, return rows from the first sheet as string-keyed objects. */
export function parseXlsx(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Пустой файл");
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) throw new Error("Листы не найдены");
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { raw: false });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsArrayBuffer(file);
  });
}
