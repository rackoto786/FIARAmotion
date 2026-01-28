export interface OcrResult {
    date?: string;
    heure?: string;
    numeroTicket?: string;
    station?: string;
    totalAchete?: number;
    prixUnitaire?: number;
    quantiteAchetee?: number;
}

const STATION_OPTIONS = [
    "Karenjy (Ankidona)",
    "Vohibola (Antarandolo)",
    "Miregnina (Ampasambazaha)",
];

export const parseFuelTicketText = (text: string): OcrResult => {
    const result: OcrResult = {};
    const lines = text.split('\n');

    // 1. Date Extraction (DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY)
    const dateRegex = /(\d{2}[\/\-]\d{2}[\/\-]\d{4})|(\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        let dateStr = dateMatch[0].replace(/-/g, '/');
        // If YYYY/MM/DD, convert to YYYY-MM-DD for input[type=date]
        if (dateStr.match(/^\d{4}/)) {
            result.date = dateStr.replace(/\//g, '-');
        } else {
            // If DD/MM/YYYY, convert to YYYY-MM-DD
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                result.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
    }

    // 2. Heure Extraction (HH:MM or HHhMM)
    const timeRegex = /(\d{2}[:h]\d{2})/;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
        result.heure = timeMatch[0].replace('h', ':');
    }

    // 3. Station Detection
    for (const station of STATION_OPTIONS) {
        // Extract the main name (before parenthesis)
        const shortName = station.split(' ')[0].toLowerCase();
        if (text.toLowerCase().includes(shortName)) {
            result.station = station;
            break;
        }
    }

    // 4. Ticket Number (following # or NO or TICKET)
    const ticketRegex = /(?:TICKET|NO|#|NUMERO)[:\s]+(\d+)/i;
    const ticketMatch = text.match(ticketRegex);
    if (ticketMatch) {
        result.numeroTicket = ticketMatch[1];
    }

    // 5. Numeric Values (Total, PU, Qty)
    // We need to be careful with commas and dots
    const cleanNumber = (val: string) => parseFloat(val.replace(',', '.').replace(/\s/g, ''));

    lines.forEach(line => {
        const l = line.toUpperCase();

        // Total
        if (l.includes('TOTAL') || l.includes('NET A PAYER') || l.includes('AR')) {
            const match = l.match(/(\d+[\.,\s]\d{2,3})/);
            if (match && !result.totalAchete) {
                result.totalAchete = cleanNumber(match[1]);
            }
        }

        // Prix Unitaire
        if (l.includes('P.U') || l.includes('PU') || l.includes('PRIX')) {
            const match = l.match(/(\d+[\.,]\d{2,3})/);
            if (match && !result.prixUnitaire) {
                result.prixUnitaire = cleanNumber(match[1]);
            }
        }

        // Quantité / Litres
        if (l.includes('LITRE') || l.includes(' QTE') || l.includes(' VOU')) {
            const match = l.match(/(\d+[\.,]\d{2,3})/);
            if (match && !result.quantiteAchetee) {
                result.quantiteAchetee = cleanNumber(match[1]);
            }
        }
    });

    return result;
};
