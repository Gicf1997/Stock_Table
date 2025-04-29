"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, UploadCloud } from "lucide-react"
import JsonTable from "@/components/json-table"
import Dashboard from "@/components/dashboard"
import ThemeToggle from "@/components/theme-toggle"

export default function Home() {
  const [jsonInput, setJsonInput] = useState("")
  const [parsedData, setParsedData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("input")

  const handleJsonParse = () => {
    setIsLoading(true)
    setError(null)

    try {
      // Primero intentamos analizar el JSON tal como está
      let jsonData = JSON.parse(jsonInput)

      // Si el JSON tiene una propiedad jsonMessage que es un string, intentamos analizarla también
      if (jsonData.jsonMessage && typeof jsonData.jsonMessage === "string") {
        jsonData = JSON.parse(jsonData.jsonMessage)
      }

      // Buscamos el array FOTOSTOCK dentro del objeto FOTOSTOCK
      let tableData = []
      if (jsonData.FOTOSTOCK && Array.isArray(jsonData.FOTOSTOCK.FOTOSTOCK)) {
        tableData = jsonData.FOTOSTOCK.FOTOSTOCK
      } else if (Array.isArray(jsonData)) {
        tableData = jsonData
      } else {
        // Si no encontramos un array, intentamos convertir el objeto en un array
        tableData = [jsonData]
      }

      setParsedData(tableData)

      // Si hay datos, cambiamos automáticamente a la pestaña de tabla
      if (tableData.length > 0) {
        setActiveTab("table")
      }
    } catch (err) {
      setError("Error al analizar el JSON. Asegúrate de que el formato sea válido.")
      console.error(err)
      setParsedData([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearData = () => {
    setJsonInput("")
    setParsedData([])
    setError(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        setJsonInput(content)
      } catch (err) {
        setError("Error al leer el archivo")
      }
    }
    reader.readAsText(file)
  }

  const handleDemoData = () => {
    const demoJson = `{
    "jsonMessage": "{\\\"FOTOSTOCK\\\":{\\\"TransmitLogKey\\\":\\\"0000008008\\\",\\\"AddDate\\\":\\\"04/29/2025 11:04:35\\\",\\\"FOTOSTOCK\\\":[{\\\"AGING_DIAS\\\":4,\\\"PACKUOM3\\\":\\\"EA\\\",\\\"NETWGT_DISPO\\\":543.996,\\\"STORERKEY\\\":\\\"WINES\\\",\\\"STATUS\\\":\\\"OK\\\",\\\"LOTTABLE01\\\":\\\"\\\",\\\"ALTSKU\\\":5000196002807,\\\"LOTTABLE02\\\":\\\"L2352CE003\\\",\\\"QTY_DISPO\\\":324,\\\"QTY\\\":324,\\\"ID\\\":\\\"WIDM001197\\\",\\\"LOC\\\":\\\"C752020\\\",\\\"LOTTABLE05\\\":\\\"12/31/2040 00:00:00\\\",\\\"QTYALLOCATED\\\":0,\\\"LOTTABLE06\\\":\\\"\\\",\\\"AGING\\\":0.010951,\\\"LOTTABLE03\\\":\\\"\\\",\\\"NETWGT\\\":543.996,\\\"QTYPICKED\\\":0,\\\"LOTTABLE04\\\":\\\"\\\",\\\"NETWGT_ALLOCATED\\\":0,\\\"LOTTABLE09\\\":\\\"\\\",\\\"WHSEID\\\":\\\"wmwhse3\\\",\\\"LOTTABLE07\\\":\\\"\\\",\\\"LOTTABLE08\\\":\\\"WHISKY\\\",\\\"LOT\\\":\\\"0000002713\\\",\\\"ADDDATE\\\":\\\"04/25/2025 18:14:14\\\",\\\"LOTTABLE12\\\":\\\"\\\",\\\"PACKKEY\\\":\\\"WI-1-12-432\\\",\\\"LOTTABLE10\\\":\\\"\\\",\\\"LOTTABLE11\\\":\\\"\\\",\\\"SKU\\\":10153,\\\"VALOR\\\":0,\\\"DESCR\\\":\\\"BUCHANANS 12 AÑOS S/E 12X1LTR\\\"},{\\\"AGING_DIAS\\\":47,\\\"PACKUOM3\\\":\\\"EA\\\",\\\"NETWGT_DISPO\\\":423.108,\\\"STORERKEY\\\":\\\"WINES\\\",\\\"STATUS\\\":\\\"HOLD\\\",\\\"LOTTABLE01\\\":\\\"\\\",\\\"ALTSKU\\\":5000196002807,\\\"LOTTABLE02\\\":\\\"LOT123\\\",\\\"QTY_DISPO\\\":252,\\\"QTY\\\":252,\\\"ID\\\":\\\"WIDOM000356\\\",\\\"LOC\\\":\\\"C751610\\\",\\\"LOTTABLE05\\\":\\\"07/25/2025 00:00:00\\\",\\\"QTYALLOCATED\\\":0,\\\"LOTTABLE06\\\":\\\"\\\",\\\"AGING\\\":0.128678,\\\"LOTTABLE03\\\":\\\"\\\",\\\"NETWGT\\\":423.108,\\\"QTYPICKED\\\":0,\\\"LOTTABLE04\\\":\\\"\\\",\\\"NETWGT_ALLOCATED\\\":0,\\\"LOTTABLE09\\\":\\\"\\\",\\\"WHSEID\\\":\\\"wmwhse3\\\",\\\"LOTTABLE07\\\":\\\"\\\",\\\"LOTTABLE08\\\":\\\"WHISKY\\\",\\\"LOT\\\":\\\"0000001908\\\",\\\"ADDDATE\\\":\\\"03/13/2025 20:24:25\\\",\\\"LOTTABLE12\\\":\\\"\\\",\\\"PACKKEY\\\":\\\"WI-1-12-432\\\",\\\"LOTTABLE10\\\":\\\"\\\",\\\"LOTTABLE11\\\":\\\"\\\",\\\"SKU\\\":10153,\\\"VALOR\\\":0,\\\"DESCR\\\":\\\"BUCHANANS 12 AÑOS S/E 12X1LTR\\\"},{\\\"AGING_DIAS\\\":4,\\\"PACKUOM3\\\":\\\"EA\\\",\\\"NETWGT_DISPO\\\":543.996,\\\"STORERKEY\\\":\\\"WINES\\\",\\\"STATUS\\\":\\\"OK\\\",\\\"LOTTABLE01\\\":\\\"\\\",\\\"ALTSKU\\\":5000196002807,\\\"LOTTABLE02\\\":\\\"L2352CE003\\\",\\\"QTY_DISPO\\\":324,\\\"QTY\\\":324,\\\"ID\\\":\\\"WIDM001197\\\",\\\"LOC\\\":\\\"C752020\\\",\\\"LOTTABLE05\\\":\\\"12/31/2040 00:00:00\\\",\\\"QTYALLOCATED\\\":0,\\\"LOTTABLE06\\\":\\\"\\\",\\\"AGING\\\":0.010951,\\\"LOTTABLE03\\\":\\\"\\\",\\\"NETWGT\\\":543.996,\\\"QTYPICKED\\\":0,\\\"LOTTABLE04\\\":\\\"\\\",\\\"NETWGT_ALLOCATED\\\":0,\\\"LOTTABLE09\\\":\\\"\\\",\\\"WHSEID\\\":\\\"wmwhse3\\\",\\\"LOTTABLE07\\\":\\\"\\\",\\\"LOTTABLE08\\\":\\\"VODKA\\\",\\\"LOT\\\":\\\"0000002713\\\",\\\"ADDDATE\\\":\\\"04/25/2025 18:14:14\\\",\\\"LOTTABLE12\\\":\\\"\\\",\\\"PACKKEY\\\":\\\"WITR-1-12-432\\\",\\\"LOTTABLE10\\\":\\\"\\\",\\\"LOTTABLE11\\\":\\\"\\\",\\\"SKU\\\":10153,\\\"VALOR\\\":\\\"\\\",\\\"DESCR\\\":\\\"BUCHANANS 12 AÑOS S/E 12X1LTR\\\"},{\\\"AGING_DIAS\\\":47,\\\"PACKUOM3\\\":\\\"EA\\\",\\\"NETWGT_DISPO\\\":423.108,\\\"STORERKEY\\\":\\\"WINES\\\",\\\"STATUS\\\":\\\"HOLD\\\",\\\"LOTTABLE01\\\":\\\"\\\",\\\"ALTSKU\\\":5000196002807,\\\"LOTTABLE02\\\":\\\"LOT123\\\",\\\"QTY_DISPO\\\":252,\\\"QTY\\\":252,\\\"ID\\\":\\\"WIDOM000356\\\",\\\"LOC\\\":\\\"C751610\\\",\\\"LOTTABLE05\\\":\\\"07/25/2025 00:00:00\\\",\\\"QTYALLOCATED\\\":0,\\\"LOTTABLE06\\\":\\\"\\\",\\\"AGING\\\":0.128678,\\\"LOTTABLE03\\\":\\\"\\\",\\\"NETWGT\\\":423.108,\\\"QTYPICKED\\\":0,\\\"LOTTABLE04\\\":\\\"\\\",\\\"NETWGT_ALLOCATED\\\":0,\\\"LOTTABLE09\\\":\\\"\\\",\\\"WHSEID\\\":\\\"wmwhse3\\\",\\\"LOTTABLE07\\\":\\\"\\\",\\\"LOTTABLE08\\\":\\\"RON\\\",\\\"LOT\\\":\\\"0000001908\\\",\\\"ADDDATE\\\":\\\"03/13/2025 20:24:25\\\",\\\"LOTTABLE12\\\":\\\"\\\",\\\"PACKKEY\\\":\\\"WITR-1-12-432\\\",\\\"LOTTABLE10\\\":\\\"\\\",\\\"LOTTABLE11\\\":\\\"\\\",\\\"SKU\\\":10153,\\\"VALOR\\\":\\\"\\\",\\\"DESCR\\\":\\\"BUCHANANS 12 AÑOS S/E 12X1LTR\\\"}],\\\"SerialKey\\\":7452}}"
}`
    setJsonInput(demoJson)
  }

  return (
    <main className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Visualizador de Inventario</h1>
        <ThemeToggle />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">Entrada de Datos</TabsTrigger>
          <TabsTrigger value="table" disabled={parsedData.length === 0}>
            Tabla
          </TabsTrigger>
          <TabsTrigger value="dashboard" disabled={parsedData.length === 0}>
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entrada JSON</CardTitle>
              <CardDescription>
                Pega tu JSON en el área de texto o carga un archivo para visualizar los datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" onClick={handleDemoData} className="w-full sm:w-auto">
                  Cargar Datos Demo
                </Button>
                <div className="relative w-full sm:w-auto">
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".json"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <UploadCloud className="h-4 w-4" />
                    <span>Cargar Archivo</span>
                  </Button>
                </div>
              </div>
              <Textarea
                placeholder="Pega tu JSON aquí..."
                className="min-h-[300px] font-mono text-sm"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleClearData}>
                Limpiar
              </Button>
              <Button onClick={handleJsonParse} disabled={isLoading || !jsonInput}>
                {isLoading ? "Procesando..." : "Visualizar"}
              </Button>
            </CardFooter>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="table">
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Datos Visualizados</CardTitle>
                <CardDescription>Se encontraron {parsedData.length} registros</CardDescription>
              </CardHeader>
              <CardContent>
                <JsonTable data={parsedData} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dashboard">{parsedData.length > 0 && <Dashboard data={parsedData} />}</TabsContent>
      </Tabs>
    </main>
  )
}
