'use client'
import { useEffect, useState } from 'react'

const translations: Record<string, string> = {
  'door code': 'codigo de puerta',
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
  'bathroom': 'bano',
  'bathrooms': 'banos',
  'kitchen': 'cocina',
  'living room': 'sala',
  'dining room': 'comedor',
  'closet': 'armario',
  'laundry': 'lavanderia',
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
  'fragile': 'fragil',
  'clean': 'limpiar',
  'wash': 'lavar',
  'dust': 'desempolvar',
  'scrub': 'fregar',
  'wipe': 'limpiar',
  'under': 'debajo de',
  'behind': 'detras de',
  'inside': 'dentro de',
  'outside': 'afuera',
  'window': 'ventana',
  'windows': 'ventanas',
  'oven': 'horno',
  'fridge': 'refrigerador',
  'refrigerator': 'refrigerador',
  'microwave': 'microondas',
  'dishwasher': 'lavavajillas',
  'sheets': 'sabanas',
  'towels': 'toallas',
  'bed': 'cama',
  'beds': 'camas',
  'change': 'cambiar',
  'no shoes': 'sin zapatos',
  'alarm': 'alarma',
  'code': 'codigo',
  'password': 'contrasena',
  'call': 'llamar',
  'text': 'enviar mensaje',
  'before': 'antes',
  'after': 'despues',
  'morning': 'manana',
  'afternoon': 'tarde',
  'parking': 'estacionamiento',
  'gate': 'puerta/porton',
  'buzzer': 'timbre',
  'ring': 'tocar el timbre',
  'knock': 'tocar la puerta',
  'leave': 'dejar',
  'lock': 'cerrar con llave',
  'unlock': 'abrir',
}

function translateNote(text: string): string {
  let result = text.toLowerCase()
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
