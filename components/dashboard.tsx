"use client"

import type React from "react"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isValid, differenceInDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Clock, Download, FileSpreadsheet } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from "chart.js"
import { Bar, Pie, Doughnut, Line, PolarArea } from "react-chartjs-2"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as XLSX from "xlsx"
import * as htmlToImage from "html-to-image"

// Importar el componente Heatmap
import Heatmap from "@/components/heatmap"

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
)

interface DashboardProps {
  data: any[]
}

// Colores para los gráficos
const COLORS = [
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

// Colores para los bordes
const BORDER_COLORS = [
  "rgba(136, 132, 216, 1)",
  "rgba(130, 202, 157, 1)",
  "rgba(255, 198, 88, 1)",
  "rgba(255, 128, 66, 1)",
  "rgba(0, 136, 254, 1)",
  "rgba(0, 196, 159, 1)",
  "rgba(255, 187, 40, 1)",
  "rgba(255, 128, 66, 1)",
  "rgba(164, 222, 108, 1)",
  "rgba(208, 237, 87, 1)",
]

// Modificar la función getLocationPrefix para que tenga en cuenta la estructura de ubicaciones proporcionada
function getLocationPrefix(location: any): string {
  if (!location) return "DESCONOCIDO"

  const locString = String(location)

  // Ubicaciones especiales
  if (locString.startsWith("M")) {
    return "EXPEDICIÓN"
  } else if (locString.startsWith("PACK") || locString.startsWith("CHECK")) {
    return "EMPAQUETADO"
  } else if (locString.startsWith("STAGE")) {
    return "ESPERA"
  }
  // Ubicaciones con formato estándar C480310
  else if (/^[A-Z][0-9]{2}/.test(locString)) {
    // Extraer el Rack (los dos dígitos después de la letra)
    return locString.substring(0, 3) // Devuelve el bloque + número de rack (ej: C48)
  }

  // Caso por defecto para otros formatos
  return locString.substring(0, 3)
}

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("resumen")

  // Referencias para los gráficos
  const expirationChartRef = useRef<HTMLDivElement>(null)
  const familyChartRef = useRef<HTMLDivElement>(null)
  const agingChartRef = useRef<HTMLDivElement>(null)
  const locationChartRef = useRef<HTMLDivElement>(null)
  const summaryChartsRef = useRef<HTMLDivElement>(null)
  const lotChartRef = useRef<HTMLDivElement>(null)

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("TODOS")
  const [familyFilter, setFamilyFilter] = useState<string>("TODAS")
  const [locationFilter, setLocationFilter] = useState<string>("TODOS")
  const [minAgingFilter, setMinAgingFilter] = useState<string>("")
  const [maxAgingFilter, setMaxAgingFilter] = useState<string>("")
  const [limitItems, setLimitItems] = useState<number>(10)

  // Nuevos filtros
  const [skuFilter, setSkuFilter] = useState<string>("")
  const [agingFilter, setAgingFilter] = useState<string>("TODOS")

  // Obtener valores únicos para filtros
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    data.forEach((item) => {
      if (item.STATUS) statuses.add(item.STATUS)
    })
    return Array.from(statuses)
  }, [data])

  const uniqueFamilies = useMemo(() => {
    const families = new Set<string>()
    data.forEach((item) => {
      if (item.LOTTABLE07) families.add(item.LOTTABLE07)
    })
    return Array.from(families)
  }, [data])

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>()
    data.forEach((item) => {
      if (item.LOC) {
        const prefix = getLocationPrefix(item.LOC)
        locations.add(prefix)
      }
    })
    return Array.from(locations)
  }, [data])

  // Aplicar filtros a los datos
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Filtro por SKU
      if (skuFilter && !String(item.SKU).includes(skuFilter)) {
        return false
      }

      // Filtro por familia
      if (familyFilter !== "TODAS" && item.LOTTABLE07 !== familyFilter) {
        return false
      }

      // Filtro por aging
      if (agingFilter !== "TODOS") {
        const agingDays = Number(item.AGING_DIAS) || 0

        switch (agingFilter) {
          case "< 7 días":
            if (agingDays >= 7) return false
            break
          case "7-30 días":
            if (agingDays < 7 || agingDays >= 30) return false
            break
          case "30-60 días":
            if (agingDays < 30 || agingDays >= 60) return false
            break
          case "60-90 días":
            if (agingDays < 60 || agingDays >= 90) return false
            break
          case "> 90 días":
            if (agingDays < 90) return false
            break
        }
      }

      return true
    })
  }, [data, skuFilter, familyFilter, agingFilter])

  // Datos para el resumen
  const summaryData = useMemo(() => {
    const totalItems = filteredData.length
    const totalQuantity = filteredData.reduce((sum, item) => sum + (Number(item.QTY) || 0), 0)
    const totalWeight = filteredData.reduce((sum, item) => sum + (Number(item.NETWGT) || 0), 0)

    // Contar por estado
    const statusCount = filteredData.reduce((acc: Record<string, number>, item) => {
      const status = item.STATUS || "DESCONOCIDO"
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {})

    return {
      totalItems,
      totalQuantity,
      totalWeight,
      statusCount,
    }
  }, [filteredData])

  // Datos para el gráfico de vencimientos
  const expirationData = useMemo(() => {
    const today = new Date()

    // Agrupar por períodos de vencimiento
    const expirationGroups: Record<string, number> = {
      Vencido: 0,
      "< 30 días": 0,
      "30-90 días": 0,
      "90-180 días": 0,
      "180-365 días": 0,
      "> 365 días": 0,
    }

    filteredData.forEach((item) => {
      if (!item.LOTTABLE05) return

      try {
        const expirationDate = new Date(item.LOTTABLE05)
        if (!isValid(expirationDate)) return

        const daysToExpiration = differenceInDays(expirationDate, today)
        const quantity = Number(item.QTY) || 0

        if (daysToExpiration < 0) {
          expirationGroups["Vencido"] += quantity
        } else if (daysToExpiration < 30) {
          expirationGroups["< 30 días"] += quantity
        } else if (daysToExpiration < 90) {
          expirationGroups["30-90 días"] += quantity
        } else if (daysToExpiration < 180) {
          expirationGroups["90-180 días"] += quantity
        } else if (daysToExpiration < 365) {
          expirationGroups["180-365 días"] += quantity
        } else {
          expirationGroups["> 365 días"] += quantity
        }
      } catch (e) {
        // Ignorar fechas inválidas
      }
    })

    // Convertir a formato para Chart.js
    const labels = Object.keys(expirationGroups)
    const values = Object.values(expirationGroups)

    return {
      labels,
      values,
      raw: Object.entries(expirationGroups).map(([name, value]) => ({ name, value })),
    }
  }, [filteredData])

  // Datos para el gráfico de distribución por familia
  const familyDistribution = useMemo(() => {
    // Agrupar por familia (LOTTABLE07)
    const familyGroups: Record<string, number> = {}

    filteredData.forEach((item) => {
      const family = item.LOTTABLE07 || "SIN CLASIFICAR"
      const quantity = Number(item.QTY) || 0

      familyGroups[family] = (familyGroups[family] || 0) + quantity
    })

    // Ordenar y limitar para mejor visualización
    const sortedEntries = Object.entries(familyGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitItems)

    const labels = sortedEntries.map(([name]) => name)
    const values = sortedEntries.map(([, value]) => value)

    return {
      labels,
      values,
      raw: sortedEntries.map(([name, value]) => ({ name, value })),
    }
  }, [filteredData, limitItems])

  // Datos para el gráfico de aging
  const agingData = useMemo(() => {
    // Agrupar por días de aging
    const agingGroups: Record<string, number> = {
      "< 7 días": 0,
      "7-30 días": 0,
      "30-60 días": 0,
      "60-90 días": 0,
      "> 90 días": 0,
    }

    filteredData.forEach((item) => {
      const agingDays = Number(item.AGING_DIAS) || 0
      const quantity = Number(item.QTY) || 0

      if (agingDays < 7) {
        agingGroups["< 7 días"] += quantity
      } else if (agingDays < 30) {
        agingGroups["7-30 días"] += quantity
      } else if (agingDays < 60) {
        agingGroups["30-60 días"] += quantity
      } else if (agingDays < 90) {
        agingGroups["60-90 días"] += quantity
      } else {
        agingGroups["> 90 días"] += quantity
      }
    })

    // Convertir a formato para Chart.js
    const labels = Object.keys(agingGroups)
    const values = Object.values(agingGroups)

    return {
      labels,
      values,
      raw: Object.entries(agingGroups).map(([name, value]) => ({ name, value })),
    }
  }, [filteredData])

  // Datos para el gráfico de ubicaciones (modificado para contar ubicaciones en lugar de unidades)
  const locationData = useMemo(() => {
    // Agrupar por ubicación
    const locationGroups: Record<string, Set<string>> = {}
    const skuLocationCount: Record<string, number> = {}
    const totalLocations = new Set<string>()

    // Contar ubicaciones únicas por prefijo y por SKU
    filteredData.forEach((item) => {
      if (!item.LOC) return

      // Obtener el prefijo según las nuevas reglas
      const locationPrefix = getLocationPrefix(item.LOC)
      const sku = String(item.SKU || "DESCONOCIDO")

      // Inicializar conjuntos si no existen
      if (!locationGroups[locationPrefix]) {
        locationGroups[locationPrefix] = new Set<string>()
      }

      // Añadir la ubicación al conjunto del prefijo
      locationGroups[locationPrefix].add(item.LOC)

      // Añadir la ubicación al conjunto total
      totalLocations.add(item.LOC)

      // Contar ubicaciones por SKU
      if (!skuLocationCount[sku]) {
        skuLocationCount[sku] = 0
      }
      skuLocationCount[sku]++
    })

    // Ordenar y limitar para mejor visualización
    const sortedEntries = Object.entries(locationGroups)
      .map(([prefix, locations]) => [prefix, locations.size])
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, limitItems)

    const labels = sortedEntries.map(([name]) => name as string)
    const values = sortedEntries.map(([, value]) => value as number)

    // Encontrar el SKU con mayor porcentaje de ocupación
    const totalLocationCount = totalLocations.size
    let maxOccupancySku = ""
    let maxOccupancyPercentage = 0

    Object.entries(skuLocationCount).forEach(([sku, count]) => {
      const percentage = (count / totalLocationCount) * 100
      if (percentage > maxOccupancyPercentage) {
        maxOccupancyPercentage = percentage
        maxOccupancySku = sku
      }
    })

    return {
      labels,
      values,
      raw: sortedEntries.map(([name, value]) => ({ name, value })),
      totalLocations: totalLocations.size,
      maxOccupancySku,
      maxOccupancyPercentage: Math.round(maxOccupancyPercentage * 100) / 100,
    }
  }, [filteredData, limitItems])

  // Datos para el gráfico de LOTTABLE02 (nuevo)
  const lotData = useMemo(() => {
    // Agrupar por lote (LOTTABLE02)
    const lotGroups: Record<string, number> = {}

    filteredData.forEach((item) => {
      const lot = item.LOTTABLE02 || "SIN LOTE"
      const quantity = Number(item.QTY) || 0

      lotGroups[lot] = (lotGroups[lot] || 0) + quantity
    })

    // Ordenar y limitar para mejor visualización
    const sortedEntries = Object.entries(lotGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitItems)

    const labels = sortedEntries.map(([name]) => name)
    const values = sortedEntries.map(([, value]) => value)

    return {
      labels,
      values,
      raw: sortedEntries.map(([name, value]) => ({ name, value })),
    }
  }, [filteredData, limitItems])

  // Datos para el gráfico de tendencia de aging (simulado)
  const agingTrendData = useMemo(() => {
    // Crear datos simulados para mostrar una tendencia
    const today = new Date()
    const labels = []
    const values = []

    // Generar fechas para los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      labels.push(format(date, "dd/MM", { locale: es }))
    }

    // Calcular el promedio de aging por día (simulado)
    const avgAging =
      filteredData.reduce((sum, item) => sum + (Number(item.AGING_DIAS) || 0), 0) / (filteredData.length || 1)

    // Generar valores simulados alrededor del promedio
    for (let i = 0; i < 7; i++) {
      const randomFactor = 0.8 + Math.random() * 0.4 // Factor entre 0.8 y 1.2
      values.push(Math.round(avgAging * randomFactor * 10) / 10)
    }

    return { labels, values }
  }, [filteredData])

  // Opciones comunes para los gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ${context.raw.toLocaleString()}`,
        },
      },
    },
  }

  // Función para exportar datos a Excel
  const exportToExcel = () => {
    // Crear una hoja de cálculo con los datos filtrados
    const worksheet = XLSX.utils.json_to_sheet(filteredData)

    // Crear un libro de trabajo y añadir la hoja
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

    // Guardar el archivo
    XLSX.writeFile(workbook, "datos_inventario.xlsx")
  }

  // Función para exportar gráficos a Excel
  const exportChartsToExcel = async () => {
    try {
      // Crear un libro de trabajo
      const workbook = XLSX.utils.book_new()

      // Añadir hoja con datos filtrados
      const worksheet = XLSX.utils.json_to_sheet(filteredData)
      XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

      // Crear hojas para cada gráfico
      const chartRefs = [
        { ref: summaryChartsRef, name: "Resumen" },
        { ref: expirationChartRef, name: "Vencimientos" },
        { ref: familyChartRef, name: "Familias" },
        { ref: agingChartRef, name: "Aging" },
        { ref: locationChartRef, name: "Ubicaciones" },
        { ref: lotChartRef, name: "Lotes" },
      ]

      // Crear una hoja para los gráficos
      const chartsWorksheet = XLSX.utils.aoa_to_sheet([
        ["Gráficos del Dashboard"],
        ["Generado el " + new Date().toLocaleString()],
      ])

      // Configurar ancho de columnas
      const colWidths = [{ wch: 100 }] // Ancho para la columna A
      chartsWorksheet["!cols"] = colWidths

      // Añadir la hoja al libro
      XLSX.utils.book_append_sheet(workbook, chartsWorksheet, "Gráficos")

      // Guardar el archivo
      XLSX.writeFile(workbook, "dashboard_inventario.xlsx")

      // Notificar al usuario que debe exportar las imágenes por separado
      alert(
        "Los datos se han exportado a Excel. Para incluir gráficos, utilice el botón 'Exportar Gráfico' en cada sección.",
      )
    } catch (error) {
      console.error("Error al exportar a Excel:", error)
      alert("Ocurrió un error al exportar a Excel. Por favor, inténtelo de nuevo.")
    }
  }

  // Función para exportar un gráfico específico como imagen
  const exportChartAsImage = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return

    try {
      const dataUrl = await htmlToImage.toPng(ref.current, { quality: 1.0 })

      // Crear un enlace para descargar la imagen
      const link = document.createElement("a")
      link.download = `${filename}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Error al exportar el gráfico:", error)
      alert("Ocurrió un error al exportar el gráfico. Por favor, inténtelo de nuevo.")
    }
  }

  // Modificar la función FilterControls para corregir el bug del filtro de SKU
  const FilterControls = () => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Filtros</CardTitle>
        <CardDescription>Personaliza la visualización de los datos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku-filter">SKU</Label>
            <Input
              id="sku-filter"
              placeholder="Filtrar por SKU"
              value={skuFilter}
              onChange={(e) => setSkuFilter(e.target.value)}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="family-filter">Familia</Label>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger id="family-filter">
                <SelectValue placeholder="Seleccionar familia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las familias</SelectItem>
                {uniqueFamilies.map((family) => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aging-filter">Aging</Label>
            <Select value={agingFilter} onValueChange={setAgingFilter}>
              <SelectTrigger id="aging-filter">
                <SelectValue placeholder="Seleccionar rango de aging" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los rangos</SelectItem>
                <SelectItem value="< 7 días">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#b3b1e6]"></div>
                    <span>{"< 7 días"}</span>
                  </div>
                </SelectItem>
                <SelectItem value="7-30 días">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#82ca9d]"></div>
                    <span>7-30 días</span>
                  </div>
                </SelectItem>
                <SelectItem value="30-60 días">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ffc658]"></div>
                    <span>30-60 días</span>
                  </div>
                </SelectItem>
                <SelectItem value="60-90 días">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff8042]"></div>
                    <span>60-90 días</span>
                  </div>
                </SelectItem>
                <SelectItem value="> 90 días">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#0088fe]"></div>
                    <span>{"> 90 días"}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setSkuFilter("")
              setFamilyFilter("TODAS")
              setAgingFilter("TODOS")
            }}
          >
            Limpiar filtros
          </Button>

          <Button variant="outline" onClick={exportToExcel} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar a Excel</span>
          </Button>

          <Button variant="outline" onClick={exportChartsToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Exportar Dashboard</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Componente para botón de exportar gráfico
  const ExportChartButton = ({
    chartRef,
    filename,
  }: { chartRef: React.RefObject<HTMLDivElement>; filename: string }) => (
    <Button
      variant="outline"
      size="sm"
      className="absolute top-4 right-4 z-10"
      onClick={() => exportChartAsImage(chartRef, filename)}
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar Gráfico
    </Button>
  )

  return (
    <div className="space-y-4">
      <FilterControls />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
          <TabsTrigger value="familias">Familias</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
          <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Inventario Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summaryData.totalQuantity.toLocaleString()}</div>
                <p className="text-muted-foreground">{summaryData.totalItems.toLocaleString()} registros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Peso Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summaryData.totalWeight.toFixed(2)} kg</div>
                <p className="text-muted-foreground">Peso neto del inventario</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {Object.entries(summaryData.statusCount).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === "OK" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : status === "HOLD" ? (
                          <Clock className="h-4 w-4 text-amber-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-500" />
                        )}
                        <span>{status}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={summaryChartsRef}>
            <Card className="col-span-1 relative">
              <ExportChartButton chartRef={summaryChartsRef} filename="resumen_dashboard" />
              <CardHeader>
                <CardTitle>Distribución por Familia</CardTitle>
                <CardDescription>Cantidad por tipo de producto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Doughnut
                    data={{
                      labels: familyDistribution.labels,
                      datasets: [
                        {
                          data: familyDistribution.values,
                          backgroundColor: COLORS,
                          borderColor: BORDER_COLORS,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Vencimientos</CardTitle>
                <CardDescription>Distribución por fecha de vencimiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar
                    data={{
                      labels: expirationData.labels,
                      datasets: [
                        {
                          label: "Cantidad",
                          data: expirationData.values,
                          backgroundColor: COLORS,
                          borderColor: BORDER_COLORS,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={chartOptions}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="vencimientos">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Vencimientos</CardTitle>
              <CardDescription>Distribución del inventario por fecha de vencimiento (LOTTABLE05)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ExportChartButton chartRef={expirationChartRef} filename="analisis_vencimientos" />
                <div className="h-[400px]" ref={expirationChartRef}>
                  <Bar
                    data={{
                      labels: expirationData.labels,
                      datasets: [
                        {
                          label: "Cantidad",
                          data: expirationData.values,
                          backgroundColor: expirationData.labels.map((label, index) =>
                            label === "Vencido" ? "rgba(239, 68, 68, 0.8)" : COLORS[index % COLORS.length],
                          ),
                          borderColor: expirationData.labels.map((label, index) =>
                            label === "Vencido" ? "rgba(239, 68, 68, 1)" : BORDER_COLORS[index % BORDER_COLORS.length],
                          ),
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: "Cantidad",
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Período de vencimiento",
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Análisis de Vencimientos</h3>
                  <ul className="space-y-2">
                    {expirationData.raw.map((item, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: item.name === "Vencido" ? "#ef4444" : COLORS[index % COLORS.length],
                            }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Recomendaciones</h3>
                  <ul className="space-y-2 text-sm">
                    {expirationData.raw[0].value > 0 && (
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <span>
                          Hay {expirationData.raw[0].value.toLocaleString()} unidades vencidas que requieren atención
                          inmediata.
                        </span>
                      </li>
                    )}
                    {expirationData.raw[1].value > 0 && (
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <span>
                          Hay {expirationData.raw[1].value.toLocaleString()} unidades que vencerán en menos de 30 días.
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Priorizar la venta de productos con fecha de vencimiento más cercana.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="familias">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Familia</CardTitle>
              <CardDescription>Análisis del inventario por familia de productos (LOTTABLE07)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <ExportChartButton chartRef={familyChartRef} filename="distribucion_familias" />
                  <div className="h-[400px]" ref={familyChartRef}>
                    <Pie
                      data={{
                        labels: familyDistribution.labels,
                        datasets: [
                          {
                            data: familyDistribution.values,
                            backgroundColor: COLORS,
                            borderColor: BORDER_COLORS,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            position: "right",
                            align: "center",
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Detalle por Familia</h3>
                  <div className="space-y-4">
                    {familyDistribution.raw.map((item, index) => (
                      <div key={index} className="flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <span>{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(item.value / Math.max(...familyDistribution.values)) * 100}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="aging">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Aging</CardTitle>
                <CardDescription>Distribución del inventario por tiempo de permanencia (AGING_DIAS)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <ExportChartButton chartRef={agingChartRef} filename="analisis_aging" />
                  <div className="h-[400px]" ref={agingChartRef}>
                    <PolarArea
                      data={{
                        labels: agingData.labels,
                        datasets: [
                          {
                            data: agingData.values,
                            backgroundColor: COLORS.map((color) => color.replace("0.8", "0.7")),
                            borderColor: BORDER_COLORS,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Aging</CardTitle>
                <CardDescription>Evolución del tiempo promedio de permanencia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <Line
                    data={{
                      labels: agingTrendData.labels,
                      datasets: [
                        {
                          label: "Días promedio",
                          data: agingTrendData.values,
                          borderColor: "rgba(75, 192, 192, 1)",
                          backgroundColor: "rgba(75, 192, 192, 0.2)",
                          tension: 0.4,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: "Días promedio",
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Fecha",
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Análisis de Rotación</CardTitle>
              <CardDescription>Detalle del inventario por tiempo de permanencia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {agingData.raw.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-sm">
                      {agingData.raw[0].value > 0 &&
                        `${agingData.raw[0].value.toLocaleString()} unidades tienen menos de 7 días en almacén, indicando buena rotación reciente.`}
                    </span>
                  </div>

                  {agingData.raw[4].value > 0 && (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                      <span className="text-sm">
                        {`${agingData.raw[4].value.toLocaleString()} unidades tienen más de 90 días en almacén. Considerar estrategias para mejorar su rotación.`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">
                      Monitorear la tendencia de aging para identificar productos de baja rotación.
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        // Modificar la pestaña de ubicaciones para incluir el mapa de calor
        <TabsContent value="ubicaciones">
          <div className="space-y-4">
            <Heatmap data={filteredData} />

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Ubicación</CardTitle>
                <CardDescription>Análisis de ubicaciones ocupadas en el almacén (LOC)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <ExportChartButton chartRef={locationChartRef} filename="distribucion_ubicaciones" />
                  <div className="h-[400px]" ref={locationChartRef}>
                    <Bar
                      data={{
                        labels: locationData.labels.map((label) => `RACK ${label}`),
                        datasets: [
                          {
                            label: "Ubicaciones ocupadas",
                            data: locationData.values,
                            backgroundColor: COLORS,
                            borderColor: BORDER_COLORS,
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        ...chartOptions,
                        indexAxis: "y" as const,
                        scales: {
                          x: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Cantidad de ubicaciones",
                            },
                          },
                          y: {
                            title: {
                              display: true,
                              text: "Ubicación",
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Análisis de Ubicaciones</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Este gráfico muestra la distribución de ubicaciones ocupadas en el almacén. Las ubicaciones están
                    agrupadas según el prefijo del código de ubicación.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {locationData.raw.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span>RACK {item.name}</span>
                          </div>
                          <span className="font-medium">{item.value.toLocaleString()} ubicaciones</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <span className="text-sm">
                          El RACK {locationData.raw[0]?.name} contiene la mayor cantidad de ubicaciones ocupadas con{" "}
                          {locationData.raw[0]?.value.toLocaleString()} ubicaciones.
                        </span>
                      </div>

                      <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-700 dark:text-blue-300">SKU con mayor ocupación:</p>
                          <p>
                            El SKU <span className="font-bold">{locationData.maxOccupancySku}</span> ocupa el{" "}
                            <span className="font-bold">{locationData.maxOccupancyPercentage}%</span> de todas las
                            ubicaciones ({locationData.totalLocations} ubicaciones totales).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span className="text-sm">
                          Considerar optimizar la distribución del inventario para mejorar la eficiencia de picking.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="lotes">
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Lote</CardTitle>
              <CardDescription>Distribución del inventario por lote (LOTTABLE02)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ExportChartButton chartRef={lotChartRef} filename="analisis_lotes" />
                <div className="h-[400px]" ref={lotChartRef}>
                  <Bar
                    data={{
                      labels: lotData.labels,
                      datasets: [
                        {
                          label: "Cantidad",
                          data: lotData.values,
                          backgroundColor: COLORS,
                          borderColor: BORDER_COLORS,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: "Cantidad",
                          },
                        },
                        x: {
                          title: {
                            display: true,
                            text: "Lote",
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Detalle por Lote</h3>
                  <div className="max-h-[300px] overflow-y-auto pr-2">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left py-2">Lote</th>
                          <th className="text-right py-2">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotData.raw.map((item, index) => (
                          <tr key={index} className="border-b border-muted">
                            <td className="py-2">{item.name}</td>
                            <td className="text-right py-2">{item.value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Análisis de Lotes</h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-700 dark:text-green-300">Lote principal:</p>
                          <p>
                            El lote <span className="font-bold">{lotData.raw[0]?.name}</span> representa{" "}
                            <span className="font-bold">
                              {lotData.raw[0]?.value
                                ? ((lotData.raw[0].value / summaryData.totalQuantity) * 100).toFixed(2)
                                : 0}
                              %
                            </span>{" "}
                            del inventario total.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-700 dark:text-amber-300">Diversidad de lotes:</p>
                          <p>
                            Hay un total de{" "}
                            <span className="font-bold">
                              {Object.keys(
                                filteredData.reduce((acc: Record<string, boolean>, item) => {
                                  if (item.LOTTABLE02) acc[item.LOTTABLE02] = true
                                  return acc
                                }, {}),
                              ).length.toLocaleString()}
                            </span>{" "}
                            lotes diferentes en el inventario.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span className="text-sm">
                        Monitorear la distribución por lotes para identificar patrones de producción y consumo.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
