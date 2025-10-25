"use client"

import * as React from "react"
import { List } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface ComboboxOption {
  value: string
  label: string
  type: string
  color: string
  name: string
  icon?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

// Componente para renderizar itens virtualizados
const VirtualizedListItem = React.memo<{
  index: number
  style: React.CSSProperties
  data: ComboboxOption[]
  onSelect: (value: string) => void
  searchTerm: string
}>(({ index, style, data, onSelect, searchTerm }) => {
  const option = data[index]

  // Highlight do texto buscado
  const highlightText = (text: string) => {
    if (!searchTerm) return text

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ?
        <mark key={i} className="bg-primary/20 px-0.5 rounded">{part}</mark> :
        part
    )
  }

  return (
    <div style={style}>
      <CommandItem
        value={option.value}
        onSelect={() => onSelect(option.value)}
        className="cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full border-2 border-background flex-shrink-0"
            style={{ backgroundColor: option.color }}
          />
          {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
          <span className="flex-1">{highlightText(option.label)}</span>
        </div>
      </CommandItem>
    </div>
  )
})

VirtualizedListItem.displayName = "VirtualizedListItem"

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhuma opção encontrada.",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filtrar opções baseado no searchTerm
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options

    const lowerSearchTerm = searchTerm.toLowerCase()
    return options.filter(option =>
      option.label.toLowerCase().includes(lowerSearchTerm) ||
      option.name.toLowerCase().includes(lowerSearchTerm)
    )
  }, [options, searchTerm])

  // Focar no input quando abrir
  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Limpar busca quando selecionar
  const handleSelect = React.useCallback((selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearchTerm("")
  }, [onValueChange])

  // Encontrar a opção selecionada
  const selectedOption = React.useMemo(() => {
    return options.find(option => option.value === value)
  }, [options, value])

  // Renderizar item selecionado
  const renderSelectedItem = React.useMemo(() => {
    if (!selectedOption) {
      return (
        <span className="text-muted-foreground flex-1 truncate">{placeholder}</span>
      )
    }

    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-3 h-3 rounded-full border-2 border-background flex-shrink-0"
          style={{ backgroundColor: selectedOption.color }}
        />
        {selectedOption.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
        <span className="flex-1 truncate">{selectedOption.label}</span>
      </div>
    )
  }, [selectedOption, placeholder])

  return (
    <div className={cn("w-full", className)}>
      {/* Dropdown flutuante */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute left-0 right-0 mx-auto max-w-md bg-popover border rounded-lg shadow-lg mt-1"
               style={{ top: `${(window.innerHeight - 300) / 2}px` }}
               onClick={(e) => e.stopPropagation()}>
            <div className="p-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring mb-2"
              />

              {filteredOptions.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {filteredOptions.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => handleSelect(option.value)}
                      className="flex items-center gap-2 px-2 py-2 text-sm cursor-pointer hover:bg-accent rounded-md"
                    >
                      <div
                        className="w-3 h-3 rounded-full border-2 border-background flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                      {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                      <span className="flex-1">{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trigger */}
      <div
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer overflow-hidden",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setOpen(true)}
      >
        {renderSelectedItem}
        <div className="flex items-center gap-2">
          <div className="opacity-50">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M4.646 6.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}