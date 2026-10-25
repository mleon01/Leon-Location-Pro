const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

/** 151,9 → « 151,90 € » (comme Odoo) */
export const money = (n: number) => eur.format(n).replace(/ /g, ' ')
