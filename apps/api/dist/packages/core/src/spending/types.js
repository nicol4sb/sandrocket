export function spendingPaidTotal(entries) {
    return entries.filter((e) => e.paid).reduce((sum, e) => sum + e.amount, 0);
}
