import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api, endpoints } from '../lib/api';
import type { Payment, PaymentStatus } from '../types';

const statusConfig: Record<PaymentStatus, { label: string; icon: any; className: string }> = {
  pending: { label: 'En attente', icon: Clock, className: 'text-amber-600 bg-amber-100' },
  paid: { label: 'Payé', icon: CheckCircle, className: 'text-emerald-600 bg-emerald-100' },
  refunded: { label: 'Remboursé', icon: RefreshCw, className: 'text-blue-600 bg-blue-100' },
  partially_refunded: { label: 'Remb. partiel', icon: RefreshCw, className: 'text-purple-600 bg-purple-100' },
  failed: { label: 'Échoué', icon: XCircle, className: 'text-red-600 bg-red-100' },
};

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', statusFilter, dateRange],
    queryFn: async () => {
      // Mock data for now
      return [
        {
          id: '1',
          bookingId: 'abc-123',
          amount: 35.50,
          currency: 'eur',
          status: 'paid' as PaymentStatus,
          paymentMethod: 'card' as const,
          paidAt: '2026-02-04T10:30:00Z',
          booking: {
            id: 'abc-123',
            customerName: 'Jean Dupont',
            pickup: { address: 'Gare Centrale', lat: 0, lng: 0 },
            dropoff: { address: 'Aéroport', lat: 0, lng: 0 },
          }
        },
        {
          id: '2',
          bookingId: 'def-456',
          amount: 22.00,
          currency: 'eur',
          status: 'pending' as PaymentStatus,
          paymentMethod: 'card' as const,
          booking: {
            id: 'def-456',
            customerName: 'Marie Martin',
            pickup: { address: 'Centre-ville', lat: 0, lng: 0 },
            dropoff: { address: 'Université', lat: 0, lng: 0 },
          }
        },
        {
          id: '3',
          bookingId: 'ghi-789',
          amount: 45.00,
          currency: 'eur',
          status: 'refunded' as PaymentStatus,
          paymentMethod: 'card' as const,
          paidAt: '2026-02-03T14:00:00Z',
          refundedAt: '2026-02-03T16:00:00Z',
          refundAmount: 45.00,
          booking: {
            id: 'ghi-789',
            customerName: 'Pierre Bernard',
            pickup: { address: 'Hôtel Hilton', lat: 0, lng: 0 },
            dropoff: { address: 'Gare TGV', lat: 0, lng: 0 },
          }
        },
      ] as (Payment & { booking: any })[];
    },
    placeholderData: []
  });

  // Stats
  const stats = {
    totalRevenue: payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0,
    pendingAmount: payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0,
    refundedAmount: payments?.filter(p => ['refunded', 'partially_refunded'].includes(p.status)).reduce((sum, p) => sum + (p.refundAmount || p.amount), 0) || 0,
    totalTransactions: payments?.length || 0,
  };

  // Filter
  const filteredPayments = payments?.filter(payment => {
    if (statusFilter && payment.status !== statusFilter) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      payment.booking?.customerName?.toLowerCase().includes(searchLower) ||
      payment.bookingId.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
          <p className="text-gray-500">Suivi des transactions et revenus</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-outline">
            <Download size={18} />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <DollarSign size={24} className="text-emerald-600" />
            </div>
            <div className="flex items-center text-emerald-600">
              <ArrowUpRight size={16} />
              <span className="text-sm font-medium">+12%</span>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.totalRevenue.toFixed(2)} €</p>
          <p className="text-sm text-gray-500">Revenus totaux</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-100 rounded-xl">
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.pendingAmount.toFixed(2)} €</p>
          <p className="text-sm text-gray-500">En attente</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-100 rounded-xl">
              <RefreshCw size={24} className="text-blue-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.refundedAmount.toFixed(2)} €</p>
          <p className="text-sm text-gray-500">Remboursés</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-primary-100 rounded-xl">
              <CreditCard size={24} className="text-primary-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.totalTransactions}</p>
          <p className="text-sm text-gray-500">Transactions</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par client ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
            className="input w-full sm:w-44"
          >
            <option value="">Tous les statuts</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
            <option value="refunded">Remboursé</option>
            <option value="failed">Échoué</option>
          </select>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="input w-full sm:w-40"
            placeholder="Du"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="input w-full sm:w-40"
            placeholder="Au"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Transaction</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Méthode</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Montant</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredPayments && filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => {
                const status = statusConfig[payment.status];
                const StatusIcon = status.icon;
                
                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-mono text-sm text-gray-900">#{payment.bookingId.substring(0, 8)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{payment.booking?.customerName}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {payment.booking?.pickup?.address} → {payment.booking?.dropoff?.address}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <CreditCard size={14} />
                        {payment.paymentMethod === 'card' ? 'Carte' : 
                         payment.paymentMethod === 'cash' ? 'Espèces' : 'Facture'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-semibold text-gray-900">{payment.amount.toFixed(2)} €</p>
                      {payment.refundAmount && (
                        <p className="text-xs text-red-600">-{payment.refundAmount.toFixed(2)} €</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {payment.paidAt 
                        ? format(new Date(payment.paidAt), 'dd/MM/yy HH:mm', { locale: fr })
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-4 text-center">
                      {payment.status === 'paid' && (
                        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                          Rembourser
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Aucune transaction trouvée</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
