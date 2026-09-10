import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as categoryService from '@/services/category.service'

const CategoriesContext = createContext(null)

// Antes da integração com a API, a tela de Categorias mantinha sua própria
// cópia local da lista, porque não fazia diferença — os dados eram mock e
// nada mais lia aquele estado. Agora que criar/editar/excluir uma categoria
// é uma escrita real no banco, o restante do app (formulário de lançamento,
// filtro do Histórico) precisa saber na hora — daí virar Context: uma única
// lista, uma única fonte de verdade, qualquer mutação por aqui já reflete
// em todo mundo que a consome.
export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // A tela de gestão precisa refletir o banco, inclusive categorias
      // inativas legadas. Formulários de lançamento filtram as ativas.
      const data = await categoryService.getCategories({ includeInactive: true })
      setCategories(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const createCategory = useCallback(async (payload) => {
    const created = await categoryService.createCategory(payload)
    setCategories((prev) => [...prev, created])
    return created
  }, [])

  const editCategory = useCallback(async (id, patch) => {
    const updated = await categoryService.updateCategory(id, patch)
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }, [])

  const removeCategory = useCallback(async (id) => {
    const result = await categoryService.deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    return result
  }, [])

  const getCategoryById = useCallback((id) => categoryService.getCategoryById(id, categories), [categories])

  const value = useMemo(
    () => ({ categories, loading, error, refresh, createCategory, editCategory, removeCategory, getCategoryById }),
    [categories, loading, error, refresh, createCategory, editCategory, removeCategory, getCategoryById]
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

export function useCategoriesContext() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategoriesContext must be used within CategoriesProvider')
  return ctx
}
