import { Eye, Trash2 } from 'lucide-react';
import { expenseCategoryColors } from '../../utils/expenseAnalytics';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function ExpenseTable({ expenses, onDeleteExpense, onDetailTrip }) {
  return (
    <section className="expense-table-panel panel">
      <div className="panel-heading">
        <div>
          <h2>Masraf Kayıtları</h2>
          <span>Trip kaynaklı masraflar ve manuel kayıtlar normalize edildi.</span>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Açıklama</th>
              <th>Kategori</th>
              <th>Seyahat</th>
              <th>Firma/Plaka</th>
              <th>Tutar</th>
              <th>Para birimi</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{formatDate(expense.expenseDate)}</td>
                <td>
                  <strong>{expense.description}</strong>
                  <small>{expense.derived ? 'Seyahatten otomatik' : 'Manuel kayıt'}</small>
                </td>
                <td>
                  <span className="expense-chip" style={{ '--chip-color': expenseCategoryColors[expense.category] || expenseCategoryColors.Diğer }}>
                    {expense.category}
                  </span>
                </td>
                <td>{expense.route || '-'}</td>
                <td>{expense.company || expense.vehiclePlate || '-'}</td>
                <td><strong>{formatCurrency(expense.amount, expense.currency)}</strong></td>
                <td>{expense.currency || 'TRY'}</td>
                <td>
                  <div className="action-pair">
                    {expense.trip && (
                      <button type="button" onClick={() => onDetailTrip(expense.trip)} aria-label="Seyahat detayı">
                        <Eye size={16} />
                      </button>
                    )}
                    {!expense.derived && (
                      <button type="button" className="danger-action" onClick={() => onDeleteExpense(expense)} aria-label="Sil">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!expenses.length && (
              <tr>
                <td colSpan="8">
                  <div className="empty-mini">Filtreye uygun masraf bulunamadı.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
