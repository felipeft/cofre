import { useCategoriesContext } from '@/contexts/CategoriesContext'

// Porta de entrada única para o Context de categorias — o resto do app não
// sabe (nem precisa saber) que por trás existe um Context. Toda tela usa
// este mesmo hook, inclusive a de gerenciamento (páginas/Categories.jsx):
// como CRUD de categoria agora precisa refletir em todo o app na hora, não
// faz mais sentido aquela tela ter uma cópia local separada.
export function useCategories() {
  return useCategoriesContext()
}
