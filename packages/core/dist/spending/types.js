export function spendingPaidTotal(entries) {
    return spendingDebtPaidTotal(entries) + spendingNonDebtPaidTotal(entries);
}
export function spendingDebtPaidTotal(entries) {
    return entries.filter((e) => e.paid && e.debtPaid).reduce((sum, e) => sum + e.amount, 0);
}
export function spendingNonDebtPaidTotal(entries) {
    return entries.filter((e) => e.paid && !e.debtPaid).reduce((sum, e) => sum + e.amount, 0);
}
