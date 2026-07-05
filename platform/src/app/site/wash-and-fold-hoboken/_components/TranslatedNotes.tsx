'use client'
import { useEffect, useState } from 'react'

// Simple translations for common cleaning notes phrases
const translations: Record<string, string> = {
  // Common words/phrases
  'door code': 'código de puerta',
  'doorman': 'portero',
  'key': 'llave',
  'keys': 'llaves',
  'lockbox': 'caja de llaves',
  'lock box': 'caja de llaves',
  'front door': 'puerta principal',
  'back door': 'puerta trasera',
  'elevator': 'ascensor',
  'stairs': 'escaleras',
  'floor': 'piso',
  'apartment': 'apartamento',
  'apt': 'apto',
  'unit': 'unidad',
  'bedroom': 'dormitorio',
  'bedrooms': 'dormitorios',
  'bathroom': 'baño',
  'bathrooms': 'baños',
  'kitchen': 'cocina',
  'living room': 'sala',
  'dining room': 'comedor',
  'closet': 'armario',
  'laundry': 'lavandería',
  'supplies': 'suministros',
  'vacuum': 'aspiradora',
  'mop': 'trapeador',
  'broom': 'escoba',
  'trash': 'basura',
  'garbage': 'basura',
  'recycling': 'reciclaje',
  'pet': 'mascota',
  'pets': 'mascotas',
  'dog': 'perro',
  'dogs': 'perros',
  'cat': 'gato',
  'cats': 'gatos',
  'please': 'por favor',
  'do not': 'no',
  "don't": 'no',
  'careful': 'cuidado',
  'fragile': 'frágil',
  'clean': 'limpiar',
  'wash': 'lavar',
  'dust': 'desempolvar',
  'scrub': 'fregar',
  'wipe': 'limpiar',
  'under': 'debajo de',
  'behind': 'detrás de',
  'inside': 'dentro de',
  'outside': 'afuera',
  'window': 'ventana',
  'windows': 'ventanas',
  'oven': 'horno',
  'fridge': 'refrigerador',
  'refrigerator': 'refrigerador',
  'microwave': 'microondas',
  'dishwasher': 'lavavajillas',
  'sheets': 'sábanas',
  'towels': 'toallas',
  'bed': 'cama',
  'beds': 'camas',
  'change': 'cambiar',
  'no shoes': 'sin zapatos',
  'alarm': 'alarma',
  'code': 'código',
  'password': 'contraseña',
  'call': 'llamar',
  'text': 'enviar mensaje',
  'before': 'antes',
  'after': 'después',
  'morning': 'mañana',
  'afternoon': 'tarde',
  'parking': 'estacionamiento',
  'gate': 'puerta/portón',
  'buzzer': 'timbre',
  'ring': 'tocar el timbre',
  'knock': 'tocar la puerta',
  'leave': 'dejar',
  'lock': 'cerrar con llave',
  'unlock': 'abrir',
}

function translateNote(text: string): string {
  let result = text.toLowerCase()
  // Sort by length (longest first) to replace longer phrases before shorter ones
  const sorted = Object.entries(translations).sort((a, b) => b[0].length - a[0].length)
  for (const [en, es] of sorted) {
    result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), es)
  }
  return result
}

export default function TranslatedNotes({ text, label }: { text: string; label: string }) {
  const [translation, setTranslation] = useState('')

  useEffect(() => {
    setTranslation(translateNote(text))
  }, [text])

  return (
    <div>
      <p className="text-sm font-semibold mb-1 text-black">{label}</p>
      <p className="text-base text-black">{text}</p>
      {translation && translation !== text.toLowerCase() && (
        <p className="text-sm text-gray-500 mt-1 italic">ES: {translation}</p>
      )}
    </div>
  )
}
