import { useState } from 'react'
import * as categoryService from '@/services/category.service'

// Fica separado de `useCategories` de propósito: aquele hook é o acesso
// somente-leitura usado por telas que só precisam resolver uma categoria
// (Histórico, Dashboard, Análises, formulário de lançamento). Esta tela é a
// única que cria/edita/exclui categorias, então mantém sua própria cópia
// local da lista — exatamente o comportamento de antes da refatoração.
export function useCategoryManager() {
  const [categories, setCategories] = useState(() => categoryService.getCategories())

  const createCategory = (data) => {
    const created = categoryService.createCategory(data)
    setCategories((prev) => [...prev, created])
  }

  const editCategory = (id, patch) => {
    const updated = categoryService.updateCategory(id, patch)
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)))
  }

  const removeCategory = (id) => {
    categoryService.deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return { categories, createCategory, editCategory, removeCategory }
}
