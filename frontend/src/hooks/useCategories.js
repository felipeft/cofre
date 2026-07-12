import { useMemo } from 'react'
import * as categoryService from '@/services/category.service'

// Uso geral (formulário de lançamento, histórico, dashboard, análises):
// só precisam ler a lista e resolver uma categoria por id — não precisam de
// estado global compartilhado. A tela de Categorias (pages/Categories.jsx)
// é a exceção: ela gerencia sua própria lista local porque é a única tela
// que cria/edita/exclui categorias, e isso já era assim antes da refatoração
// (edições lá nunca refletiam em outras telas, então manter esse
// comportamento aqui evita qualquer mudança visível de comportamento).
export function useCategories() {
  const categories = useMemo(() => categoryService.getCategories(), [])

  const getCategoryById = (id) => categoryService.getCategoryById(id, categories)

  return { categories, getCategoryById }
}
