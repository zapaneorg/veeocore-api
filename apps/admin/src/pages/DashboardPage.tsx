import { 
  Users, 
  Calendar, 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  Car
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const stats = [
  {
    name: 'Réservations aujourd\'hui',
    value: '24',
    change: '+12%',
    changeType: 'positive',
    icon: Calendar
  },
  {
    name: 'Chauffeurs actifs',
    value: '8',
    change: '+2',
    changeType: 'positive',
    icon: Users
  },
  {
    name: 'Revenus du jour',
    value: '847 €',
    change: '+18%',
    changeType: 'positive',
    icon: DollarSign
  },
  {
    name: 'Courses en cours',
    value: '3',
    change: '-1',
    changeType: 'neutral',
    icon: Car
  }
];

const revenueData = [
  { name: 'Lun', value: 680 },
  { name: 'Mar', value: 790 },
  { name: 'Mer', value: 650 },
  { name: 'Jeu', value: 890 },
  { name: 'Ven', value: 1200 },
  { name: 'Sam', value: 1450 },
  { name: 'Dim', value: 980 },
];

const bookingsData = [
  { name: '06h', value: 2 },
  { name: '08h', value: 8 },
  { name: '10h', value: 5 },
  { name: '12h', value: 7 },
  { name: '14h', value: 4 },
  { name: '16h', value: 6 },
  { name: '18h', value: 12 },
  { name: '20h', value: 9 },
  { name: '22h', value: 4 },
];

const recentBookings = [
  { id: 1, customer: 'Jean Dupont', from: 'Gare Centrale', to: 'Aéroport', status: 'completed', price: 35 },
  { id: 2, customer: 'Marie Martin', from: 'Centre-ville', to: 'Université', status: 'in_progress', price: 12 },
  { id: 3, customer: 'Pierre Bernard', from: 'Hôtel Hilton', to: 'Gare Centrale', status: 'assigned', price: 18 },
  { id: 4, customer: 'Sophie Leroy', from: 'Aéroport', to: 'Centre-ville', status: 'pending', price: 32 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary-50 rounded-lg">
                <stat.icon className="h-6 w-6 text-primary-600" />
              </div>
              <span className={`flex items-center text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {stat.change}
                {stat.changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                ) : stat.changeType === 'negative' ? (
                  <ArrowDownRight className="h-4 w-4 ml-1" />
                ) : null}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenus (7 derniers jours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  fill="#dbeafe" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bookings Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Réservations par heure (aujourd'hui)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Réservations récentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trajet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{booking.customer}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {booking.from} → {booking.to}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {booking.price} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  const labels: Record<string, string> = {
    pending: 'En attente',
    assigned: 'Assignée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
}
