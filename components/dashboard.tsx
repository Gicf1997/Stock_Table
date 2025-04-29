"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { isValid, differenceInDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"
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

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("resumen")

  // Datos para el resumen
  const summaryData = useMemo(() => {
    const totalItems = data.length
    const totalQuantity = data.reduce((sum, item) => sum + (Number(item.QTY) || 0), 0)
    const totalWeight = data.reduce((sum, item) => sum + (Number(item.NETWGT) || 0), 0)

    // Contar por estado
    const statusCount = data.reduce((acc: Record<string, number>, item) => {
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
  }, [data])

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

    data.forEach((item) => {
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
  }, [data])

  // Datos para el gráfico de distribución por familia
  const familyDistribution = useMemo(() => {
    // Agrupar por familia (LOTTABLE08)
    const familyGroups: Record<string, number> = {}

    data.forEach((item) => {
      const family = item.LOTTABLE08 || "SIN CLASIFICAR"
      const quantity = Number(item.QTY) || 0

      familyGroups[family] = (familyGroups[family] || 0) + quantity
    })

    // Ordenar y limitar a 10 para mejor visualización
    const sortedEntries = Object.entries(familyGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const labels = sortedEntries.map(([name]) => name)
    const values = sortedEntries.map(([, value]) => value)

    return {
      labels,
      values,
      raw: sortedEntries.map(([name, value]) => ({ name, value })),
    }
  }, [data])

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

    data.forEach((item) => {
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
  }, [data])

  // Datos para el gráfico de ubicaciones
  const locationData = useMemo(() => {
    // Agrupar por ubicación
    const locationGroups: Record<string, number> = {}

    data.forEach((item) => {
      if (!item.LOC) return

      // Tomar solo los primeros caracteres para agrupar por zona
      const locationPrefix = item.LOC.substring(0, 3)
      const quantity = Number(item.QTY) || 0

      locationGroups[locationPrefix] = (locationGroups[locationPrefix] || 0) + quantity
    })

    // Ordenar y limitar a 10 para mejor visualización
    const sortedEntries = Object.entries(locationGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const labels = sortedEntries.map(([name]) => name)
    const values = sortedEntries.map(([, value]) => value)

    return {
      labels,
      values,
      raw: sortedEntries.map(([name, value]) => ({ name, value })),
    }
  }, [data])

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
    const avgAging = data.reduce((sum, item) => sum + (Number(item.AGING_DIAS) || 0), 0) / (data.length || 1)

    // Generar valores simulados alrededor del promedio
    for (let i = 0; i < 7; i++) {
      const randomFactor = 0.8 + Math.random() * 0.4 // Factor entre 0.8 y 1.2
      values.push(Math.round(avgAging * randomFactor * 10) / 10)
    }

    return { labels, values }
  }, [data])

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

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="vencimientos">Vencimientos</TabsTrigger>
          <TabsTrigger value="familias">Familias</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
          <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="col-span-1">
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
              <div className="h-[400px]">
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
              <CardDescription>Análisis del inventario por familia de productos (LOTTABLE08)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[400px]">
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
                <div className="h-[400px]">
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

        <TabsContent value="ubicaciones">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Ubicación</CardTitle>
              <CardDescription>Análisis del inventario por ubicación en el almacén (LOC)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <Bar
                  data={{
                    labels: locationData.labels.map((label) => `Zona ${label}`),
                    datasets: [
                      {
                        label: "Cantidad",
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
                          text: "Cantidad",
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

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Análisis de Ubicaciones</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Este gráfico muestra la distribución del inventario por ubicación en el almacén. Las ubicaciones están
                  agrupadas por los primeros caracteres del código de ubicación.
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
                          <span>Zona {item.name}</span>
                        </div>
                        <span className="font-medium">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">
                        La zona {locationData.raw[0]?.name} contiene la mayor cantidad de inventario con{" "}
                        {locationData.raw[0]?.value.toLocaleString()} unidades.
                      </span>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
