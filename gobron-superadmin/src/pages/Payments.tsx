import { useState } from 'react'
import { Check, X, Eye } from 'lucide-react'
import {
  useSubscriptionPayments,
  useApproveSubscriptionPayment,
  useRejectSubscriptionPayment,
  type SubscriptionPayment
} from '../hooks/useSubscriptionPayments'
import { Badge, Spinner, Empty } from '../components/ui'

export default function Payments() {
  const { data: payments, isLoading } = useSubscriptionPayments()
  const approve = useApproveSubscriptionPayment()
  const reject = useRejectSubscriptionPayment()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">To'lovlar</h1>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !payments || payments.length === 0 ? (
        <Empty>To'lovlar topilmadi</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 text-left text-xs text-gray-400">
              <tr>
                <th className="px-4 py-3">Egasi</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Sana</th>
                <th className="px-4 py-3">Holati</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium">{p.owner_name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.owner_phone}</td>
                  <td className="px-4 py-3 font-medium text-pitch-600">{p.amount} so'm</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {p.status === 'pending' && <Badge value="pending" label="Kutilmoqda" />}
                    {p.status === 'approved' && <Badge value="confirmed" label="Tasdiqlandi" />}
                    {p.status === 'rejected' && <Badge value="cancelled" label="Rad etildi" />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        title="Chekni ko'rish"
                        onClick={() => setSelectedImage(p.receipt_image)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-blue-600"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {p.status === 'pending' && (
                        <>
                          <button
                            title="Tasdiqlash"
                            disabled={approve.isPending}
                            onClick={() => confirm("To'lovni tasdiqlaysizmi?") && approve.mutate(p.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-green-50 hover:text-green-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            title="Rad etish"
                            disabled={reject.isPending}
                            onClick={() => confirm("To'lovni rad etasizmi?") && reject.mutate(p.id)}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="Chek" className="object-contain max-h-[85vh] w-full" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
