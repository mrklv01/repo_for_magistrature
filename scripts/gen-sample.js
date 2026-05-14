// @ts-check
const fs = require("fs");
const path = require("path");

const employees = [
  "Иванов Алексей Николаевич",       // 0: burnout
  "Петрова Светлана Константиновна", // 1: overloaded
  "Сидоров Владимир Григорьевич",    // 2: baseline
  "Козлова Елена Анатольевна",       // 3: baseline
  "Морозов Дмитрий Олегович",        // 4: baseline
  "Новикова Регина Вячеславовна",    // 5: baseline
  "Михайлов Тимур Павлович",         // 6: baseline
];

const initiators = [
  "Смирнов И.И.", "Кузнецов А.В.", "Попова Е.С.", "Волкова М.Д.",
  "Жуков С.Н.", "Соколова О.П.", "Николаев В.К.", "Захарова Л.А.",
  "Беляев Р.Т.", "Орлова Д.Ю.",
];
const approvers = ["Романов А.И.", "Федоров Е.М.", "Семенова Н.Г."];

const categories = [
  "Компьютеры и периферия",
  "Сетевое оборудование",
  "Программное обеспечение",
  "Доступ и права",
  "Телефония",
  "Сервер и СХД",
];
const types = ["Выдача и установка", "Ремонт", "Настройка", "Консультация", "Инцидент", "Запрос"];
const descriptions = [
  "Не работает принтер в переговорной комнате 3, сотрудники не могут распечатать документы",
  "Требуется настройка VPN-подключения для удалённой работы нового сотрудника",
  "Сотрудник не может войти в систему 1C после смены пароля, блокировка учётной записи",
  "Необходима установка Microsoft Office 365 на новое рабочее место в отделе продаж",
  "Медленная работа корпоративной сети в отделе закупок, скорость менее 1 Мбит/с",
  "Замена клавиатуры и мыши на рабочем месте, старое оборудование вышло из строя",
  "Настройка почтового клиента Outlook для нового сотрудника отдела бухгалтерии",
  "Восстановление случайно удалённых файлов проекта из резервной копии NAS",
  "Расширение прав доступа к файловому серверу для группы аналитиков данных",
  "Неисправен монитор, вертикальная полоса на экране, требуется замена",
  "Настройка двухфакторной аутентификации для входа в корпоративную ERP-систему",
  "Установка и обновление антивирусного ПО на рабочих станциях отдела кадров",
  "Подключение нового ноутбука к корпоративному Wi-Fi, проблема с аутентификацией",
  "Перенос пользовательских данных и настроек с устаревшего компьютера на новый",
  "Проблема с запуском специализированного ПО AutoCAD, ошибка лицензирования",
  "Не работает IP-телефон на рабочем месте руководителя проектов, нет тонального сигнала",
  "Добавление нового пользователя в Active Directory и настройка групповых политик",
  "Сбой RAID-массива на файловом сервере, необходима диагностика и восстановление",
  "Замена вышедшего из строя блока питания в рабочей станции инженерного отдела",
  "Обновление прошивки сетевого коммутатора в серверной комнате, плановые работы",
];

const rng = (() => {
  let seed = 42;
  return () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  };
})();

function ri(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function addMin(d, m) { return new Date(d.getTime() + m * 60000); }
function addHr(d, h) { return new Date(d.getTime() + h * 3600000); }
function addDay(d, n) { return new Date(d.getTime() + n * 86400000); }

function fmt(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const periodStart = new Date("2025-10-01T08:00:00");
const periodEnd   = new Date("2026-04-21T18:00:00");
const totalDays   = Math.floor((periodEnd - periodStart) / 86400000);

let counter = 2000000;
const rows = [];

function genTickets(empName, empIdx) {
  const isBurnout   = empIdx === 0;
  const isOverloaded = empIdx === 1;
  const total = isOverloaded ? 90 : ri(60, 75);

  for (let i = 0; i < total; i++) {
    const dayOffset = ri(0, totalDays - 1);
    const progress  = dayOffset / totalDays;

    // Hour of acceptance
    let hour;
    if (isBurnout && rng() < 0.27) {
      hour = ri(19, 22);                // evening overwork
    } else if (isOverloaded && rng() < 0.10) {
      hour = ri(7, 8);                  // early starts
    } else {
      hour = ri(9, 18);
    }
    const created = new Date(periodStart);
    created.setDate(created.getDate() + dayOffset);
    created.setHours(hour, ri(0, 59), ri(0, 59), 0);

    const responseMin = ri(3, 45);
    const accepted = addMin(created, responseMin);

    // Priority
    let priority;
    if (isBurnout) {
      const r = rng();
      priority = r < 0.22 ? "Критичный" : r < 0.48 ? "Высокий" : r < 0.82 ? "Средний" : "Низкий";
    } else if (isOverloaded) {
      const r = rng();
      priority = r < 0.10 ? "Критичный" : r < 0.30 ? "Высокий" : r < 0.75 ? "Средний" : "Низкий";
    } else {
      const r = rng();
      priority = r < 0.05 ? "Критичный" : r < 0.18 ? "Высокий" : r < 0.76 ? "Средний" : "Низкий";
    }

    // Resolution time (hours)
    let resHours;
    if (isBurnout) {
      // Grows from ~3h to ~14h over the period
      resHours = 3 + progress * 11 + rng() * 2 - 0.5;
    } else if (isOverloaded) {
      resHours = ri(4, 10) + rng();
    } else {
      resHours = ri(2, 6) + rng();
    }

    // Closure rate
    const closureRate = isBurnout ? 0.83 : isOverloaded ? 0.78 : 0.93;
    const closed = rng() < closureRate;

    let resolved = null;
    let stage;
    if (closed) {
      resolved = addHr(accepted, resHours);
      if (resolved > periodEnd) resolved = periodEnd;
      stage = rng() < 0.92 ? "Закрыт" : "Решён";
    } else {
      stage = pick(["В работе", "Ожидание клиента", "Создание заявки"]);
    }

    const approver = rng() < 0.65 ? pick(approvers) : "";

    counter++;
    rows.push([
      `ITHD_${counter}`,
      fmt(created),
      fmt(accepted),
      resolved ? fmt(resolved) : "",
      pick(categories),
      pick(types),
      `"${pick(descriptions)}"`,
      priority,
      `"${empName}"`,
      `"${pick(initiators)}"`,
      approver ? `"${approver}"` : "",
      stage,
    ].join(","));
  }
}

employees.forEach((e, i) => genTickets(e, i));

// Shuffle (Fisher-Yates)
for (let i = rows.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [rows[i], rows[j]] = [rows[j], rows[i]];
}

const header = "ticket_id,created_at,accepted_at,resolved_at,category,type,description,priority,assigned_to,initiator,approver,stage";
const csv = [header, ...rows].join("\n");

const outPath = path.join(__dirname, "..", "public", "sample-tickets.csv");
fs.writeFileSync(outPath, csv, "utf8");
console.log(`Generated ${rows.length} tickets → ${outPath}`);
