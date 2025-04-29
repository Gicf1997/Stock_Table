"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js"
import { Scatter } from "react-chartjs-2"

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend)

interface HeatmapChartProps {
  data: any[]
  title?: string
  description?: string
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

export default function HeatmapChart({
  data,
  title = "Mapa de Calor por Rack",
  description = "Distribución de ubicaciones ocupadas por rack",
}: HeatmapChartProps) {
  // Procesar datos para el mapa de calor
  const { heatmapData, locationTypes, maxCount } = useMemo(() => {
    // Agrupar ubicaciones por rack
    const rackGroups: Record<string, Set<string>> = {}
    const rackItems: Record<string, number> = {}
    const rackCoordinates: Record<string, { x: number; y: number; r: number; count: number; items: number }[]> = {}

    // Contar ubicaciones únicas por rack y cantidad de items
    data.forEach((item) => {
      if (!item.LOC) return

      const rackKey = classifyLocation(item.LOC)

      if (!rackGroups[rackKey]) {
        rackGroups[rackKey] = new Set<string>()
        rackItems[rackKey] = 0
        rackCoordinates[rackKey] = []
      }

      rackGroups[rackKey].add(item.LOC)
      rackItems[rackKey] += Number(item.QTY) || 0

      // Intentar extraer coordenadas para visualización
      const parsed = parseLocation(item.LOC)
      if (parsed) {
        const x = Number.parseInt(parsed.horizontal)
        const y = Number.parseInt(parsed.vertical)

        // Buscar si ya existe un punto en estas coordenadas
        let found = false
        for (const point of rackCoordinates[rackKey]) {
          if (point.x === x && point.y === y) {
            point.count++
            point.items += Number(item.QTY) || 0
            point.r = Math.min(25, 5 + point.count * 2) // Ajustar radio basado en la cantidad
            found = true
            break
          }
        }

        if (!found) {
          rackCoordinates[rackKey].push({
            x,
            y,
            r: 5, // Radio inicial
            count: 1,
            items: Number(item.QTY) || 0,
          })
        }
      }
    })

    // Convertir a formato para visualización
    const result = Object.entries(rackGroups).map(([rack, locations]) => ({
      rack,
      count: locations.size,
      items: rackItems[rack],
      coordinates: rackCoordinates[rack] || [],
    }))

    // Ordenar por cantidad de ubicaciones
    const sortedResult = result.sort((a, b) => b.count - a.count)

    // Encontrar el valor máximo para la escala de colores
    const maxCount = Math.max(...result.map((item) => item.count), 1)

    // Agrupar por tipo de ubicación
    const types: Record<string, number> = {
      ALMACÉN: 0,
      EXPEDICIÓN: 0,
      EMPAQUETADO: 0,
      ESPERA: 0,
      OTRO: 0,
    }

    sortedResult.forEach((item) => {
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

    return { heatmapData: sortedResult, locationTypes: types, maxCount }
  }, [data])

  // Preparar datos para Chart.js
  const chartData: ChartData<"scatter"> = useMemo(() => {
    // Tomar solo los 10 racks principales para la visualización
    const topRacks = heatmapData.slice(0, 10)

    return {
      datasets: topRacks.map((rack, index) => {
        // Colores para los diferentes racks
        const colors = [
          "rgba(136, 132, 216, 0.8)",
          "rgba(130, 202, 157, 0.8)",
          "rgba(255, 198, 88, 0.8)",
          "rgba(255, 128, 66, 0.8)",
          "rgba(0, 136, 254, 0.8)",
          "rgba(0, 196, 159, 0.8)",
          "rgba(255, 187, 40, 0.8)",
          "rgba(255, 128, 66, 0.8)",
          "rgba(164, 222, 108, 0.8)",
          "rgba(208, 237, 87, 0.8)",
        ]

        // Si no hay coordenadas específicas, crear puntos simulados
        let points = rack.coordinates

        if (points.length === 0) {
          // Crear puntos simulados para racks sin coordenadas específicas
          points = Array.from({ length: Math.min(rack.count, 20) }, (_, i) => ({
            x: (i % 5) + 1,
            y: Math.floor(i / 5) + 1,
            r: 10,
            count: Math.ceil(rack.count / 20),
            items: Math.ceil(rack.items / 20),
          }))
        }

        return {
          label: `RACK ${rack.rack}`,
          data: points.map((point) => ({
            x: point.x,
            y: point.y,
            r: point.r,
          })),
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace("0.8", "1"),
          borderWidth: 1,
          pointRadius: points.map((p) => p.r),
          pointHoverRadius: points.map((p) => p.r + 2),
        }
      }),
    }
  }, [heatmapData])

  // Opciones para el gráfico
  const chartOptions: ChartOptions<"scatter"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Posición Horizontal",
        },
        min: 0,
        max: 20,
        ticks: {
          stepSize: 1,
        },
      },
      y: {
        title: {
          display: true,
          text: "Posición Vertical",
        },
        min: 0,
        max: 20,
        ticks: {
          stepSize: 1,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const dataIndex = context.dataIndex
            const datasetIndex = context.datasetIndex
            const rack = heatmapData[datasetIndex]
            const point = rack.coordinates[dataIndex] || { count: 0, items: 0 }

            return [
              `RACK: ${rack.rack}`,
              `Posición: (${context.parsed.x}, ${context.parsed.y})`,
              `Ubicaciones: ${point.count}`,
              `Unidades: ${point.items}`,
            ]
          },
        },
      },
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Distribución de Ubicaciones en Almacén",
      },
    },
  }

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
        <div className="h-[500px]">
          <Scatter data={chartData} options={chartOptions} />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Análisis de Racks</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {heatmapData.slice(0, 10).map((item, index) => (
              <div key={item.rack} className="p-3 rounded-md border bg-card">
                <div className="font-medium text-sm">RACK {item.rack}</div>
                <div className="text-lg font-bold">{item.count} ubicaciones</div>
                <div className="text-xs text-muted-foreground">{item.items.toLocaleString()} unidades</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
