"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  SlidersHorizontal,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  FileSpreadsheet,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { format, isValid } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from "xlsx"

interface JsonTableProps {
  data: any[]
}

interface FilterConfig {
  column: string
  value: string
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "greaterThan" | "lessThan"
}

export default function JsonTable({ data }: JsonTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterConfig>({ column: "", value: "", operator: "contains" })

  // Extraer todas las columnas únicas de los datos
  const allColumns = useMemo(() => {
    const columns = new Set<string>()
    data.forEach((item) => {
      Object.keys(item).forEach((key) => columns.add(key))
    })
    return Array.from(columns)
  }, [data])

  // Inicializar columnas visibles si aún no se han establecido
  useMemo(() => {
    if (visibleColumns.length === 0 && allColumns.length > 0) {
      // Orden específico de columnas
      const orderedColumns = [
        "STORERKEY",
        "SKU",
        "ALTSKU",
        "DESCR",
        "PACKKEY",
        "LOC",
        "ID",
        "QTY",
        "QTY_DISPO",
        "QTYALLOCATED",
        "QTYPICKED",
        "PACKUOM3",
        "NETWGT_DISPO",
        "STATUS",
        "LOTTABLE01",
        "LOTTABLE02",
        "LOTTABLE03",
        "LOTTABLE04",
        "LOTTABLE05",
        "LOTTABLE06",
        "LOTTABLE07",
        "LOTTABLE08",
        "LOTTABLE09",
        "LOTTABLE10",
        "LOTTABLE11",
        "LOTTABLE12",
        "AGING_DIAS",
        "LOT",
      ]

      // Filtrar columnas que existen en los datos
      const availableColumns = orderedColumns.filter((col) => allColumns.includes(col))

      // Si no hay columnas disponibles que coincidan con el orden especificado, mostrar todas
      setVisibleColumns(availableColumns.length > 0 ? availableColumns : allColumns)
    }
  }, [allColumns, visibleColumns])

  // Aplicar filtros a los datos
  const applyFilters = (item: any, filters: FilterConfig[]) => {
    return filters.every((filter) => {
      const value = item[filter.column]
      const filterValue = filter.value.toLowerCase()

      if (value === undefined || value === null) return false

      const stringValue = String(value).toLowerCase()

      switch (filter.operator) {
        case "contains":
          return stringValue.includes(filterValue)
        case "equals":
          return stringValue === filterValue
        case "startsWith":
          return stringValue.startsWith(filterValue)
        case "endsWith":
          return stringValue.endsWith(filterValue)
        case "greaterThan":
          return !isNaN(Number(value)) && !isNaN(Number(filterValue))
            ? Number(value) > Number(filterValue)
            : stringValue > filterValue
        case "lessThan":
          return !isNaN(Number(value)) && !isNaN(Number(filterValue))
            ? Number(value) < Number(filterValue)
            : stringValue < filterValue
        default:
          return true
      }
    })
  }

  // Filtrar datos basados en el término de búsqueda y filtros
  const filteredData = useMemo(() => {
    let result = data

    // Aplicar filtros específicos
    if (filters.length > 0) {
      result = result.filter((item) => applyFilters(item, filters))
    }

    // Aplicar búsqueda global
    if (searchTerm) {
      result = result.filter((item) => {
        return Object.values(item).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
      })
    }

    return result
  }, [data, searchTerm, filters])

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] === undefined) return 1
      if (b[sortConfig.key] === undefined) return -1

      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      // Intentar convertir a números si es posible
      const aNum = Number(aValue)
      const bNum = Number(bValue)

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum
      }

      // Intentar convertir a fechas si es posible
      try {
        if (typeof aValue === "string" && typeof bValue === "string") {
          const aDate = new Date(aValue)
          const bDate = new Date(bValue)

          if (isValid(aDate) && isValid(bDate)) {
            return sortConfig.direction === "asc"
              ? aDate.getTime() - bDate.getTime()
              : bDate.getTime() - aDate.getTime()
          }
        }
      } catch (e) {
        // Si no se puede convertir a fecha, continuar con la comparación de strings
      }

      // Comparación de strings por defecto
      const aString = String(aValue).toLowerCase()
      const bString = String(bValue).toLowerCase()

      if (aString < bString) return sortConfig.direction === "asc" ? -1 : 1
      if (aString > bString) return sortConfig.direction === "asc" ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  // Paginación
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / pageSize)
  }, [sortedData, pageSize])

  // Manejar clic en encabezado para ordenar
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }

  // Exportar datos a CSV
  const exportToCSV = () => {
    // Crear encabezados CSV
    const headers = visibleColumns.join(",")

    // Crear filas CSV
    const rows = sortedData
      .map((item) => {
        return visibleColumns
          .map((column) => {
            // Manejar valores que podrían contener comas
            const value = item[column] !== undefined ? String(item[column]) : ""
            return value.includes(",") ? `"${value}"` : value
          })
          .join(",")
      })
      .join("\n")

    // Crear y descargar el archivo
    const csv = headers + "\n" + rows
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "datos_exportados.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Exportar datos a Excel
  const exportToExcel = () => {
    // Preparar los datos para Excel (solo columnas visibles)
    const dataToExport = sortedData.map((item) => {
      const newItem: Record<string, any> = {}
      visibleColumns.forEach((col) => {
        newItem[col] = item[col]
      })
      return newItem
    })

    // Crear una hoja de cálculo
    const worksheet = XLSX.utils.json_to_sheet(dataToExport)

    // Crear un libro de trabajo y añadir la hoja
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos")

    // Guardar el archivo
    XLSX.writeFile(workbook, "datos_inventario.xlsx")
  }

  // Añadir filtro
  const addFilter = () => {
    if (activeFilter.column && activeFilter.value) {
      setFilters([...filters, { ...activeFilter }])
      setActiveFilter({ column: "", value: "", operator: "contains" })
    }
  }

  // Eliminar filtro
  const removeFilter = (index: number) => {
    const newFilters = [...filters]
    newFilters.splice(index, 1)
    setFilters(newFilters)
  }

  // Renderizar valor de celda
  const renderCellValue = (value: any, column: string) => {
    if (value === null || value === undefined) return "-"

    // Formatear fechas
    if ((typeof value === "string" && column.includes("DATE")) || column.includes("LOTTABLE05")) {
      try {
        const date = new Date(value)
        if (isValid(date)) {
          return format(date, "dd/MM/yyyy", { locale: es })
        }
      } catch (e) {
        // Si no se puede formatear como fecha, mostrar el valor original
      }
    }

    // Formatear números
    if (typeof value === "number" || (!isNaN(Number(value)) && typeof value === "string" && !value.startsWith("0"))) {
      const num = Number(value)
      if (!isNaN(num)) {
        // Si es un número entero o tiene decimales
        return num % 1 === 0 ? num.toString() : num.toFixed(2)
      }
    }

    // Para objetos, convertir a JSON
    if (typeof value === "object") return JSON.stringify(value)

    // Valor por defecto
    return String(value)
  }

  // Determinar el tipo de columna para filtros
  const getColumnType = (column: string) => {
    // Verificar si la columna contiene datos numéricos
    const hasNumericValues = data.some((item) => {
      const value = item[column]
      return typeof value === "number" || (!isNaN(Number(value)) && typeof value === "string")
    })

    // Verificar si la columna contiene fechas
    const hasDateValues = data.some((item) => {
      const value = item[column]
      if (typeof value !== "string") return false
      try {
        const date = new Date(value)
        return isValid(date)
      } catch (e) {
        return false
      }
    })

    if (column.includes("DATE") || column.includes("LOTTABLE05")) return "date"
    if (hasNumericValues) return "number"
    if (hasDateValues) return "date"
    return "string"
  }

  // Añadir estilos de encabezado fijo a la tabla
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en todos los campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {filters.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {filters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Filtros Avanzados</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="filter-column">Columna</Label>
                      <Select
                        value={activeFilter.column}
                        onValueChange={(value) => setActiveFilter({ ...activeFilter, column: value })}
                      >
                        <SelectTrigger id="filter-column">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {allColumns.map((column) => (
                            <SelectItem key={column} value={column}>
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="filter-operator">Operador</Label>
                      <Select
                        value={activeFilter.operator}
                        onValueChange={(value: any) => setActiveFilter({ ...activeFilter, operator: value })}
                      >
                        <SelectTrigger id="filter-operator">
                          <SelectValue placeholder="Operador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contiene</SelectItem>
                          <SelectItem value="equals">Igual a</SelectItem>
                          <SelectItem value="startsWith">Comienza con</SelectItem>
                          <SelectItem value="endsWith">Termina con</SelectItem>
                          <SelectItem value="greaterThan">Mayor que</SelectItem>
                          <SelectItem value="lessThan">Menor que</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="filter-value">Valor</Label>
                    <Input
                      id="filter-value"
                      value={activeFilter.value}
                      onChange={(e) => setActiveFilter({ ...activeFilter, value: e.target.value })}
                      placeholder="Valor a filtrar"
                    />
                  </div>
                  <Button onClick={addFilter} className="w-full" disabled={!activeFilter.column || !activeFilter.value}>
                    Añadir Filtro
                  </Button>
                </div>

                {filters.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Filtros Activos</h4>
                      <div className="flex flex-wrap gap-2">
                        {filters.map((filter, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            <span>
                              {filter.column} {getOperatorSymbol(filter.operator)} {filter.value}
                            </span>
                            <button
                              onClick={() => removeFilter(index)}
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setFilters([])} className="w-full mt-2">
                        Limpiar Todos
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Columnas</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[60vh] overflow-y-auto">
              {allColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column}
                  checked={visibleColumns.includes(column)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setVisibleColumns([...visibleColumns, column])
                    } else {
                      setVisibleColumns(visibleColumns.filter((c) => c !== column))
                    }
                  }}
                >
                  {column}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={exportToCSV} className="flex gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="outline" onClick={exportToExcel} className="flex gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-1">
                      {column}
                      {sortConfig?.key === column && <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/50">
                    {visibleColumns.map((column) => (
                      <TableCell key={`${rowIndex}-${column}`}>{renderCellValue(row[column], column)}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="h-24 text-center">
                    No se encontraron datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedData.length} de {sortedData.length} registros
          </p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="10 por página" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 por página</SelectItem>
              <SelectItem value="10">10 por página</SelectItem>
              <SelectItem value="20">20 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {currentPage} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Función auxiliar para mostrar símbolos de operadores
function getOperatorSymbol(operator: string): string {
  switch (operator) {
    case "contains":
      return "contiene"
    case "equals":
      return "="
    case "startsWith":
      return "comienza con"
    case "endsWith":
      return "termina con"
    case "greaterThan":
      return ">"
    case "lessThan":
      return "<"
    default:
      return operator
  }
}
