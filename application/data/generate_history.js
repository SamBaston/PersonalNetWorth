const fs = require('fs');
const path = require('path');

const dataPath = path.join('c:\\Users\\samba\\OneDrive\\Documents\\Durham University\\Year 1\\CompSci\\Programming Black\\Coursework 2\\PersonalNetWorth\\application\\data', 'data.json');
let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Function to generate history points
function generateHistory(currentVal, isDebt, isLISA, isStudentLoan) {
    const history = [];
    let startVal;
    
    if (isStudentLoan) {
        startVal = currentVal * 0.7; // Student loan grows from 2020
    } else if (isDebt) {
        startVal = currentVal * 1.5; // Debts go down over time
    } else {
        startVal = currentVal * 0.3; // Assets go up over time
    }
    
    if (currentVal === 0) startVal = 0;
    
    const startDate = new Date('2020-01-01');
    const endDate = new Date('2026-02-01');
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
    
    for (let i = 0; i <= months; i += 3) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        
        const progress = i / months;
        const noise = 1 + (Math.random() * 0.05 - 0.025); // +/- 2.5% noise
        
        let val = startVal + (currentVal - startVal) * progress;
        val = val * noise;
        if (val < 0) val = 0;
        
        if (isLISA) {
            history.push({
                date: d.toISOString(),
                base_balance: val * 0.8,
                pending_bonus: val * 0.2
            });
        } else {
            history.push({
                date: d.toISOString(),
                balance: val,
                accrued_interest: 0
            });
        }
    }
    
    return history;
}

['bank_accounts', 'isas', 'lisas', 'stock_portfolios'].forEach(cat => {
    if (data.assets[cat]) {
        data.assets[cat].forEach(item => {
            const currentBal = item.balance !== undefined ? item.balance : 
                (item.base_balance ? item.base_balance + item.pending_bonus : 0);
            
            const hist = generateHistory(currentBal, false, cat === 'lisas', false);
            
            if (item.history) {
                hist.push(...item.history.filter(h => new Date(h.date) >= new Date('2026-03-01')));
            }
            item.history = hist;
        });
    }
});

['student_loans', 'credit_cards', 'personal_loans', 'mortgages'].forEach(cat => {
    if (data.liabilities[cat]) {
        data.liabilities[cat].forEach(item => {
            const currentBal = item.balance || 0;
            const hist = generateHistory(currentBal, true, false, cat === 'student_loans');
            
            const existingRecent = (item.history || []).filter(h => new Date(h.date) >= new Date('2026-03-01'));
            hist.push(...existingRecent);
            
            item.history = hist;
        });
    }
});

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log("Updated data.json with historic data!");
