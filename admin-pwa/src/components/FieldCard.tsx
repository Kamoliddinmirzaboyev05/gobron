import type { Field } from '../types'

function formatSum(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm"
}

export default function FieldCard({ field, onEdit }: { field: Field; onEdit: () => void }) {
  return (
    <div className="card overflow-hidden" onClick={onEdit}>
      {field.images.length > 0 && (
        <img
          src={field.images[0]}
          alt={field.name}
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{field.name}</h3>
            {field.size && (
              <p className="text-sm text-gray-500 mt-0.5">{field.size}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`chip ${
                field.surfaceType === 'covered'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {field.surfaceType === 'covered' ? 'Yopiq' : 'Ochiq'}
            </span>
            {!field.isActive && (
              <span className="chip bg-red-100 text-red-600">O'chirilgan</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <p className="text-primary font-bold">{formatSum(field.pricePerHour)}/soat</p>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="text-gray-400 hover:text-primary transition-colors p-1"
          >
            <EditIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
