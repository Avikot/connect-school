/**
 * CONNECT: Лідерство без кордонів
 * Fetches schedule from published Google Sheets CSV
 */

// ══════════════════════════════════════════════════════════════════
// CONFIGURATION — Paste your published Google Sheets CSV URL here
// ══════════════════════════════════════════════════════════════════
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSkcYFPkMRQValmufOP245kizOevF-8Kry2ZO9FaTn7Z4wYp7p7o8yIcNpx4LcrwPyyt9IaCeQyoeBZ/pub?output=csv';
// Example: 'https://docs.google.com/spreadsheets/d/e/2PACX-xxxxx/pub?output=csv'

// ══════════════════════════════════════════════════════════════════
// FALLBACK DATA (used when Google Sheets URL is not set or fails)
// ══════════════════════════════════════════════════════════════════
const FALLBACK_SCHEDULE = [
    ["10.30–11.30", "Реєстрація учасників Школи лідерів. Нетворкінг «Знайомство через громади»", "Лідери учнівського самоврядування Великоомелянського ліцею", "Вестибюль ліцею, 1 поверх"],
    ["11.10–11.40", "Відкриття Школи лідерів. Вітальні слова запрошених гостей", "Лідери учнівського самоврядування Великоомелянського ліцею", "Їдальня"],
    ["11.40–12.00", "Представлення діяльності учнівських самоврядувань Великоомелянського ліцею та Грушвицького ліцею", "", "Їдальня"],
    ["12.00–12.10", "Представлення діяльності Печерської ради лідерів ПЕРЛ (м. Київ)", "РОДІОН ДМИТРІЄВ, президент Печерської ради лідерів", "Їдальня"],
    ["12.20–13.20", "Інтерактивний модуль для лідерів «Лідерський хакатон громад»", "Заступник директора КЗ ЦНПВПО РОР", "Спортзал"],
    ["", "Фасилітована дискусія для координаторів: «Координація 2.0: як оживити самоврядування?»", "ЛІЛІЯ ШЕХТЕР, завідувач відділом КЗ ЦНПВПО РОР", "Кабінет фізики, 2 поверх"],
    ["13.30", "Обід", "", "Кабінети ліцею"],
    ["14.10–15.00", "Панельна дискусія «CONNECT: Лідерство без кордонів»", "СОЛОМІЯ НЕСТЕРУК, голова обласної ради старшокласників Рівненщини", "Їдальня"],
    ["15.00–15.10", "Підписання Меморандуму про співпрацю між обласною радою старшокласників Рівненщини та Печерською радою лідерів", "НАЗАР СТЕПАНОВ, заступник директора КЗ ЦНПВПО РОР", "Їдальня"],
    ["15.10–15.25", "Відеозйомка флешмобу лідерів", "ЛІТВІНЧУК І., директор Великоомелянського ліцею", "Подвір'я ліцею"],
];


// ══════════════════════════════════════════════════════════════════
// CSV PARSER
// ══════════════════════════════════════════════════════════════════

function parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(current.trim());
                current = '';
            } else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(current.trim());
                if (row.some(cell => cell !== '')) rows.push(row);
                row = [];
                current = '';
            } else {
                current += ch;
            }
        }
    }
    // Last row
    row.push(current.trim());
    if (row.some(cell => cell !== '')) rows.push(row);

    return rows;
}


// ══════════════════════════════════════════════════════════════════
// RENDER SCHEDULE
// ══════════════════════════════════════════════════════════════════

function renderSchedule(data) {
    const tbody = document.getElementById('scheduleBody');
    tbody.innerHTML = '';

    data.forEach(row => {
        const [time, event, moderator, location] = row;
        if (!event) return; // skip empty rows

        const tr = document.createElement('tr');
        const isLunch = time === '13.30' || event.toLowerCase().includes('обід');
        if (isLunch) tr.classList.add('lunch-row');

        tr.innerHTML = `
            <td>${time || ''}</td>
            <td>${event}</td>
            <td>${moderator || ''}</td>
            <td>${location || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}


// ══════════════════════════════════════════════════════════════════
// FETCH & INIT
// ══════════════════════════════════════════════════════════════════

async function loadSchedule() {
    const tbody = document.getElementById('scheduleBody');

    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="schedule-loading">
                <div class="spinner"></div>
                Завантаження програми...
            </td>
        </tr>
    `;

    // Try Google Sheets first
    if (GOOGLE_SHEETS_CSV_URL) {
        try {
            const response = await fetch(GOOGLE_SHEETS_CSV_URL);
            if (response.ok) {
                const text = await response.text();
                const rows = parseCSV(text);
                // Skip header row (first row)
                const data = rows.slice(1).map(row => [
                    row[0] || '',
                    row[1] || '',
                    row[2] || '',
                    row[3] || ''
                ]);
                if (data.length > 0) {
                    renderSchedule(data);
                    console.log('Schedule loaded from Google Sheets');
                    return;
                }
            }
        } catch (err) {
            console.warn('Google Sheets fetch failed, using fallback:', err);
        }
    }

    // Fallback
    renderSchedule(FALLBACK_SCHEDULE);
    console.log('Schedule loaded from fallback data');
}

// Auto-refresh every 2 minutes
setInterval(async () => {
    try {
        const url = GOOGLE_SHEETS_CSV_URL + '&_t=' + Date.now();
        const response = await fetch(url);
        if (response.ok) {
            const text = await response.text();
            const rows = parseCSV(text);
            const data = rows.slice(1).map(row => [
                row[0] || '', row[1] || '', row[2] || '', row[3] || ''
            ]);
            if (data.length > 0) {
                renderSchedule(data);
            }
        }
    } catch (err) {
        // Silently ignore — will retry next interval
    }
}, 2 * 60 * 1000);

// Init on page load
document.addEventListener('DOMContentLoaded', loadSchedule);
