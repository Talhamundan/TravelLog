import { Banknote, Car, CreditCard, Fuel, Gauge, ReceiptText, TrendingUp, WalletCards } from 'lucide-react';

const icons = [WalletCards, CreditCard, Gauge, TrendingUp, ReceiptText, Fuel, Banknote, Car];

export default function ExpenseSummaryCards({ kpis }) {
  return (
    <section className="expense-kpi-grid">
      {kpis.map((item, index) => {
        const Icon = icons[index] || ReceiptText;
        return (
          <article className={`expense-kpi-card tone-${item.tone || 'blue'}`} key={item.label}>
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.change}</small>
            </div>
            <i>
              <Icon size={22} />
            </i>
          </article>
        );
      })}
    </section>
  );
}
