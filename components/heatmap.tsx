"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface HeatmapProps {
  data: any[]
  title?: string
  description?: string
}

// Función para obtener el color basado en el valor
function getHeatColor(value: number, max: number): string {
  // Escala de colores de frío a caliente
  const ratio = value / max

  if (ratio < 0.2) return "bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-900"
  if (ratio < 0.4) return "bg-green-100 dark:bg-green-950 border-green-200 dark:border-green-900"
  if (ratio < 0.6) return "bg-yellow-100 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900"
  if (ratio < 0.8) return "bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-900"
  return "bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-900"
}

// Función para obtener el color de texto basado en el valor
function getTextColor(value: number, max: number): string {
  const ratio = value / max

  if (ratio < 0.2) return "text-blue-700 dark:text-blue-300"
  if (ratio < 0.4) return "text-green-700 dark:text-green-300"
  if (ratio < 0.6) return "text-yellow-700 dark:text-yellow-300"
  if (ratio < 0.8) return "text-orange-700 dark:text-orange-300"
  return "text-red-700 dark:text-red-300"
}

// Función para extraer información de ubicación
function parseLocation(location: string): { block: string; rack: string; horizontal: string; vertical: string } | null {
  // Para ubicaciones con formato estándar C480310
  const match = location.match(/^([A-Z])(\d{2})(\d{2})(\d{2})$/)

  if (match) {
    return {
      block: match[1],
      rack: match[2],
      horizontal: match[3],
      vertical: match[4],
    }
  }

  return null
}

// Función para clasificar ubicaciones
function classifyLocation(location: string): string {
  if (!location) return "DESCONOCIDO"

  if (location.startsWith("M")) return "EXPEDICIÓN"
  if (location.startsWith("PACK") || location.startsWith("CHECK")) return "EMPAQUETADO"
  if (location.startsWith("STAGE")) return "ESPERA"

  const parsed = parseLocation(location)
  if (parsed) {
    return `${parsed.block}${parsed.rack}`
  }

  return "OTRO"
}

export default function Heatmap({
  data,
  title = "Mapa de Calor por Rack",
  description = "Distribución de ubicaciones ocupadas por rack",
}: HeatmapProps) {
  // Procesar datos para el mapa de calor
  const heatmapData = useMemo(() => {
    // Agrupar ubicaciones por rack
    const rackGroups: Record<string, Set<string>> = {}
    const rackItems: Record<string, number> = {}

    // Contar ubicaciones únicas por rack y cantidad de items
    data.forEach((item) => {
      if (!item.LOC) return

      const rackKey = classifyLocation(item.LOC)

      if (!rackGroups[rackKey]) {
        rackGroups[rackKey] = new Set<string>()
        rackItems[rackKey] = 0
      }

      rackGroups[rackKey].add(item.LOC)
      rackItems[rackKey] += Number(item.QTY) || 0
    })

    // Convertir a formato para visualización
    const result = Object.entries(rackGroups).map(([rack, locations]) => ({
      rack,
      count: locations.size,
      items: rackItems[rack],
    }))

    // Ordenar por cantidad de ubicaciones
    return result.sort((a, b) => b.count - a.count)
  }, [data])

  // Encontrar el valor máximo para la escala de colores
  const maxCount = useMemo(() => {
    return Math.max(...heatmapData.map((item) => item.count), 1)
  }, [heatmapData])

  // Agrupar por tipo de ubicación
  const locationTypes = useMemo(() => {
    const types: Record<string, number> = {
      ALMACÉN: 0,
      EXPEDICIÓN: 0,
      EMPAQUETADO: 0,
      ESPERA: 0,
      OTRO: 0,
    }

    heatmapData.forEach((item) => {
      if (item.rack.startsWith("EXPEDICIÓN")) {
        types["EXPEDICIÓN"] += item.count
      } else if (item.rack.startsWith("EMPAQUETADO")) {
        types["EMPAQUETADO"] += item.count
      } else if (item.rack.startsWith("ESPERA")) {
        types["ESPERA"] += item.count
      } else if (/^[A-Z]\d{2}$/.test(item.rack)) {
        types["ALMACÉN"] += item.count
      } else {
        types["OTRO"] += item.count
      }
    })

    return types
  }, [heatmapData])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>

        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(locationTypes).map(
            ([type, count]) =>
              count > 0 && (
                <Badge key={type} variant="outline">
                  {type}: {count} ubicaciones
                </Badge>
              ),
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <TooltipProvider>
            {heatmapData.map((item) => (
              <Tooltip key={item.rack}>
                <TooltipTrigger asChild>
                  <div className={`p-3 rounded-md border ${getHeatColor(item.count, maxCount)} cursor-help`}>
                    <div className="font-medium text-sm">{item.rack}</div>
                    <div className={`text-lg font-bold ${getTextColor(item.count, maxCount)}`}>{item.count}</div>
                    <div className="text-xs text-muted-foreground">{item.items.toLocaleString()} unidades</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm">
                    <div className="font-bold">{item.rack}</div>
                    <div>{item.count} ubicaciones ocupadas</div>
                    <div>{item.items.toLocaleString()} unidades en inventario</div>
                    <div>{(item.items / item.count).toFixed(1)} unidades/ubicación</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">Baja ocupación</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Media-baja</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs">Media</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs">Media-alta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">Alta ocupación</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
