export const CURRENCY = 'NGN';

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: CURRENCY });

/** 25000 -> "₦25,000.00" */
export const formatMoney = (n: number) => naira.format(n);
